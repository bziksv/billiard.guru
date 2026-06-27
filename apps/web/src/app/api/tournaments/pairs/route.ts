import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { normalizePlayerPair, teamLabel } from "@/lib/pair-tournament";
import {
  requireTournamentManageAccess,
  tournamentManageActorType,
} from "@/lib/tournament-manage";
import { canOrganizerRegisterParticipants } from "@/lib/tournament-registration";

/**
 * Сборка пар для парного турнира (флаг isPair поверх обычной сетки).
 * Регистрация идёт по одному игроку (TournamentRegistration); здесь организатор
 * объединяет двух зарегистрированных игроков в TournamentTeam (player1 + player2).
 */
export async function POST(request: NextRequest) {
  const log = createRequestLogger(randomUUID());
  try {
    const body = await request.json();
    const tournamentId = String(body.tournamentId ?? "");
    if (!tournamentId || !body.player1Id || !body.player2Id) {
      return NextResponse.json(
        { error: "Укажите турнир и двух игроков" },
        { status: 400 },
      );
    }

    const { session } = await requireTournamentManageAccess(tournamentId);

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }
    if (!tournament.isPair) {
      return NextResponse.json(
        { error: "Этот турнир не парный" },
        { status: 400 },
      );
    }

    const bracketFormed =
      (await prisma.tournamentMatch.count({ where: { tournamentId } })) > 0;
    if (!canOrganizerRegisterParticipants(tournament.status, bracketFormed)) {
      return NextResponse.json(
        { error: "Сборка пар сейчас недоступна" },
        { status: 400 },
      );
    }

    const [player1Id, player2Id] = normalizePlayerPair(
      String(body.player1Id),
      String(body.player2Id),
    );

    const regs = await prisma.tournamentRegistration.findMany({
      where: {
        tournamentId,
        playerId: { in: [player1Id, player2Id] },
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
      select: { playerId: true },
    });
    if (regs.length !== 2) {
      return NextResponse.json(
        { error: "Оба игрока должны быть в заявках турнира" },
        { status: 400 },
      );
    }

    const conflict = await prisma.tournamentTeam.findFirst({
      where: {
        tournamentId,
        status: { not: "CANCELLED" },
        OR: [
          { player1Id: { in: [player1Id, player2Id] } },
          { player2Id: { in: [player1Id, player2Id] } },
        ],
      },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Один из игроков уже в паре" },
        { status: 409 },
      );
    }

    const team = await prisma.tournamentTeam.create({
      data: {
        tournamentId,
        player1Id,
        player2Id,
        clubId: tournament.clubId,
        source: "CLUB",
        status: "CONFIRMED",
        feePaid: true,
        confirmedAt: new Date(),
      },
      include: { player1: true, player2: true, club: true },
    });

    await writeAuditLog({
      actorType: tournamentManageActorType(session),
      actorId: session.playerId,
      action: "tournament.pair.create",
      entityType: "tournament_team",
      entityId: team.id,
      payload: { label: teamLabel(team) },
    });

    log.info({ teamId: team.id }, "Pair assembled");
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    log.error({ error }, "Pair assembly failed");
    if (error instanceof Error && error.message) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось собрать пару" }, { status: 500 });
  }
}

/**
 * Переопределить (или сбросить) рейтинг пары. До старта — влияет на посев;
 * во время турнира — на фору в предстоящих/текущих встречах (правка «сандбэггеров»,
 * занизивших рейтинг). Менять можно и после формирования сетки.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const teamId = String(body.teamId ?? "");
    if (!teamId) {
      return NextResponse.json({ error: "Укажите пару" }, { status: 400 });
    }

    let ratingOverride: number | null;
    if (body.ratingOverride === null || body.ratingOverride === "") {
      ratingOverride = null;
    } else {
      const value = Number(body.ratingOverride);
      if (!Number.isFinite(value) || value < 0 || value > 100000) {
        return NextResponse.json(
          { error: "Некорректный рейтинг пары" },
          { status: 400 },
        );
      }
      // Рейтинг и фора всегда кратны 0,5 — привязываем к шагу 0,5.
      ratingOverride = Math.max(0, Math.round(value * 2) / 2);
    }

    const team = await prisma.tournamentTeam.findUnique({
      where: { id: teamId },
    });
    if (!team) {
      return NextResponse.json({ error: "Пара не найдена" }, { status: 404 });
    }

    const { session } = await requireTournamentManageAccess(team.tournamentId);

    const updated = await prisma.tournamentTeam.update({
      where: { id: teamId },
      data: { ratingOverride },
      include: { player1: true, player2: true, club: true },
    });

    await writeAuditLog({
      actorType: tournamentManageActorType(session),
      actorId: session.playerId,
      action: "tournament.pair.rating",
      entityType: "tournament_team",
      entityId: teamId,
      payload: { ratingOverride },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json(
      { error: "Не удалось изменить рейтинг пары" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const teamId = String(body.teamId ?? "");
    if (!teamId) {
      return NextResponse.json({ error: "Укажите пару" }, { status: 400 });
    }

    const team = await prisma.tournamentTeam.findUnique({
      where: { id: teamId },
    });
    if (!team) {
      return NextResponse.json({ error: "Пара не найдена" }, { status: 404 });
    }

    const { session } = await requireTournamentManageAccess(team.tournamentId);

    const inMatch = await prisma.tournamentMatch.findFirst({
      where: {
        tournamentId: team.tournamentId,
        OR: [{ team1Id: teamId }, { team2Id: teamId }],
      },
    });
    if (inMatch) {
      return NextResponse.json(
        { error: "Нельзя расформировать пару, которая уже в сетке" },
        { status: 400 },
      );
    }

    await prisma.tournamentTeam.delete({ where: { id: teamId } });

    await writeAuditLog({
      actorType: tournamentManageActorType(session),
      actorId: session.playerId,
      action: "tournament.pair.delete",
      entityType: "tournament_team",
      entityId: teamId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json(
      { error: "Не удалось расформировать пару" },
      { status: 500 },
    );
  }
}
