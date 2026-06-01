import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { generateTournamentPairing, cancelMatchResult, saveMatchResult } from "@/lib/bracket-service";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  requireMatchManageAccess,
  requireTournamentManageAccess,
  tournamentManageActorType,
} from "@/lib/tournament-manage";
import { matchCancelSchema, matchResultSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const log = createRequestLogger(randomUUID());
  try {
    const { tournamentId } = await request.json();
    if (!tournamentId) {
      return NextResponse.json({ error: "Укажите турнир" }, { status: 400 });
    }

    const { session } = await requireTournamentManageAccess(tournamentId);

    await generateTournamentPairing(prisma, tournamentId);

    await writeAuditLog({
      actorType: tournamentManageActorType(session),
      actorId: session.playerId,
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
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    const message =
      error instanceof Error ? error.message : "Не удалось сформировать сетку";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const log = createRequestLogger(randomUUID());
  try {
    const data = matchResultSchema.parse(await request.json());
    const { session } = await requireMatchManageAccess(data.matchId);
    const match = await saveMatchResult(prisma, data);

    await writeAuditLog({
      actorType: tournamentManageActorType(session),
      actorId: session.playerId,
      action: "tournament.match.result",
      entityType: "tournament_match",
      entityId: data.matchId,
      payload: {
        winnerTeamId: data.winnerTeamId,
        team1Score: data.team1Score,
        team2Score: data.team2Score,
      },
    });

    return NextResponse.json(match);
  } catch (error) {
    log.error({ error }, "Match result failed");
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    const message =
      error instanceof Error ? error.message : "Не удалось сохранить результат";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const log = createRequestLogger(randomUUID());
  try {
    const data = matchCancelSchema.parse(await request.json());
    const { session } = await requireMatchManageAccess(data.matchId);
    const match = await cancelMatchResult(prisma, data.matchId);

    await writeAuditLog({
      actorType: tournamentManageActorType(session),
      actorId: session.playerId,
      action: "tournament.match.cancel",
      entityType: "tournament_match",
      entityId: data.matchId,
    });

    return NextResponse.json(match);
  } catch (error) {
    log.error({ error }, "Match cancel failed");
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    const message =
      error instanceof Error ? error.message : "Не удалось отменить результат";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
