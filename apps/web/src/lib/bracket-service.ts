import type { PrismaClient } from "@/generated/prisma/client";
import {
  buildOlympicBracket,
  buildSwissPairings,
  getNextMatchSlot,
  isOlympicPairFormat,
  isSwissPairFormat,
  teamRating,
} from "@/lib/pair-tournament";

type Db = Pick<
  PrismaClient,
  "tournamentMatch" | "tournamentTeam" | "tournament"
>;

async function awardSwissWin(db: Db, teamId: string) {
  await db.tournamentTeam.update({
    where: { id: teamId },
    data: { swissPoints: { increment: 1 } },
  });
}

export async function advanceWinner(
  db: Db,
  matchId: string,
  winnerTeamId: string,
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

  await db.tournamentMatch.update({
    where: { id: matchId },
    data: {
      winnerTeamId,
      status: "FINISHED",
    },
  });

  if (isSwissPairFormat(match.tournament.format)) {
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
  await db.tournamentMatch.update({
    where: { id: matchId },
    data: { winnerTeamId: teamId, status: "FINISHED" },
  });
  await awardSwissWin(db, teamId);
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

    for (const match of matches) {
      const soloTeamId =
        match.team1Id && !match.team2Id
          ? match.team1Id
          : !match.team1Id && match.team2Id
            ? match.team2Id
            : null;

      if (!soloTeamId) continue;

      if (isSwissPairFormat(format)) {
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

export async function generateSwissRound(db: Db, tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");
  if (!isSwissPairFormat(tournament.format)) {
    throw new Error("Туры швейцарки доступны только для парного швейцарского турнира");
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
  if (isSwissPairFormat(tournament.format)) {
    await generateSwissRound(db, tournamentId);
    return;
  }

  throw new Error("Сетка доступна только для парных турниров");
}
