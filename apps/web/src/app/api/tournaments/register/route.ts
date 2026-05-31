import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import {
  authErrorResponse,
  getCurrentPlayer,
  requireSuperAdmin,
} from "@/lib/auth";
import { clubOwnedByPlayer } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";
import { buildConfirmLink } from "@/lib/telegram";
import { canCancelRegistration } from "@/lib/tournament-registration";
import { tournamentRegistrationSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const data = tournamentRegistrationSchema.parse(body);

    const tournament = await prisma.tournament.findUnique({
      where: { id: data.tournamentId },
    });
    if (!tournament || tournament.status !== "OPEN") {
      return NextResponse.json(
        { error: "Регистрация на турнир недоступна" },
        { status: 400 },
      );
    }

    const player = await prisma.player.findUnique({ where: { id: data.playerId } });
    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const existing = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId: data.tournamentId,
          playerId: data.playerId,
        },
      },
    });
    if (existing) {
      if (existing.status === "CANCELLED") {
        const registration = await prisma.tournamentRegistration.update({
          where: { id: existing.id },
          data: {
            status: "PENDING",
            source: data.source,
            clubId: data.clubId ?? null,
            confirmedAt: null,
          },
          include: {
            player: { include: { city: { include: { country: true } } } },
            tournament: true,
          },
        });
        await writeAuditLog({
          actorType: "admin",
          actorId: data.playerId,
          action: "tournament.register",
          entityType: "tournament_registration",
          entityId: registration.id,
        });
        const confirmLink = player.confirmToken
          ? buildConfirmLink(player.confirmToken)
          : null;
        return NextResponse.json({ ...registration, confirmLink }, { status: 200 });
      }
      return NextResponse.json({ error: "Игрок уже зарегистрирован" }, { status: 409 });
    }

    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId: data.tournamentId,
        playerId: data.playerId,
        clubId: data.clubId ?? null,
        source: data.source,
        status: "PENDING",
      },
      include: {
        player: { include: { city: { include: { country: true } } } },
        tournament: true,
      },
    });

    await writeAuditLog({
      actorType: data.source === "CLUB" ? "club" : "player",
      actorId: data.clubId ?? data.playerId,
      action: "tournament.register",
      entityType: "tournament_registration",
      entityId: registration.id,
    });

    const confirmLink = player.confirmToken
      ? buildConfirmLink(player.confirmToken)
      : null;

    return NextResponse.json({ ...registration, confirmLink }, { status: 201 });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Ошибка регистрации" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const { id, status } = await request.json();
    if (!id || !["CONFIRMED", "REJECTED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }

    const existing = await prisma.tournamentRegistration.findUnique({
      where: { id },
      include: {
        tournament: { include: { club: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    if (["CANCELLED", "REJECTED"].includes(existing.status) && status !== "CONFIRMED") {
      return NextResponse.json({ error: "Заявка уже закрыта" }, { status: 400 });
    }

    const isOwner = existing.playerId === player.id;
    const isOrganizer =
      player.role === "SUPERADMIN" ||
      clubOwnedByPlayer(existing.tournament.club, player);

    if (status === "CANCELLED") {
      if (isOwner) {
        if (!canCancelRegistration(existing.tournament.status, "player")) {
          return NextResponse.json(
            { error: "После начала турнира отменить участие может только организатор" },
            { status: 400 },
          );
        }
      } else if (isOrganizer) {
        if (!canCancelRegistration(existing.tournament.status, "organizer")) {
          return NextResponse.json(
            { error: "Нельзя снять участника с завершённого турнира" },
            { status: 400 },
          );
        }
      } else {
        return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
      }
    } else if (status === "CONFIRMED" || status === "REJECTED") {
      if (!isOrganizer) {
        return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
      }
      if (existing.tournament.status !== "OPEN" && status === "CONFIRMED") {
        return NextResponse.json(
          { error: "Подтверждать новых участников можно только до начала турнира" },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }

    const registration = await prisma.tournamentRegistration.update({
      where: { id },
      data: {
        status,
        confirmedAt: status === "CONFIRMED" ? new Date() : null,
      },
      include: { player: true, tournament: true },
    });

    await writeAuditLog({
      actorType: isOwner && status === "CANCELLED" ? "player" : isOrganizer ? "club" : "admin",
      actorId: player.id,
      action: `tournament.registration.${status.toLowerCase()}`,
      entityType: "tournament_registration",
      entityId: registration.id,
    });

    return NextResponse.json(registration);
  } catch {
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 500 });
  }
}
