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
  getFixedSwissLinksForMatchCount,
  type FixedSwissLink,
} from "@/lib/fixed-swiss-grid";
import {
  buildOlympicBracket,
  buildSwissPairings,
  getNextMatchSlot,
  isDynamicSwissFormat,
  isFixedSwissFormat,
  isOlympicFormat,
  isOlympicPairFormat,
  isSwissFormat,
  isSwissPairFormat,
  teamRating,
} from "@/lib/pair-tournament";

type Db = Pick<
  PrismaClient,
  "tournamentMatch" | "tournamentTeam" | "tournament" | "tournamentRegistration"
>;

export interface MatchResultInput {
  matchId: string;
  winnerTeamId?: string;
  team1Score?: number | null;
  team2Score?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
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

  if (isFixedSwissFormat(format) && fixedSwissMatchCount) {
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

  const fixedSwissMatchCount = isFixedSwissFormat(format)
    ? allMatches.length
    : undefined;
  const fixedSwissMaxRound = isFixedSwissFormat(format)
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
) {
  const target = await db.tournamentMatch.findUnique({
    where: {
      tournamentId_round_slot: { tournamentId, round, slot },
    },
  });
  if (!target) return;

  const data =
    teamSlot === 1
      ? { team1Id: target.team1Id ?? teamId }
      : { team2Id: target.team2Id ?? teamId };

  if (
    (teamSlot === 1 && target.team1Id && target.team1Id !== teamId) ||
    (teamSlot === 2 && target.team2Id && target.team2Id !== teamId)
  ) {
    return;
  }

  await db.tournamentMatch.update({
    where: { id: target.id },
    data,
  });
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
) {
  const loserId =
    match.team1Id === winnerTeamId ? match.team2Id : match.team1Id;
  const links = getFixedSwissLinksForMatchCount(matchCount, maxRound);

  await db.tournamentMatch.update({
    where: { id: match.id },
    data: { winnerTeamId, status: matchStatus },
  });
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
      );
    }
  }
}

export async function advanceWinner(
  db: Db,
  matchId: string,
  winnerTeamId: string,
  matchStatus: MatchStatus = "FINISHED",
) {
  const match = await db.tournamentMatch.findUnique({
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

  if (isFixedSwissFormat(match.tournament.format)) {
    const allMatches = await db.tournamentMatch.findMany({
      where: { tournamentId: match.tournamentId },
    });
    const matchCount = allMatches.length;
    const maxRound = Math.max(...allMatches.map((m) => m.round), 0);
    await advanceFixedSwissResult(
      db,
      {
        id: match.id,
        round: match.round,
        slot: match.slot,
        tournamentId: match.tournamentId,
        team1Id: match.team1Id,
        team2Id: match.team2Id,
      },
      winnerTeamId,
      matchCount,
      maxRound,
      matchStatus,
    );
    return;
  }

  await db.tournamentMatch.update({
    where: { id: matchId },
    data: {
      winnerTeamId,
      status: matchStatus,
    },
  });

  if (isDynamicSwissFormat(match.tournament.format)) {
    await awardSwissWin(db, winnerTeamId);
    return;
  }

  const next = getNextMatchSlot(match.round, match.slot);
  const nextMatch = await db.tournamentMatch.findUnique({
    where: {
      tournamentId_round_slot: {
        tournamentId: match.tournamentId,
        round: next.round,
        slot: next.slot,
      },
    },
  });

  if (!nextMatch) return;

  await db.tournamentMatch.update({
    where: { id: nextMatch.id },
    data: next.teamSlot === 1 ? { team1Id: winnerTeamId } : { team2Id: winnerTeamId },
  });
}

async function finishSwissBye(db: Db, matchId: string, teamId: string) {
  const match = await db.tournamentMatch.findUnique({
    where: { id: matchId },
    include: { tournament: true },
  });
  if (!match) return;

  if (isFixedSwissFormat(match.tournament.format)) {
    const allMatches = await db.tournamentMatch.findMany({
      where: { tournamentId: match.tournamentId },
    });
    const matchCount = allMatches.length;
    const maxRound = Math.max(...allMatches.map((m) => m.round), 0);
    await advanceFixedSwissResult(
      db,
      {
        id: match.id,
        round: match.round,
        slot: match.slot,
        tournamentId: match.tournamentId,
        team1Id: match.team1Id,
        team2Id: match.team2Id,
      },
      teamId,
      matchCount,
      maxRound,
    );
    return;
  }

  await db.tournamentMatch.update({
    where: { id: matchId },
    data: { winnerTeamId: teamId, status: "FINISHED" },
  });
  await awardSwissWin(db, teamId);
}

type DbMatchSlot = {
  round: number;
  slot: number;
  team1Id: string | null;
  team2Id: string | null;
};

function isRoundOneByeMatch(match: DbMatchSlot): boolean {
  if (match.round !== 1) return false;
  return Boolean(
    (match.team1Id && !match.team2Id) || (!match.team1Id && match.team2Id),
  );
}

/** Слот с ×: loss от автопрохода 1-го тура (как incomingAutopassPhantomSlot в UI). */
function incomingAutopassPhantomTeamSlot(
  match: DbMatchSlot,
  allMatches: DbMatchSlot[],
  links: FixedSwissLink[],
): 1 | 2 | null {
  for (const link of links) {
    if (
      link.kind !== "loss" ||
      link.toRound !== match.round ||
      link.toSlot !== match.slot
    ) {
      continue;
    }
    const source = allMatches.find(
      (m) => m.round === link.fromRound && m.slot === link.fromSlot,
    );
    if (source && isRoundOneByeMatch(source)) {
      return link.toTeam;
    }
  }
  return null;
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

export async function processByes(db: Db, tournamentId: string, format: string) {
  let changed = true;
  while (changed) {
    changed = false;
    const matches = await db.tournamentMatch.findMany({
      where: {
        tournamentId,
        status: "SCHEDULED",
        winnerTeamId: null,
      },
      orderBy: [{ round: "asc" }, { slot: "asc" }],
    });

    const allSlots: DbMatchSlot[] = await db.tournamentMatch.findMany({
      where: { tournamentId },
      select: { round: true, slot: true, team1Id: true, team2Id: true },
      orderBy: [{ round: "asc" }, { slot: "asc" }],
    });

    const matchCount = allSlots.length;
    const maxRound = Math.max(...allSlots.map((m) => m.round), 0);
    const fixedLinks = isFixedSwissFormat(format)
      ? getFixedSwissLinksForMatchCount(matchCount, maxRound)
      : null;

    for (const match of matches) {
      const soloTeamId =
        match.team1Id && !match.team2Id
          ? match.team1Id
          : !match.team1Id && match.team2Id
            ? match.team2Id
            : null;

      if (!soloTeamId) continue;

      if (
        (isOlympicFormat(format) || isFixedSwissFormat(format)) &&
        match.round > 1
      ) {
        if (fixedLinks) {
          const phantomWinner = soloTeamAgainstIncomingPhantom(
            match,
            allSlots,
            fixedLinks,
          );
          if (phantomWinner) {
            await advanceWinner(db, match.id, phantomWinner);
            changed = true;
          }
        }
        continue;
      }

      if (isSwissFormat(format)) {
        await finishSwissBye(db, match.id, soloTeamId);
      } else {
        await advanceWinner(db, match.id, soloTeamId);
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
    throw new Error("Олимпийская сетка доступна только для парного олимпийского турнира");
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

  await db.tournamentTeam.updateMany({
    where: { tournamentId },
    data: { seed: null },
  });

  for (let i = 0; i < seeded.length; i++) {
    await db.tournamentTeam.update({
      where: { id: seeded[i]!.id },
      data: { seed: i + 1 },
    });
  }

  await db.tournamentMatch.deleteMany({ where: { tournamentId } });

  const bracket = buildOlympicBracket(seeded.map((t) => t.id));
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
  });

  for (const reg of registrations) {
    const existing = await db.tournamentTeam.findFirst({
      where: { tournamentId, player1Id: reg.playerId },
    });
    if (existing) {
      if (existing.status !== "CONFIRMED") {
        await db.tournamentTeam.update({
          where: { id: existing.id },
          data: { status: "CONFIRMED", confirmedAt: new Date() },
        });
      }
      continue;
    }

    await db.tournamentTeam.create({
      data: {
        tournamentId,
        player1Id: reg.playerId,
        source: reg.source,
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });
  }
}

export async function generateSoloOlympicBracket(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");
  if (tournament.format !== "OLYMPIC") {
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

  const seeded = [...teams].sort(
    (a, b) => teamRating(b) - teamRating(a),
  );

  await db.tournamentTeam.updateMany({
    where: { tournamentId },
    data: { seed: null },
  });

  for (let i = 0; i < seeded.length; i++) {
    await db.tournamentTeam.update({
      where: { id: seeded[i]!.id },
      data: { seed: i + 1 },
    });
  }

  await db.tournamentMatch.deleteMany({ where: { tournamentId } });

  const bracket = buildOlympicBracket(seeded.map((t) => t.id));
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
  if (format === "FIXED_SWISS") {
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

  await db.tournamentTeam.updateMany({
    where: { tournamentId },
    data: { seed: null },
  });

  for (let i = 0; i < seeded.length; i++) {
    await db.tournamentTeam.update({
      where: { id: seeded[i]!.id },
      data: { seed: i + 1 },
    });
  }

  return seeded;
}

export async function generateFixedSwissGrid(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");
  if (!isFixedSwissFormat(tournament.format)) {
    throw new Error("Фиксированная швейцарская сетка доступна только для формата FIXED_SWISS / FIXED_PAIR_SWISS");
  }

  const existing = await db.tournamentMatch.count({ where: { tournamentId } });
  if (existing > 0) {
    throw new Error("Сетка уже сформирована");
  }

  const seeded = await seedTeamsForFixedSwiss(db, tournamentId, tournament.format);
  const template = buildFixedSwissTemplate(seeded.length);
  const bracket = buildOlympicBracket(seeded.map((t) => t.id));

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
  if (tournament.format === "OLYMPIC") {
    await generateSoloOlympicBracket(db, tournamentId);
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

  await db.tournamentMatch.update({
    where: { id: input.matchId },
    data: {
      ...(input.team1Score !== undefined && { team1Score: input.team1Score }),
      ...(input.team2Score !== undefined && { team2Score: input.team2Score }),
      ...(startedAt !== undefined && { startedAt }),
      ...(finishedAt !== undefined && { finishedAt }),
      ...autoTimes,
    },
  });

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

  if (!isFixedSwissFormat(tournament.format) && !isOlympicFormat(tournament.format)) {
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

export async function regenerateBracket(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");

  const existing = await db.tournamentMatch.count({ where: { tournamentId } });
  if (existing === 0) {
    throw new Error("Сетка не сформирована — используйте «Сформировать сетку»");
  }

  if (!isFixedSwissFormat(tournament.format) && !isOlympicFormat(tournament.format)) {
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
