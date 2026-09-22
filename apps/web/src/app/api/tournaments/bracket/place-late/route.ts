import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  listVacantRoundOneSlots,
  placeTeamIntoMatchSlot,
} from "@/lib/bracket-late-place";
import { syncSoloTeamsForTournament } from "@/lib/bracket-service";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  requireTournamentManageAccess,
  tournamentManageActorType,
} from "@/lib/tournament-manage";
import { bracketPlaceLateSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const tournamentId = request.nextUrl.searchParams.get("tournamentId");
    if (!tournamentId) {
      return NextResponse.json({ error: "Укажите tournamentId" }, { status: 400 });
    }
    await requireTournamentManageAccess(tournamentId, { readOnly: true });
    const slots = await listVacantRoundOneSlots(prisma, tournamentId);
    return NextResponse.json({ slots });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    const message =
      error instanceof Error ? error.message : "Не удалось загрузить слоты";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const log = createRequestLogger(randomUUID());
  try {
    const data = bracketPlaceLateSchema.parse(await request.json());
    const { session } = await requireTournamentManageAccess(data.tournamentId);

    const tournament = await prisma.tournament.findUnique({
      where: { id: data.tournamentId },
    });
    if (!tournament) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    let teamId = data.teamId ?? null;
    if (!teamId && data.playerId) {
      await syncSoloTeamsForTournament(prisma, tournament);
      const team = await prisma.tournamentTeam.findFirst({
        where: {
          tournamentId: data.tournamentId,
          player1Id: data.playerId,
          status: "CONFIRMED",
        },
        select: { id: true },
      });
      if (!team) {
        return NextResponse.json(
          { error: "Подтверждённая команда игрока не найдена" },
          { status: 400 },
        );
      }
      teamId = team.id;
    }

    if (!teamId) {
      return NextResponse.json({ error: "Укажите teamId или playerId" }, { status: 400 });
    }

    const result = await placeTeamIntoMatchSlot(prisma, {
      matchId: data.matchId,
      teamId,
    });

    await writeAuditLog({
      actorType: tournamentManageActorType(session),
      actorId: session.playerId,
      action: "tournament.bracket.place_late",
      entityType: "tournament_match",
      entityId: result.matchId,
      payload: { teamId: result.teamId },
    });

    log.info(
      { tournamentId: data.tournamentId, matchId: result.matchId, teamId: result.teamId },
      "Late participant placed into bye slot",
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    log.error({ error }, "Place late into bracket failed");
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Не удалось посадить в сетку";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
