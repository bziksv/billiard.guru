import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  isPairFormat,
  normalizePlayerPair,
  teamLabel,
} from "@/lib/pair-tournament";
import { tournamentTeamSchema, tournamentTeamUpdateSchema } from "@/lib/validators";

async function findPlayerTeamConflict(
  tournamentId: string,
  playerIds: [string, string],
) {
  return prisma.tournamentTeam.findFirst({
    where: {
      tournamentId,
      status: { not: "CANCELLED" },
      OR: [
        { player1Id: { in: playerIds } },
        { player2Id: { in: playerIds } },
      ],
    },
  });
}

export async function POST(request: NextRequest) {
  const log = createRequestLogger(randomUUID());
  try {
    const body = await request.json();
    const data = tournamentTeamSchema.parse(body);

    const tournament = await prisma.tournament.findUnique({
      where: { id: data.tournamentId },
    });
    if (!tournament) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }
    if (!isPairFormat(tournament.format)) {
      return NextResponse.json(
        { error: "Этот турнир не парный — регистрируйте игрока по одному" },
        { status: 400 },
      );
    }

    const [player1Id, player2Id] = normalizePlayerPair(
      data.player1Id,
      data.player2Id,
    );

    const players = await prisma.player.findMany({
      where: { id: { in: [player1Id, player2Id] } },
    });
    if (players.length !== 2) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const duplicatePair = await prisma.tournamentTeam.findFirst({
      where: {
        tournamentId: data.tournamentId,
        player1Id,
        player2Id,
        status: { not: "CANCELLED" },
      },
    });
    if (duplicatePair && duplicatePair.status !== "CANCELLED") {
      return NextResponse.json({ error: "Эта пара уже зарегистрирована" }, { status: 409 });
    }

    const conflict = await findPlayerTeamConflict(data.tournamentId, [
      player1Id,
      player2Id,
    ]);
    if (conflict) {
      return NextResponse.json(
        { error: "Один из игроков уже состоит в другой команде на этом турнире" },
        { status: 409 },
      );
    }

    const team = await prisma.tournamentTeam.create({
      data: {
        tournamentId: data.tournamentId,
        player1Id,
        player2Id,
        name: data.name || null,
        clubId: data.clubId ?? null,
        source: data.source,
        status: "PENDING",
      },
      include: {
        player1: true,
        player2: true,
        club: true,
      },
    });

    await writeAuditLog({
      actorType: data.source === "CLUB" ? "club" : "player",
      actorId: data.clubId ?? player1Id,
      action: "tournament.team.register",
      entityType: "tournament_team",
      entityId: team.id,
      payload: { label: teamLabel(team) },
    });

    log.info({ teamId: team.id }, "Pair team registered");
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    log.error({ error }, "Team registration failed");
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 });
    }
    return NextResponse.json({ error: "Ошибка регистрации команды" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const data = tournamentTeamUpdateSchema.parse(body);

    const existing = await prisma.tournamentTeam.findUnique({
      where: { id: data.id },
      include: { tournament: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
    }

    const matchCount = await prisma.tournamentMatch.count({
      where: { tournamentId: existing.tournamentId },
    });

    if (data.player1Id && data.player2Id) {
      const session = await requireSuperAdmin();
      if (matchCount > 0) {
        return NextResponse.json(
          { error: "Нельзя менять состав после формирования сетки" },
          { status: 400 },
        );
      }

      const [player1Id, player2Id] = normalizePlayerPair(
        data.player1Id,
        data.player2Id,
      );

      const players = await prisma.player.findMany({
        where: { id: { in: [player1Id, player2Id] } },
      });
      if (players.length !== 2) {
        return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
      }

      const duplicatePair = await prisma.tournamentTeam.findFirst({
        where: {
          tournamentId: existing.tournamentId,
          player1Id,
          player2Id,
          id: { not: existing.id },
          status: { not: "CANCELLED" },
        },
      });
      if (duplicatePair) {
        return NextResponse.json({ error: "Эта пара уже зарегистрирована" }, { status: 409 });
      }

      const conflict = await prisma.tournamentTeam.findFirst({
        where: {
          tournamentId: existing.tournamentId,
          id: { not: existing.id },
          status: { not: "CANCELLED" },
          OR: [{ player1Id: { in: [player1Id, player2Id] } }, { player2Id: { in: [player1Id, player2Id] } }],
        },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "Один из игроков уже в другой команде" },
          { status: 409 },
        );
      }

      const team = await prisma.tournamentTeam.update({
        where: { id: data.id },
        data: {
          player1Id,
          player2Id,
          ...(data.name !== undefined && { name: data.name || null }),
        },
        include: { player1: true, player2: true, tournament: true },
      });

      await writeAuditLog({
        actorType: "admin",
        actorId: session.playerId,
        action: "tournament.team.update",
        entityType: "tournament_team",
        entityId: team.id,
        payload: { label: teamLabel(team) },
      });

      return NextResponse.json(team);
    }

    if (data.status) {
      if (data.status === "CANCELLED") {
        await requireSuperAdmin();
        if (matchCount > 0) {
          const inMatch = await prisma.tournamentMatch.findFirst({
            where: {
              tournamentId: existing.tournamentId,
              OR: [
                { team1Id: existing.id },
                { team2Id: existing.id },
              ],
            },
          });
          if (inMatch) {
            return NextResponse.json(
              { error: "Нельзя удалить команду, которая уже в сетке" },
              { status: 400 },
            );
          }
        }
      }

      const team = await prisma.tournamentTeam.update({
        where: { id: data.id },
        data: {
          status: data.status,
          confirmedAt: data.status === "CONFIRMED" ? new Date() : null,
        },
        include: { player1: true, player2: true, tournament: true },
      });

      await writeAuditLog({
        actorType: "club",
        actorId: team.clubId ?? team.player1Id,
        action: `tournament.team.${data.status.toLowerCase()}`,
        entityType: "tournament_team",
        entityId: team.id,
      });

      return NextResponse.json(team);
    }

    return NextResponse.json({ error: "Нечего обновлять" }, { status: 400 });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 500 });
  }
}
