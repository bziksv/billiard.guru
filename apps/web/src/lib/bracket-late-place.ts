import type { PrismaClient } from "@/generated/prisma/client";
import { cancelMatchResult } from "@/lib/bracket-service";
import {
  type VacantRoundOneSlot,
  vacantRoundOneSlotsFromMatches,
} from "@/lib/bracket-late-place-display";
import {
  isVoidFixedSwissCrossMatch,
  type FixedSwissSlotRow,
} from "@/lib/fixed-swiss-cross-bye";
import { getFixedSwissLinksForMatchCount } from "@/lib/fixed-swiss-grid";
import {
  isDynamicSwissFormat,
  isOlympicFormat,
  usesFixedSwissGridEngine,
} from "@/lib/pair-tournament";

export type { VacantRoundOneSlot } from "@/lib/bracket-late-place-display";
export { vacantRoundOneSlotsFromMatches } from "@/lib/bracket-late-place-display";

type Db = Pick<
  PrismaClient,
  | "tournamentMatch"
  | "tournamentTeam"
  | "tournament"
  | "tournamentRegistration"
  | "clubPlayerRating"
>;

/** R1-слоты с ровно одной занятой стороной (bye / ×). */
export async function listVacantRoundOneSlots(
  db: Db,
  tournamentId: string,
): Promise<VacantRoundOneSlot[]> {
  const matches = await db.tournamentMatch.findMany({
    where: { tournamentId, round: 1 },
    include: {
      team1: { include: { player1: true, player2: true } },
      team2: { include: { player1: true, player2: true } },
    },
    orderBy: { slot: "asc" },
  });

  return vacantRoundOneSlotsFromMatches(matches);
}

export async function countVacantRoundOneSlots(
  db: Db,
  tournamentId: string,
): Promise<number> {
  const matches = await db.tournamentMatch.findMany({
    where: { tournamentId, round: 1 },
    select: { team1Id: true, team2Id: true },
  });
  return matches.filter((m) => Boolean(m.team1Id) !== Boolean(m.team2Id)).length;
}

export async function hasVacantRoundOneSlots(
  db: Db,
  tournamentId: string,
): Promise<boolean> {
  return (await countVacantRoundOneSlots(db, tournamentId)) > 0;
}

async function assertTeamNotInBracket(db: Db, tournamentId: string, teamId: string) {
  const existing = await db.tournamentMatch.findFirst({
    where: {
      tournamentId,
      OR: [{ team1Id: teamId }, { team2Id: teamId }],
    },
    select: { id: true, round: true, slot: true },
  });
  if (existing) {
    throw new Error(
      `Команда уже в сетке (тур ${existing.round}, слот ${existing.slot})`,
    );
  }
}

/**
 * Void-кресты, закрытые из‑за двух bye: вернуть в SCHEDULED, если условие void больше не выполняется.
 */
async function reopenStaleVoidCrosses(
  db: Db,
  tournamentId: string,
  format: string,
) {
  if (!usesFixedSwissGridEngine(format)) return;

  const allMatches = await db.tournamentMatch.findMany({
    where: { tournamentId },
    select: {
      id: true,
      round: true,
      slot: true,
      team1Id: true,
      team2Id: true,
      winnerTeamId: true,
      status: true,
    },
    orderBy: [{ round: "asc" }, { slot: "asc" }],
  });

  const maxRound = Math.max(...allMatches.map((m) => m.round), 0);
  const links = getFixedSwissLinksForMatchCount(allMatches.length, maxRound);
  const slots: FixedSwissSlotRow[] = allMatches;

  for (const match of allMatches) {
    if (match.round <= 1) continue;
    if (match.team1Id || match.team2Id) continue;
    if (match.winnerTeamId) continue;
    if (match.status !== "FINISHED") continue;
    if (isVoidFixedSwissCrossMatch(match, slots, links)) continue;

    await db.tournamentMatch.update({
      where: { id: match.id },
      data: { status: "SCHEDULED" },
    });
  }
}

/**
 * Посадить подтверждённую команду в пустой слот R1 (на против bye / ×).
 * Если bye уже автозакрыт — откатывает автопроход через cancelMatchResult.
 */
export async function placeTeamIntoMatchSlot(
  db: Db,
  params: { matchId: string; teamId: string },
): Promise<{ matchId: string; teamId: string }> {
  const match = await db.tournamentMatch.findUnique({
    where: { id: params.matchId },
    include: { tournament: true },
  });
  if (!match) throw new Error("Матч не найден");

  const format = match.tournament.format;
  if (isDynamicSwissFormat(format)) {
    throw new Error("Посадка в bye недоступна для по-турового Swiss");
  }
  if (!isOlympicFormat(format) && !usesFixedSwissGridEngine(format)) {
    throw new Error(
      "Посадка в bye доступна только для олимпийской и фиксированной швейцарской сетки",
    );
  }
  if (match.round !== 1) {
    throw new Error("Сажать опоздавшего можно только в первый тур");
  }

  const team = await db.tournamentTeam.findUnique({
    where: { id: params.teamId },
  });
  if (!team || team.tournamentId !== match.tournamentId) {
    throw new Error("Команда не найдена в этом турнире");
  }
  if (team.status !== "CONFIRMED") {
    throw new Error("Сначала подтвердите участника");
  }

  await assertTeamNotInBracket(db, match.tournamentId, params.teamId);

  const has1 = Boolean(match.team1Id);
  const has2 = Boolean(match.team2Id);
  if (has1 === has2) {
    throw new Error(
      has1
        ? "В этой встрече уже оба участника"
        : "Пустая встреча без соперника — выберите слот с автопроходом",
    );
  }

  const emptyTeamSlot: 1 | 2 = has1 ? 2 : 1;

  if (match.winnerTeamId) {
    await cancelMatchResult(db, match.id);
  } else if (match.status === "FINISHED") {
    await db.tournamentMatch.update({
      where: { id: match.id },
      data: {
        status: "SCHEDULED",
        team1Score: null,
        team2Score: null,
        finishedAt: null,
      },
    });
  }

  const refreshed = await db.tournamentMatch.findUnique({
    where: { id: match.id },
  });
  if (!refreshed) throw new Error("Матч не найден");
  if (emptyTeamSlot === 1 && refreshed.team1Id) {
    throw new Error("Слот уже занят");
  }
  if (emptyTeamSlot === 2 && refreshed.team2Id) {
    throw new Error("Слот уже занят");
  }

  await db.tournamentMatch.update({
    where: { id: match.id },
    data:
      emptyTeamSlot === 1
        ? { team1Id: params.teamId, status: "SCHEDULED", winnerTeamId: null }
        : { team2Id: params.teamId, status: "SCHEDULED", winnerTeamId: null },
  });

  await db.tournamentTeam.update({
    where: { id: params.teamId },
    data: { isLate: true },
  });

  if (!team.player2Id) {
    await db.tournamentRegistration.updateMany({
      where: {
        tournamentId: match.tournamentId,
        playerId: team.player1Id,
        status: "CONFIRMED",
      },
      data: { isLate: true },
    });
  }

  await reopenStaleVoidCrosses(db, match.tournamentId, format);

  return { matchId: match.id, teamId: params.teamId };
}
