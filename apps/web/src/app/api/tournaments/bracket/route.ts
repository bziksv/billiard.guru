import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { advanceWinner, generateTournamentPairing } from "@/lib/bracket-service";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { matchWinnerSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const log = createRequestLogger(randomUUID());
  try {
    const { tournamentId } = await request.json();
    if (!tournamentId) {
      return NextResponse.json({ error: "Укажите турнир" }, { status: 400 });
    }

    await generateTournamentPairing(prisma, tournamentId);

    await writeAuditLog({
      actorType: "club",
      action: "tournament.bracket.generate",
      entityType: "tournament",
      entityId: tournamentId,
    });

    const matches = await prisma.tournamentMatch.findMany({
      where: { tournamentId },
      include: {
        team1: { include: { player1: true, player2: true } },
        team2: { include: { player1: true, player2: true } },
        winnerTeam: { include: { player1: true, player2: true } },
      },
      orderBy: [{ round: "asc" }, { slot: "asc" }],
    });

    log.info({ tournamentId, matches: matches.length }, "Pair bracket generated");
    return NextResponse.json({ matches });
  } catch (error) {
    log.error({ error }, "Bracket generation failed");
    const message =
      error instanceof Error ? error.message : "Не удалось сформировать сетку";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const log = createRequestLogger(randomUUID());
  try {
    const data = matchWinnerSchema.parse(await request.json());

    const match = await prisma.tournamentMatch.findUnique({
      where: { id: data.matchId },
      include: { tournament: true },
    });
    if (!match) {
      return NextResponse.json({ error: "Матч не найден" }, { status: 404 });
    }
    if (!match.team1Id || !match.team2Id) {
      return NextResponse.json({ error: "Матч ещё не готов" }, { status: 400 });
    }

    await advanceWinner(prisma, data.matchId, data.winnerTeamId);

    const finalMatch = await prisma.tournamentMatch.findUnique({
      where: { id: data.matchId },
      include: {
        team1: { include: { player1: true, player2: true } },
        team2: { include: { player1: true, player2: true } },
        winnerTeam: { include: { player1: true, player2: true } },
      },
    });

    const totalRounds = await prisma.tournamentMatch.groupBy({
      by: ["round"],
      where: { tournamentId: match.tournamentId },
    });
    const maxRound = Math.max(...totalRounds.map((r) => r.round), 0);
    if (
      match.tournament.format === "PAIR_OLYMPIC" &&
      match.round === maxRound
    ) {
      await prisma.tournament.update({
        where: { id: match.tournamentId },
        data: { status: "FINISHED" },
      });
    }

    await writeAuditLog({
      actorType: "club",
      action: "tournament.match.result",
      entityType: "tournament_match",
      entityId: data.matchId,
      payload: { winnerTeamId: data.winnerTeamId },
    });

    return NextResponse.json(finalMatch);
  } catch (error) {
    log.error({ error }, "Match result failed");
    const message =
      error instanceof Error ? error.message : "Не удалось сохранить результат";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
