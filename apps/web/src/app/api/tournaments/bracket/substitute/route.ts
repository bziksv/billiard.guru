import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  ensureIncomingSoloTeam,
  listSubstituteCandidates,
  substituteTeamInMatch,
} from "@/lib/bracket-substitute";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  requireTournamentManageAccess,
  tournamentManageActorType,
} from "@/lib/tournament-manage";
import { bracketSubstituteSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const tournamentId = request.nextUrl.searchParams.get("tournamentId");
    if (!tournamentId) {
      return NextResponse.json({ error: "Укажите tournamentId" }, { status: 400 });
    }
    await requireTournamentManageAccess(tournamentId);

    const excludeTeamIds = request.nextUrl.searchParams
      .getAll("excludeTeamId")
      .filter(Boolean);

    const candidates = await listSubstituteCandidates(prisma, tournamentId, {
      excludeTeamIds,
    });
    return NextResponse.json({ candidates });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    const message =
      error instanceof Error ? error.message : "Не удалось загрузить кандидатов";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const log = createRequestLogger(randomUUID());
  try {
    const data = bracketSubstituteSchema.parse(await request.json());
    const { session } = await requireTournamentManageAccess(data.tournamentId);

    const tournament = await prisma.tournament.findUnique({
      where: { id: data.tournamentId },
    });
    if (!tournament) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    const match = await prisma.tournamentMatch.findUnique({
      where: { id: data.matchId },
      select: { tournamentId: true },
    });
    if (!match || match.tournamentId !== data.tournamentId) {
      return NextResponse.json({ error: "Матч не найден в этом турнире" }, { status: 404 });
    }

    let teamId = data.teamId ?? null;
    if (!teamId && data.playerId) {
      const ensured = await ensureIncomingSoloTeam(
        prisma,
        data.tournamentId,
        data.playerId,
      );
      teamId = ensured.teamId;
    }

    if (!teamId) {
      return NextResponse.json({ error: "Укажите teamId или playerId" }, { status: 400 });
    }

    const result = await substituteTeamInMatch(prisma, {
      matchId: data.matchId,
      side: data.side,
      incomingTeamId: teamId,
    });

    await writeAuditLog({
      actorType: tournamentManageActorType(session),
      actorId: session.playerId,
      action: "tournament.bracket.substitute",
      entityType: "tournament_match",
      entityId: result.matchId,
      payload: {
        side: data.side,
        outgoingTeamId: result.outgoingTeamId,
        incomingTeamId: result.incomingTeamId,
        rewrittenMatchIds: result.rewrittenMatchIds,
        playerId: data.playerId ?? null,
      },
    });

    log.info(
      {
        tournamentId: data.tournamentId,
        matchId: result.matchId,
        outgoingTeamId: result.outgoingTeamId,
        incomingTeamId: result.incomingTeamId,
      },
      "Player substituted in unfinished bracket matches",
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    log.error({ error }, "Bracket substitute failed");
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Не удалось заменить игрока";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
