import type { MatchStatus } from "@/generated/prisma/enums";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  matchStatusFromScores,
  validateMatchScoresForFinish,
  winnerTeamIdFromScores,
} from "@/lib/match-result";
import {
  buildFixedSwissTemplate,
  findFixedSwissLink,
  fixedSwissNominalGridSize,
  getFixedSwissLinksForMatchCount,
  type FixedSwissLink,
} from "@/lib/fixed-swiss-grid";
import {
  incomingFixedSwissPhantomTeamSlot,
  isVoidFixedSwissCrossMatch,
} from "@/lib/fixed-swiss-cross-bye";
import { assertBracketParticipantCount } from "@/lib/bracket-participant-rules";
import { getResolvedParticipantRules } from "@/lib/bracket-formats/settings-server";
import { logger } from "@/lib/logger";
import excelRef from "@/lib/excel-bracket-64-reference.json";
import { notifyMatchStartScheduled } from "@/lib/match-start-notification";
import {
  listBusyTournamentTableIds,
  pickFreeTournamentTableId,
} from "@/lib/tournament-stream";
import { parseTournamentTableIds } from "@/lib/tournament-table-pick";
import {
  buildOlympicBracket,
  buildOlympicBracketWithBronze,
  buildSwissPairings,
  getNextMatchSlot,
  isDynamicSwissFormat,
  isExcelRef64Format,
  isFixedSwissFormat,
  isOlympicBronzeFormat,
  isOlympicFormat,
  isOlympicPairFormat,
  isSwissFormat,
  isSwissPairFormat,
  usesFixedSwissGridEngine,
  OLYMPIC_BRONZE_MATCH_SLOT,
  teamRating,
} from "@/lib/pair-tournament";

type Db = Pick<
  PrismaClient,
  "tournamentMatch" | "tournamentTeam" | "tournament" | "tournamentRegistration"
>;

async function assertParticipantCountForFormat(format: string, count: number) {
  const rules = await getResolvedParticipantRules(format);
  assertBracketParticipantCount(format, count, rules);
}

type MatchSlotRow = {
  id: string;
  round: number;
  slot: number;
  team1Id: string | null;
  team2Id: string | null;
  status: string;
  winnerTeamId: string | null;
};

function slotMapKey(round: number, slot: number) {
  return `${round}:${slot}`;
}

/** Кэш слотов на один проход processByes — меньше повторных SELECT по турниру. */
type BracketByeCache = {
  tournamentId: string;
  format: string;
  matchCount: number;
  maxRound: number;
  slotMap: Map<string, MatchSlotRow>;
  byId: Map<string, MatchSlotRow>;
};

async function assignSeeds(db: Db, tournamentId: string, seeded: { id: string }[]) {
  await db.tournamentTeam.updateMany({
    where: { tournamentId },
    data: { seed: null },
  });
  await Promise.all(
    seeded.map((team, index) =>
      db.tournamentTeam.update({
        where: { id: team.id },
        data: { seed: index + 1 },
      }),
    ),
  );
}

export interface MatchResultInput {
  matchId: string;
  winnerTeamId?: string;
  team1Score?: number | null;
  team2Score?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  tableId?: string | null;
}

function parseOptionalDate(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Некорректная дата");
  }
  return date;
}

async function maybeNotifyMatchStartScheduled(
  input: MatchResultInput,
  previousStartedAt: Date | null,
  startedAt: Date | null | undefined,
) {
  if (input.startedAt === undefined || startedAt == null) return;
  if (previousStartedAt?.getTime() === startedAt.getTime()) return;
  try {
    await notifyMatchStartScheduled(input.matchId, startedAt);
  } catch (err) {
    logger.error({ err, matchId: input.matchId }, "Match start notification failed");
  }
}

async function revokeSwissWin(db: Db, teamId: string) {
  const team = await db.tournamentTeam.findUnique({ where: { id: teamId } });
  if (!team || team.swissPoints <= 0) return;
  await db.tournamentTeam.update({
    where: { id: teamId },
    data: { swissPoints: team.swissPoints - 1 },
  });
}

async function removeTeamFromSlot(
  db: Db,
  tournamentId: string,
  round: number,
  slot: number,
  teamSlot: 1 | 2,
  teamId: string,
) {
  const target = await db.tournamentMatch.findUnique({
    where: {
      tournamentId_round_slot: { tournamentId, round, slot },
    },
  });
  if (!target) return;

  const field = teamSlot === 1 ? "team1Id" : "team2Id";
  if (target[field] !== teamId) return;

  await db.tournamentMatch.update({
    where: { id: target.id },
    data: { [field]: null },
  });
}

function collectAdvanceTargets(
  match: {
    round: number;
    slot: number;
    winnerTeamId: string;
    team1Id: string | null;
    team2Id: string | null;
  },
  format: string,
  fixedSwissMatchCount?: number,
  fixedSwissMaxRound?: number,
): { round: number; slot: number; teamSlot: 1 | 2; teamId: string }[] {
  const loserId =
    match.team1Id === match.winnerTeamId ? match.team2Id : match.team1Id;
  const targets: { round: number; slot: number; teamSlot: 1 | 2; teamId: string }[] =
    [];

  if (usesFixedSwissGridEngine(format) && fixedSwissMatchCount) {
    const links = getFixedSwissLinksForMatchCount(
      fixedSwissMatchCount,
      fixedSwissMaxRound,
    );
    const winLink = findFixedSwissLink(links, match.round, match.slot, "win");
    if (winLink) {
      targets.push({
        round: winLink.toRound,
        slot: winLink.toSlot,
        teamSlot: winLink.toTeam,
        teamId: match.winnerTeamId,
      });
    }
    if (loserId) {
      const loseLink = findFixedSwissLink(links, match.round, match.slot, "loss");
      if (loseLink) {
        targets.push({
          round: loseLink.toRound,
          slot: loseLink.toSlot,
          teamSlot: loseLink.toTeam,
          teamId: loserId,
        });
      }
    }
    return targets;
  }

  if (isOlympicFormat(format)) {
    const next = getNextMatchSlot(match.round, match.slot);
    targets.push({
      round: next.round,
      slot: next.slot,
      teamSlot: next.teamSlot,
      teamId: match.winnerTeamId,
    });
  }

  return targets;
}

export async function cancelMatchResult(db: Db, matchId: string) {
  const match = await db.tournamentMatch.findUnique({
    where: { id: matchId },
    include: { tournament: true },
  });
  if (!match) throw new Error("Матч не найден");
  if (!match.winnerTeamId) {
    throw new Error("Встреча ещё не завершена — нечего отменять");
  }

  const format = match.tournament.format;
  const allMatches = await db.tournamentMatch.findMany({
    where: { tournamentId: match.tournamentId },
    orderBy: [{ round: "asc" }, { slot: "asc" }],
  });

  const maxRound = Math.max(...allMatches.map((m) => m.round), 0);
  if (isDynamicSwissFormat(format) && match.round < maxRound) {
    throw new Error(
      `Отмена возможна только в последнем туре (${maxRound}). Следующие туры уже сформированы.`,
    );
  }

  const winnerId = match.winnerTeamId;
  const loserId =
    match.team1Id === winnerId ? match.team2Id : match.team1Id;
  const affectedIds = [winnerId, loserId].filter(Boolean) as string[];

  for (const later of allMatches) {
    if (later.round <= match.round) continue;
    const involves = affectedIds.some(
      (id) => later.team1Id === id || later.team2Id === id,
    );
    if (involves && later.winnerTeamId) {
      throw new Error(
        `Нельзя отменить: участник уже сыграл встречу тура ${later.round} (слот ${later.slot}). Сначала отмените её результат.`,
      );
    }
  }

  const fixedSwissMatchCount = usesFixedSwissGridEngine(format)
    ? allMatches.length
    : undefined;
  const fixedSwissMaxRound = usesFixedSwissGridEngine(format)
    ? Math.max(...allMatches.map((m) => m.round), 0)
    : undefined;
  const targets = collectAdvanceTargets(
    {
      round: match.round,
      slot: match.slot,
      winnerTeamId: winnerId,
      team1Id: match.team1Id,
      team2Id: match.team2Id,
    },
    format,
    fixedSwissMatchCount,
    fixedSwissMaxRound,
  );

  for (const target of targets) {
    await removeTeamFromSlot(
      db,
      match.tournamentId,
      target.round,
      target.slot,
      target.teamSlot,
      target.teamId,
    );
  }

  if (isSwissFormat(format)) {
    await revokeSwissWin(db, winnerId);
  }

  await db.tournamentMatch.update({
    where: { id: matchId },
    data: {
      winnerTeamId: null,
      status: "SCHEDULED",
      team1Score: null,
      team2Score: null,
      finishedAt: null,
    },
  });

  if (
    isOlympicFormat(format) &&
    match.tournament.status === "FINISHED" &&
    match.round === maxRound
  ) {
    await db.tournament.update({
      where: { id: match.tournamentId },
      data: { status: "ACTIVE" },
    });
  }

  return db.tournamentMatch.findUnique({
    where: { id: matchId },
    include: {
      team1: { include: { player1: true, player2: true } },
      team2: { include: { player1: true, player2: true } },
      winnerTeam: { include: { player1: true, player2: true } },
    },
  });
}

async function awardSwissWin(db: Db, teamId: string) {
  await db.tournamentTeam.update({
    where: { id: teamId },
    data: { swissPoints: { increment: 1 } },
  });
}

async function assignTeamToSlot(
  db: Db,
  tournamentId: string,
  round: number,
  slot: number,
  teamSlot: 1 | 2,
  teamId: string,
  slotMap?: Map<string, MatchSlotRow>,
) {
  const cached = slotMap?.get(slotMapKey(round, slot));
  const target =
    cached ??
    (await db.tournamentMatch.findUnique({
      where: {
        tournamentId_round_slot: { tournamentId, round, slot },
      },
    }));
  if (!target) return;

  const data =
    teamSlot === 1
      ? { team1Id: target.team1Id ?? teamId }
      : { team2Id: target.team2Id ?? teamId };

  if (
    (teamSlot === 1 && target.team1Id && target.team1Id !== teamId) ||
    (teamSlot === 2 && target.team2Id && target.team2Id !== teamId)
  ) {
    throw new Error(
      `Слот уже занят (тур ${round}, слот ${slot}, позиция ${teamSlot})`,
    );
  }

  await db.tournamentMatch.update({
    where: { id: target.id },
    data,
  });

  if (cached) {
    if (teamSlot === 1) cached.team1Id = cached.team1Id ?? teamId;
    else cached.team2Id = cached.team2Id ?? teamId;
  }
}

async function forceAssignTeamToSlot(
  db: Db,
  tournamentId: string,
  round: number,
  slot: number,
  teamSlot: 1 | 2,
  teamId: string,
) {
  const target = await db.tournamentMatch.findUnique({
    where: {
      tournamentId_round_slot: { tournamentId, round, slot },
    },
  });
  if (!target) return;

  const field = teamSlot === 1 ? "team1Id" : "team2Id";
  await db.tournamentMatch.update({
    where: { id: target.id },
    data: { [field]: teamId },
  });
}

/** Пересчитать расстановку по завершённым встречам (исправляет устаревшие links). */
export async function replayFixedSwissAdvances(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament || !usesFixedSwissGridEngine(tournament.format)) return;

  const allMatches = await db.tournamentMatch.findMany({
    where: { tournamentId },
    orderBy: [{ round: "asc" }, { slot: "asc" }],
  });
  const matchCount = allMatches.length;
  const maxRound = Math.max(...allMatches.map((m) => m.round), 0);
  const links = getFixedSwissLinksForMatchCount(matchCount, maxRound);

  await db.tournamentMatch.updateMany({
    where: { tournamentId, round: { gte: 2 } },
    data: { team1Id: null, team2Id: null },
  });

  for (const m of allMatches) {
    if (!m.winnerTeamId) continue;

    const winLink = findFixedSwissLink(links, m.round, m.slot, "win");
    if (winLink) {
      await forceAssignTeamToSlot(
        db,
        tournamentId,
        winLink.toRound,
        winLink.toSlot,
        winLink.toTeam,
        m.winnerTeamId,
      );
    }

    const loserId =
      m.team1Id === m.winnerTeamId ? m.team2Id : m.team1Id;
    if (loserId) {
      const loseLink = findFixedSwissLink(links, m.round, m.slot, "loss");
      if (loseLink) {
        await forceAssignTeamToSlot(
          db,
          tournamentId,
          loseLink.toRound,
          loseLink.toSlot,
          loseLink.toTeam,
          loserId,
        );
      }
    }
  }

  await processByes(db, tournamentId, tournament.format);
}

async function advanceFixedSwissResult(
  db: Db,
  match: {
    id: string;
    round: number;
    slot: number;
    tournamentId: string;
    team1Id: string | null;
    team2Id: string | null;
  },
  winnerTeamId: string,
  matchCount: number,
  maxRound: number,
  matchStatus: MatchStatus = "FINISHED",
  slotMap?: Map<string, MatchSlotRow>,
) {
  const loserId =
    match.team1Id === winnerTeamId ? match.team2Id : match.team1Id;
  const links = getFixedSwissLinksForMatchCount(matchCount, maxRound);

  await db.tournamentMatch.update({
    where: { id: match.id },
    data: { winnerTeamId, status: matchStatus },
  });
  const cached = slotMap?.get(slotMapKey(match.round, match.slot));
  if (cached) {
    cached.winnerTeamId = winnerTeamId;
    cached.status = matchStatus;
  }
  await awardSwissWin(db, winnerTeamId);

  const winLink = findFixedSwissLink(links, match.round, match.slot, "win");
  if (winLink) {
    await assignTeamToSlot(
      db,
      match.tournamentId,
      winLink.toRound,
      winLink.toSlot,
      winLink.toTeam,
      winnerTeamId,
      slotMap,
    );
  }

  if (loserId) {
    const loseLink = findFixedSwissLink(links, match.round, match.slot, "loss");
    if (loseLink) {
      await assignTeamToSlot(
        db,
        match.tournamentId,
        loseLink.toRound,
        loseLink.toSlot,
        loseLink.toTeam,
        loserId,
        slotMap,
      );
    }
  }
}

export async function advanceWinner(
  db: Db,
  matchId: string,
  winnerTeamId: string,
  matchStatus: MatchStatus = "FINISHED",
  byeCache?: BracketByeCache,
) {
  const cachedRow = byeCache?.byId.get(matchId);

  const match = cachedRow
    ? {
        id: cachedRow.id,
        round: cachedRow.round,
        slot: cachedRow.slot,
        tournamentId: byeCache!.tournamentId,
        team1Id: cachedRow.team1Id,
        team2Id: cachedRow.team2Id,
        winnerTeamId: cachedRow.winnerTeamId,
        tournament: { format: byeCache!.format },
      }
    : await db.tournamentMatch.findUnique({
        where: { id: matchId },
        include: { tournament: true },
      });

  if (!match) throw new Error("Матч не найден");

  if (match.winnerTeamId) {
    throw new Error("Победитель уже определён");
  }

  if (match.team1Id !== winnerTeamId && match.team2Id !== winnerTeamId) {
    throw new Error("Команда не участвует в этом матче");
  }

  const tournamentId = cachedRow
    ? byeCache!.tournamentId
    : (match as { tournamentId: string }).tournamentId;

  if (usesFixedSwissGridEngine(match.tournament.format)) {
    const matchCount = byeCache?.matchCount;
    const maxRound = byeCache?.maxRound;
    if (matchCount === undefined || maxRound === undefined) {
      const allMatches = await db.tournamentMatch.findMany({
        where: { tournamentId },
        select: { round: true },
      });
      await advanceFixedSwissResult(
        db,
        {
          id: match.id,
          round: match.round,
          slot: match.slot,
          tournamentId,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
        },
        winnerTeamId,
        allMatches.length,
        Math.max(0, ...allMatches.map((m) => m.round)),
        matchStatus,
        byeCache?.slotMap,
      );
    } else {
      await advanceFixedSwissResult(
        db,
        {
          id: match.id,
          round: match.round,
          slot: match.slot,
          tournamentId,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
        },
        winnerTeamId,
        matchCount,
        maxRound,
        matchStatus,
        byeCache?.slotMap,
      );
    }
    return;
  }

  await db.tournamentMatch.update({
    where: { id: matchId },
    data: {
      winnerTeamId,
      status: matchStatus,
    },
  });
  if (cachedRow) {
    cachedRow.winnerTeamId = winnerTeamId;
    cachedRow.status = matchStatus;
  }

  if (isDynamicSwissFormat(match.tournament.format)) {
    await awardSwissWin(db, winnerTeamId);
    return;
  }

  const next = getNextMatchSlot(match.round, match.slot);
  const nextCached = byeCache?.slotMap.get(slotMapKey(next.round, next.slot));
  if (nextCached) {
    const data =
      next.teamSlot === 1
        ? { team1Id: nextCached.team1Id ?? winnerTeamId }
        : { team2Id: nextCached.team2Id ?? winnerTeamId };
    await db.tournamentMatch.update({
      where: { id: nextCached.id },
      data,
    });
    if (next.teamSlot === 1) nextCached.team1Id = nextCached.team1Id ?? winnerTeamId;
    else nextCached.team2Id = nextCached.team2Id ?? winnerTeamId;
    await routeOlympicSemiLoserToBronze(
      db,
      tournamentId,
      match.tournament.format,
      match.round,
      match.slot,
      winnerTeamId,
      match.team1Id,
      match.team2Id,
      byeCache,
    );
    return;
  }

  const nextMatch = await db.tournamentMatch.findUnique({
    where: {
      tournamentId_round_slot: {
        tournamentId,
        round: next.round,
        slot: next.slot,
      },
    },
  });

  if (!nextMatch) {
    await routeOlympicSemiLoserToBronze(
      db,
      tournamentId,
      match.tournament.format,
      match.round,
      match.slot,
      winnerTeamId,
      match.team1Id,
      match.team2Id,
      byeCache,
    );
    return;
  }

  await db.tournamentMatch.update({
    where: { id: nextMatch.id },
    data: next.teamSlot === 1 ? { team1Id: winnerTeamId } : { team2Id: winnerTeamId },
  });

  await routeOlympicSemiLoserToBronze(
    db,
    tournamentId,
    match.tournament.format,
    match.round,
    match.slot,
    winnerTeamId,
    match.team1Id,
    match.team2Id,
    byeCache,
  );
}

async function routeOlympicSemiLoserToBronze(
  db: Db,
  tournamentId: string,
  format: string,
  semiRound: number,
  semiSlot: number,
  winnerTeamId: string,
  team1Id: string | null,
  team2Id: string | null,
  byeCache?: BracketByeCache,
) {
  if (!isOlympicBronzeFormat(format)) return;

  const loserId =
    team1Id === winnerTeamId
      ? team2Id
      : team2Id === winnerTeamId
        ? team1Id
        : null;
  if (!loserId) return;

  let maxRound = byeCache?.maxRound;
  if (maxRound === undefined) {
    const rows = await db.tournamentMatch.findMany({
      where: { tournamentId },
      select: { round: true },
    });
    maxRound = Math.max(0, ...rows.map((m) => m.round));
  }
  if (semiRound !== maxRound - 1) return;

  const teamSlot: 1 | 2 = semiSlot === 1 ? 1 : 2;
  const bronzeKey = slotMapKey(maxRound, OLYMPIC_BRONZE_MATCH_SLOT);
  const bronzeCached = byeCache?.slotMap.get(bronzeKey);

  if (bronzeCached) {
    const data =
      teamSlot === 1
        ? { team1Id: bronzeCached.team1Id ?? loserId }
        : { team2Id: bronzeCached.team2Id ?? loserId };
    await db.tournamentMatch.update({ where: { id: bronzeCached.id }, data });
    if (teamSlot === 1) bronzeCached.team1Id = bronzeCached.team1Id ?? loserId;
    else bronzeCached.team2Id = bronzeCached.team2Id ?? loserId;
    return;
  }

  const bronzeMatch = await db.tournamentMatch.findUnique({
    where: {
      tournamentId_round_slot: {
        tournamentId,
        round: maxRound,
        slot: OLYMPIC_BRONZE_MATCH_SLOT,
      },
    },
  });
  if (!bronzeMatch) return;

  await db.tournamentMatch.update({
    where: { id: bronzeMatch.id },
    data: teamSlot === 1 ? { team1Id: loserId } : { team2Id: loserId },
  });
}

async function finishSwissBye(
  db: Db,
  matchId: string,
  teamId: string,
  byeCache?: BracketByeCache,
) {
  const cached = byeCache?.byId.get(matchId);
  const match = cached
    ? {
        id: cached.id,
        round: cached.round,
        slot: cached.slot,
        tournamentId: byeCache!.tournamentId,
        team1Id: cached.team1Id,
        team2Id: cached.team2Id,
        tournament: { format: byeCache!.format },
      }
    : await db.tournamentMatch.findUnique({
        where: { id: matchId },
        include: { tournament: true },
      });
  if (!match) return;

  const tournamentId = cached ? byeCache!.tournamentId : match.tournamentId;

  if (usesFixedSwissGridEngine(match.tournament.format)) {
    if (byeCache) {
      await advanceFixedSwissResult(
        db,
        {
          id: match.id,
          round: match.round,
          slot: match.slot,
          tournamentId,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
        },
        teamId,
        byeCache.matchCount,
        byeCache.maxRound,
        "FINISHED",
        byeCache.slotMap,
      );
    } else {
      const allMatches = await db.tournamentMatch.findMany({
        where: { tournamentId },
        select: { round: true },
      });
      await advanceFixedSwissResult(
        db,
        {
          id: match.id,
          round: match.round,
          slot: match.slot,
          tournamentId,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
        },
        teamId,
        allMatches.length,
        Math.max(0, ...allMatches.map((m) => m.round)),
        "FINISHED",
      );
    }
    return;
  }

  await db.tournamentMatch.update({
    where: { id: matchId },
    data: { winnerTeamId: teamId, status: "FINISHED" },
  });
  if (cached) {
    cached.winnerTeamId = teamId;
    cached.status = "FINISHED";
  }
  await awardSwissWin(db, teamId);
}

type DbMatchSlot = {
  round: number;
  slot: number;
  team1Id: string | null;
  team2Id: string | null;
};

function incomingAutopassPhantomTeamSlot(
  match: DbMatchSlot,
  allMatches: DbMatchSlot[],
  links: FixedSwissLink[],
): 1 | 2 | null {
  return incomingFixedSwissPhantomTeamSlot(match, allMatches, links);
}

/** Игрок один в ячейке, напротив × от bye 1-го тура — автопроход дальше. */
function soloTeamAgainstIncomingPhantom(
  match: DbMatchSlot,
  allMatches: DbMatchSlot[],
  links: FixedSwissLink[],
): string | null {
  const soloTeamId =
    match.team1Id && !match.team2Id
      ? match.team1Id
      : !match.team1Id && match.team2Id
        ? match.team2Id
        : null;
  if (!soloTeamId) return null;

  const emptySlot: 1 | 2 = match.team1Id ? 2 : 1;
  const phantomSlot = incomingAutopassPhantomTeamSlot(match, allMatches, links);
  return phantomSlot === emptySlot ? soloTeamId : null;
}

function buildByeCache(
  tournamentId: string,
  format: string,
  allSlots: MatchSlotRow[],
): BracketByeCache {
  const slotMap = new Map(allSlots.map((m) => [slotMapKey(m.round, m.slot), m]));
  const byId = new Map(allSlots.map((m) => [m.id, m]));
  return {
    tournamentId,
    format,
    matchCount: allSlots.length,
    maxRound: Math.max(0, ...allSlots.map((m) => m.round)),
    slotMap,
    byId,
  };
}

export async function processByes(db: Db, tournamentId: string, format: string) {
  let changed = true;
  while (changed) {
    changed = false;
    const allSlots = await db.tournamentMatch.findMany({
      where: { tournamentId },
      select: {
        id: true,
        round: true,
        slot: true,
        team1Id: true,
        team2Id: true,
        status: true,
        winnerTeamId: true,
      },
      orderBy: [{ round: "asc" }, { slot: "asc" }],
    });

    const byeCache = buildByeCache(tournamentId, format, allSlots);
    const matches = allSlots.filter(
      (m) => m.status === "SCHEDULED" && !m.winnerTeamId,
    );

    const fixedLinks = usesFixedSwissGridEngine(format)
      ? getFixedSwissLinksForMatchCount(byeCache.matchCount, byeCache.maxRound)
      : null;

    for (const match of matches) {
      if (
        usesFixedSwissGridEngine(format) &&
        fixedLinks &&
        match.round > 1 &&
        isVoidFixedSwissCrossMatch(match, allSlots, fixedLinks)
      ) {
        await db.tournamentMatch.update({
          where: { id: match.id },
          data: { status: "FINISHED" },
        });
        const cached = byeCache.slotMap.get(slotMapKey(match.round, match.slot));
        if (cached) cached.status = "FINISHED";
        changed = true;
        continue;
      }

      const soloTeamId =
        match.team1Id && !match.team2Id
          ? match.team1Id
          : !match.team1Id && match.team2Id
            ? match.team2Id
            : null;

      if (!soloTeamId) continue;

      if (
        (isOlympicFormat(format) || usesFixedSwissGridEngine(format)) &&
        match.round > 1
      ) {
        if (fixedLinks) {
          const phantomWinner = soloTeamAgainstIncomingPhantom(
            match,
            allSlots,
            fixedLinks,
          );
          if (phantomWinner) {
            await advanceWinner(db, match.id, phantomWinner, "FINISHED", byeCache);
            changed = true;
          }
        }
        continue;
      }

      if (isSwissFormat(format)) {
        await finishSwissBye(db, match.id, soloTeamId, byeCache);
      } else {
        await advanceWinner(db, match.id, soloTeamId, "FINISHED", byeCache);
      }
      changed = true;
    }
  }
}

export async function generatePairBracket(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");
  if (!isOlympicPairFormat(tournament.format)) {
    throw new Error(
      "Олимпийская сетка доступна только для парного олимпийского турнира (PAIR_OLYMPIC / PAIR_OLYMPIC_1L_BRONZE)",
    );
  }

  const teams = await db.tournamentTeam.findMany({
    where: { tournamentId, status: "CONFIRMED" },
    include: { player1: true, player2: true },
    orderBy: { createdAt: "asc" },
  });

  if (teams.length < 2) {
    throw new Error("Нужно минимум 2 подтверждённые команды");
  }

  await assertParticipantCountForFormat(tournament.format, teams.length);

  const seeded = [...teams].sort((a, b) => teamRating(b) - teamRating(a));
  await assignSeeds(db, tournamentId, seeded);

  await db.tournamentMatch.deleteMany({ where: { tournamentId } });

  const build =
    tournament.format === "PAIR_OLYMPIC_1L_BRONZE"
      ? buildOlympicBracketWithBronze
      : buildOlympicBracket;
  const bracket = build(seeded.map((t) => t.id));
  await db.tournamentMatch.createMany({
    data: bracket.map((m) => ({
      tournamentId,
      round: m.round,
      slot: m.slot,
      team1Id: m.team1Id,
      team2Id: m.team2Id,
    })),
  });

  await processByes(db, tournamentId, tournament.format);

  await db.tournament.update({
    where: { id: tournamentId },
    data: { status: "ACTIVE" },
  });
}

async function ensureSoloTeams(db: Db, tournamentId: string) {
  const registrations = await db.tournamentRegistration.findMany({
    where: { tournamentId, status: "CONFIRMED" },
    select: { playerId: true, source: true },
  });
  if (registrations.length === 0) return;

  const playerIds = registrations.map((r) => r.playerId);
  const existingTeams = await db.tournamentTeam.findMany({
    where: { tournamentId, player1Id: { in: playerIds } },
    select: { id: true, player1Id: true, status: true },
  });
  const teamByPlayer = new Map(existingTeams.map((t) => [t.player1Id, t]));

  const confirmIds: string[] = [];
  const toCreate: {
    tournamentId: string;
    player1Id: string;
    source: (typeof registrations)[0]["source"];
    status: "CONFIRMED";
    confirmedAt: Date;
  }[] = [];

  const now = new Date();
  for (const reg of registrations) {
    const team = teamByPlayer.get(reg.playerId);
    if (team) {
      if (team.status !== "CONFIRMED") confirmIds.push(team.id);
      continue;
    }
    toCreate.push({
      tournamentId,
      player1Id: reg.playerId,
      source: reg.source,
      status: "CONFIRMED",
      confirmedAt: now,
    });
  }

  if (confirmIds.length > 0) {
    await db.tournamentTeam.updateMany({
      where: { id: { in: confirmIds } },
      data: { status: "CONFIRMED", confirmedAt: now },
    });
  }
  if (toCreate.length > 0) {
    await db.tournamentTeam.createMany({ data: toCreate });
  }
}

export async function generateSoloOlympicBracket(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");
  if (tournament.format !== "OLYMPIC" && tournament.format !== "OLYMPIC_1L_BRONZE") {
    throw new Error("Олимпийская сетка доступна только для одиночного олимпийского турнира");
  }

  await ensureSoloTeams(db, tournamentId);

  const teams = await db.tournamentTeam.findMany({
    where: { tournamentId, status: "CONFIRMED" },
    include: { player1: true, player2: true },
    orderBy: { createdAt: "asc" },
  });

  if (teams.length < 2) {
    throw new Error("Нужно минимум 2 подтверждённых участника");
  }

  await assertParticipantCountForFormat(tournament.format, teams.length);

  const seeded = [...teams].sort(
    (a, b) => teamRating(b) - teamRating(a),
  );
  await assignSeeds(db, tournamentId, seeded);

  await db.tournamentMatch.deleteMany({ where: { tournamentId } });

  const build =
    tournament.format === "OLYMPIC_1L_BRONZE"
      ? buildOlympicBracketWithBronze
      : buildOlympicBracket;
  const bracket = build(seeded.map((t) => t.id));
  await db.tournamentMatch.createMany({
    data: bracket.map((m) => ({
      tournamentId,
      round: m.round,
      slot: m.slot,
      team1Id: m.team1Id,
      team2Id: m.team2Id,
    })),
  });

  await processByes(db, tournamentId, tournament.format);

  await db.tournament.update({
    where: { id: tournamentId },
    data: { status: "ACTIVE" },
  });
}

async function seedTeamsForFixedSwiss(
  db: Db,
  tournamentId: string,
  format: string,
) {
  if (
    format === "FIXED_SWISS" ||
    format === "FIXED_SWISS_16_BRONZE" ||
    format === "FIXED_SWISS_32" ||
    format === "FIXED_SWISS_32_BRONZE" ||
    format === "FIXED_SWISS_32R4_2_3_mesta" ||
    format === "FIXED_SWISS_32R4_1_3_mesto" ||
    format === "FIXED_SWISS_32R8" ||
    format === "FIXED_SWISS_32R8_2_3_mesta" ||
    format === "FIXED_SWISS_32R8_BRONZE" ||
    format === "FIXED_SWISS_64" ||
    format === "FIXED_SWISS_64_BRONZE" ||
    format === "EXCEL_REF_64"
  ) {
    await ensureSoloTeams(db, tournamentId);
  }

  const teams = await db.tournamentTeam.findMany({
    where: { tournamentId, status: "CONFIRMED" },
    include: { player1: true, player2: true },
    orderBy: { createdAt: "asc" },
  });

  if (teams.length < 2) {
    throw new Error("Нужно минимум 2 подтверждённые команды");
  }

  const seeded = [...teams].sort((a, b) => teamRating(b) - teamRating(a));
  await assignSeeds(db, tournamentId, seeded);
  return seeded;
}

export async function generateFixedSwissGrid(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");
  if (!isFixedSwissFormat(tournament.format)) {
    throw new Error(
      "Фиксированная швейцарская сетка доступна только для FIXED_SWISS / FIXED_SWISS_16_BRONZE / парных аналогов",
    );
  }

  const existing = await db.tournamentMatch.count({ where: { tournamentId } });
  if (existing > 0) {
    throw new Error("Сетка уже сформирована");
  }

  const seeded = await seedTeamsForFixedSwiss(db, tournamentId, tournament.format);
  await assertParticipantCountForFormat(tournament.format, seeded.length);
  const gridSize = fixedSwissNominalGridSize(tournament.format, seeded.length);
  const template = buildFixedSwissTemplate(seeded.length, tournament.format);
  const bracket = buildOlympicBracket(seeded.map((t) => t.id), gridSize);

  const round1BySlot = new Map(
    bracket.filter((m) => m.round === 1).map((m) => [m.slot, m]),
  );

  await db.tournamentMatch.createMany({
    data: template.matches.map((m) => {
      const r1 = m.round === 1 ? round1BySlot.get(m.slot) : null;
      return {
        tournamentId,
        round: m.round,
        slot: m.slot,
        team1Id: r1?.team1Id ?? null,
        team2Id: r1?.team2Id ?? null,
      };
    }),
  });

  await processByes(db, tournamentId, tournament.format);

  await db.tournament.update({
    where: { id: tournamentId },
    data: { status: "ACTIVE" },
  });
}

export async function generateExcelRef64Grid(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");
  if (!isExcelRef64Format(tournament.format)) {
    throw new Error("Сетка из Excel доступна только для формата EXCEL_REF_64");
  }

  const existing = await db.tournamentMatch.count({ where: { tournamentId } });
  if (existing > 0) {
    throw new Error("Сетка уже сформирована");
  }

  const seeded = await seedTeamsForFixedSwiss(db, tournamentId, tournament.format);
  await assertParticipantCountForFormat(tournament.format, seeded.length);
  const template = buildFixedSwissTemplate(seeded.length, "FIXED_SWISS_64");

  const teamsWithSeed = await db.tournamentTeam.findMany({
    where: { tournamentId, status: "CONFIRMED" },
    select: { id: true, seed: true },
  });
  const seedToId = new Map(
    teamsWithSeed
      .filter((t): t is { id: string; seed: number } => t.seed != null)
      .map((t) => [t.seed, t.id]),
  );
  const excelByNo = new Map(
    excelRef.matches.map((m) => [m.no, m as { no: number; seed1?: number; seed2?: number }]),
  );

  await db.tournamentMatch.createMany({
    data: template.matches.map((m) => {
      let team1Id: string | null = null;
      let team2Id: string | null = null;
      if (m.round === 1) {
        const ex = excelByNo.get(m.slot);
        if (ex?.seed1 != null) team1Id = seedToId.get(ex.seed1) ?? null;
        if (ex?.seed2 != null) team2Id = seedToId.get(ex.seed2) ?? null;
      }
      return {
        tournamentId,
        round: m.round,
        slot: m.slot,
        team1Id,
        team2Id,
      };
    }),
  });

  await processByes(db, tournamentId, tournament.format);

  await db.tournament.update({
    where: { id: tournamentId },
    data: { status: "ACTIVE" },
  });
}

export async function generateSwissRound(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");
  if (!isDynamicSwissFormat(tournament.format)) {
    throw new Error("По-туровое формирование доступно только для SWISS / PAIR_SWISS");
  }

  if (tournament.format === "SWISS") {
    await ensureSoloTeams(db, tournamentId);
  }

  const teams = await db.tournamentTeam.findMany({
    where: { tournamentId, status: "CONFIRMED" },
    include: { player1: true, player2: true },
  });

  if (teams.length < 2) {
    throw new Error("Нужно минимум 2 подтверждённые команды");
  }

  await assertParticipantCountForFormat(tournament.format, teams.length);

  const existingMatches = await db.tournamentMatch.findMany({
    where: { tournamentId },
    orderBy: [{ round: "desc" }, { slot: "asc" }],
  });

  const currentRound = existingMatches[0]?.round ?? 0;
  if (currentRound > 0) {
    const unfinished = existingMatches.filter(
      (m) => m.round === currentRound && !m.winnerTeamId,
    );
    if (unfinished.length > 0) {
      throw new Error(`Завершите тур ${currentRound} перед формированием следующего`);
    }
  }

  const nextRound = currentRound + 1;
  const opponents = new Map<string, Set<string>>();
  for (const team of teams) {
    opponents.set(team.id, new Set());
  }

  for (const match of existingMatches) {
    if (!match.team1Id || !match.team2Id) continue;
    opponents.get(match.team1Id)?.add(match.team2Id);
    opponents.get(match.team2Id)?.add(match.team1Id);
  }

  const pairings = buildSwissPairings(
    teams.map((team) => ({
      teamId: team.id,
      rating: teamRating(team),
      points: team.swissPoints,
      opponents: [...(opponents.get(team.id) ?? [])],
    })),
    nextRound,
  );

  await db.tournamentMatch.createMany({
    data: pairings.map((m) => ({
      tournamentId,
      round: m.round,
      slot: m.slot,
      team1Id: m.team1Id,
      team2Id: m.team2Id,
    })),
  });

  await processByes(db, tournamentId, tournament.format);

  if (tournament.status === "OPEN" || tournament.status === "DRAFT") {
    await db.tournament.update({
      where: { id: tournamentId },
      data: { status: "ACTIVE" },
    });
  }
}

export async function generateTournamentPairing(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");

  if (isOlympicPairFormat(tournament.format)) {
    await generatePairBracket(db, tournamentId);
    return;
  }
  if (tournament.format === "OLYMPIC" || tournament.format === "OLYMPIC_1L_BRONZE") {
    await generateSoloOlympicBracket(db, tournamentId);
    return;
  }
  if (isExcelRef64Format(tournament.format)) {
    await generateExcelRef64Grid(db, tournamentId);
    return;
  }
  if (isFixedSwissFormat(tournament.format)) {
    await generateFixedSwissGrid(db, tournamentId);
    return;
  }
  if (isDynamicSwissFormat(tournament.format)) {
    await generateSwissRound(db, tournamentId);
    return;
  }

  throw new Error("Сетка для этого формата пока не поддерживается");
}

export async function saveMatchResult(db: Db, input: MatchResultInput) {
  const match = await db.tournamentMatch.findUnique({
    where: { id: input.matchId },
    include: { tournament: true },
  });
  if (!match) throw new Error("Матч не найден");

  const roundOneBye =
    match.round === 1 &&
    ((match.team1Id && !match.team2Id) ||
      (!match.team1Id && match.team2Id));
  const scoreTouched =
    input.team1Score !== undefined || input.team2Score !== undefined;
  if (
    scoreTouched &&
    !roundOneBye &&
    (!match.team1Id || !match.team2Id)
  ) {
    throw new Error("Нельзя указать счёт до определения соперника");
  }
  if (
    input.winnerTeamId &&
    !roundOneBye &&
    (!match.team1Id || !match.team2Id)
  ) {
    throw new Error("Матч ещё не готов");
  }

  const startedAt = parseOptionalDate(input.startedAt);
  const finishedAt = parseOptionalDate(input.finishedAt);
  const now = new Date();
  const autoTimes =
    input.winnerTeamId && !match.winnerTeamId
      ? {
          ...(startedAt === undefined &&
            !match.startedAt && { startedAt: now }),
          ...(finishedAt === undefined &&
            !match.finishedAt && { finishedAt: now }),
        }
      : {};

  let tableId: string | null | undefined = undefined;
  const matchFinishing =
    Boolean(input.winnerTeamId || (finishedAt !== undefined && finishedAt !== null)) &&
    !match.finishedAt;
  const matchStarting =
    startedAt !== undefined && startedAt !== null && !match.startedAt;
  const needsTableAssignment =
    matchStarting ||
    ((match.startedAt != null || (startedAt !== undefined && startedAt !== null)) &&
      !match.tableId &&
      !matchFinishing);

  if (typeof input.tableId === "string" && input.tableId.length > 0) {
    const allowedTableIds = parseTournamentTableIds(match.tournament.tableIds);
    if (allowedTableIds.length > 0 && !allowedTableIds.includes(input.tableId)) {
      throw new Error("Выбранный стол не входит в список турнира");
    }
    const busyIds = await listBusyTournamentTableIds(
      db,
      match.tournamentId,
      match.id,
    );
    if (busyIds.has(input.tableId)) {
      throw new Error("Этот стол уже занят другой текущей встречей");
    }
    tableId = input.tableId;
  } else if (needsTableAssignment) {
    const allowedTableIds = parseTournamentTableIds(match.tournament.tableIds);
    tableId = await pickFreeTournamentTableId(db, match.tournamentId, match.id);
    if (matchStarting && allowedTableIds.length > 0 && !tableId) {
      throw new Error(
        `Все ${allowedTableIds.length} столов турнира заняты. Завершите одну из текущих встреч, чтобы начать новую.`,
      );
    }
  }

  await db.tournamentMatch.update({
    where: { id: input.matchId },
    data: {
      ...(input.team1Score !== undefined && { team1Score: input.team1Score }),
      ...(input.team2Score !== undefined && { team2Score: input.team2Score }),
      ...(startedAt !== undefined && { startedAt }),
      ...(finishedAt !== undefined && { finishedAt }),
      ...(tableId !== undefined && { tableId }),
      ...autoTimes,
    },
  });

  await maybeNotifyMatchStartScheduled(input, match.startedAt, startedAt ?? null);

  if (!input.winnerTeamId) {
    return db.tournamentMatch.findUnique({
      where: { id: input.matchId },
      include: {
        team1: { include: { player1: true, player2: true } },
        team2: { include: { player1: true, player2: true } },
        winnerTeam: { include: { player1: true, player2: true } },
      },
    });
  }

  const soloTeamId =
    match.round === 1 &&
    (match.team1Id && !match.team2Id
      ? match.team1Id
      : !match.team1Id && match.team2Id
        ? match.team2Id
        : null);

  let matchStatus: MatchStatus = "FINISHED";
  if (!soloTeamId && match.team1Id && match.team2Id) {
    const s1 = input.team1Score ?? 0;
    const s2 = input.team2Score ?? 0;
    const scoreError = validateMatchScoresForFinish(s1, s2);
    if (scoreError) throw new Error(scoreError);
    const expectedWinner = winnerTeamIdFromScores(match.team1Id, match.team2Id, s1, s2);
    if (expectedWinner && expectedWinner !== input.winnerTeamId) {
      throw new Error("Победитель не совпадает со счётом");
    }
    matchStatus = matchStatusFromScores(s1, s2);
  }

  if (match.winnerTeamId) {
    if (match.winnerTeamId !== input.winnerTeamId) {
      throw new Error("Победитель уже зафиксирован и не может быть изменён");
    }
    return db.tournamentMatch.findUnique({
      where: { id: input.matchId },
      include: {
        team1: { include: { player1: true, player2: true } },
        team2: { include: { player1: true, player2: true } },
        winnerTeam: { include: { player1: true, player2: true } },
      },
    });
  }

  const soloTeamIdForAdvance =
    match.round === 1 &&
    (match.team1Id && !match.team2Id
      ? match.team1Id
      : !match.team1Id && match.team2Id
        ? match.team2Id
        : null);

  if (soloTeamIdForAdvance) {
    if (input.winnerTeamId !== soloTeamIdForAdvance) {
      throw new Error("В автопроходе победитель определён автоматически");
    }
    await advanceWinner(db, input.matchId, input.winnerTeamId, matchStatus);
  } else {
    if (!match.team1Id || !match.team2Id) {
      throw new Error("Матч ещё не готов");
    }
    if (
      input.winnerTeamId !== match.team1Id &&
      input.winnerTeamId !== match.team2Id
    ) {
      throw new Error("Команда не участвует в этом матче");
    }
    await advanceWinner(db, input.matchId, input.winnerTeamId, matchStatus);
  }

  const updated = await db.tournamentMatch.findUnique({
    where: { id: input.matchId },
    include: {
      team1: { include: { player1: true, player2: true } },
      team2: { include: { player1: true, player2: true } },
      winnerTeam: { include: { player1: true, player2: true } },
    },
  });

  if (
    updated &&
    isOlympicFormat(match.tournament.format)
  ) {
    const totalRounds = await db.tournamentMatch.groupBy({
      by: ["round"],
      where: { tournamentId: match.tournamentId },
    });
    const maxRound = Math.max(...totalRounds.map((r) => r.round), 0);
    if (updated.round === maxRound) {
      await db.tournament.update({
        where: { id: match.tournamentId },
        data: { status: "FINISHED" },
      });
    }
  }

  await processByes(db, match.tournamentId, match.tournament.format);

  return db.tournamentMatch.findUnique({
    where: { id: input.matchId },
    include: {
      team1: { include: { player1: true, player2: true } },
      team2: { include: { player1: true, player2: true } },
      winnerTeam: { include: { player1: true, player2: true } },
    },
  });
}

export async function resetAllMatchResults(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");

  const matches = await db.tournamentMatch.findMany({
    where: { tournamentId },
    orderBy: [{ round: "asc" }, { slot: "asc" }],
  });
  if (matches.length === 0) {
    throw new Error("Сетка не сформирована");
  }
  if (!matches.some((m) => {
    if (!m.winnerTeamId) return false;
    if (m.team1Id && m.team2Id) return true;
    return m.team1Score != null || m.team2Score != null;
  })) {
    throw new Error("Нет завершённых встреч — нечего отменять");
  }

  if (isDynamicSwissFormat(tournament.format)) {
    let remaining = matches.filter((m) => m.winnerTeamId).length;
    let guard = remaining + 1;
    while (remaining > 0 && guard-- > 0) {
      const finished = await db.tournamentMatch.findMany({
        where: { tournamentId, winnerTeamId: { not: null } },
        orderBy: [{ round: "desc" }, { slot: "desc" }],
      });
      if (finished.length === 0) break;
      const maxRound = finished[0]!.round;
      for (const m of finished.filter((x) => x.round === maxRound)) {
        await cancelMatchResult(db, m.id);
      }
      remaining = (
        await db.tournamentMatch.count({
          where: { tournamentId, winnerTeamId: { not: null } },
        })
      );
    }
    if (remaining > 0) {
      throw new Error("Не удалось отменить все встречи — проверьте сетку");
    }
    if (tournament.status === "FINISHED") {
      await db.tournament.update({
        where: { id: tournamentId },
        data: { status: "ACTIVE" },
      });
    }
    return;
  }

  if (!usesFixedSwissGridEngine(tournament.format) && !isOlympicFormat(tournament.format)) {
    throw new Error("Массовая отмена для этого формата пока не поддерживается");
  }

  for (const m of matches) {
    await db.tournamentMatch.update({
      where: { id: m.id },
      data: {
        winnerTeamId: null,
        status: "SCHEDULED",
        team1Score: null,
        team2Score: null,
        startedAt: null,
        finishedAt: null,
        team1Id: m.round === 1 ? m.team1Id : null,
        team2Id: m.round === 1 ? m.team2Id : null,
      },
    });
  }

  if (isSwissFormat(tournament.format)) {
    await db.tournamentTeam.updateMany({
      where: { tournamentId },
      data: { swissPoints: 0 },
    });
  }

  if (tournament.status === "FINISHED") {
    await db.tournament.update({
      where: { id: tournamentId },
      data: { status: "ACTIVE" },
    });
  }

  await processByes(db, tournamentId, tournament.format);
}

/** Удалить все встречи сетки без пересоздания (участники остаются). */
export async function deleteBracket(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");

  const existing = await db.tournamentMatch.count({ where: { tournamentId } });
  if (existing === 0) {
    throw new Error("Сетка не сформирована");
  }

  if (isSwissFormat(tournament.format)) {
    await db.tournamentTeam.updateMany({
      where: { tournamentId },
      data: { swissPoints: 0 },
    });
  }

  await db.tournamentMatch.deleteMany({ where: { tournamentId } });

  if (tournament.status === "ACTIVE" || tournament.status === "FINISHED") {
    await db.tournament.update({
      where: { id: tournamentId },
      data: { status: "OPEN" },
    });
  }
}

export async function regenerateBracket(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");

  const existing = await db.tournamentMatch.count({ where: { tournamentId } });
  if (existing === 0) {
    throw new Error("Сетка не сформирована — используйте «Сформировать сетку»");
  }

  if (!usesFixedSwissGridEngine(tournament.format) && !isOlympicFormat(tournament.format)) {
    throw new Error(
      "Пересоздание сетки доступно для фикс. швейцарской и олимпийской",
    );
  }

  if (isSwissFormat(tournament.format)) {
    await db.tournamentTeam.updateMany({
      where: { tournamentId },
      data: { swissPoints: 0 },
    });
  }

  await db.tournamentMatch.deleteMany({ where: { tournamentId } });
  await generateTournamentPairing(db, tournamentId);

  if (tournament.status === "FINISHED") {
    await db.tournament.update({
      where: { id: tournamentId },
      data: { status: "ACTIVE" },
    });
  }
}
