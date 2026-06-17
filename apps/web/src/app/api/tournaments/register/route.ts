import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import {
  authErrorResponse,
  getCurrentPlayer,
} from "@/lib/auth";
import { playerCanManageClub } from "@/lib/club-staff";
import { prisma } from "@/lib/prisma";
import { buildConfirmLink } from "@/lib/telegram";
import { requireTournamentManageAccess, tournamentManageActorType } from "@/lib/tournament-manage";
import {
  canCancelRegistration,
  isTournamentRegistrationOpen,
} from "@/lib/tournament-registration";
import { reopenTournamentIfBracketEmpty } from "@/lib/tournament-registration-server";
import {
  notifyTournamentRegisteredByClub,
  notifyTournamentRegistrationConfirmed,
  notifyTournamentRegistrationRejected,
  notifyTournamentSelfRegistered,
} from "@/lib/tournament-registration-notify";
import { assertCanAddTournamentParticipants } from "@/lib/tournament-participant-limit-server";
import { assertPlayerEligibleForTournamentRating } from "@/lib/tournament-rating-limit-server";
import { tournamentRegistrationPatchSchema, tournamentRegistrationSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = tournamentRegistrationSchema.parse(body);

    const { session } = await requireTournamentManageAccess(data.tournamentId);

    await reopenTournamentIfBracketEmpty(data.tournamentId);

    const tournament = await prisma.tournament.findUnique({
      where: { id: data.tournamentId },
    });
    const bracketFormed =
      (await prisma.tournamentMatch.count({
        where: { tournamentId: data.tournamentId },
      })) > 0;
    if (!tournament || !isTournamentRegistrationOpen(tournament.status, bracketFormed)) {
      return NextResponse.json(
        { error: "Регистрация на турнир недоступна" },
        { status: 400 },
      );
    }

    const player = await prisma.player.findUnique({ where: { id: data.playerId } });
    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const ratingCheck = await assertPlayerEligibleForTournamentRating(
      data.playerId,
      tournament,
    );
    if (!ratingCheck.ok) {
      return NextResponse.json({ error: ratingCheck.error }, { status: 400 });
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
        await assertCanAddTournamentParticipants(data.tournamentId, 1);
        const registration = await prisma.tournamentRegistration.update({
          where: { id: existing.id },
          data: {
            status: "PENDING",
            source: data.source,
            clubId: data.clubId ?? null,
            confirmedAt: null,
            feePaid: false,
          },
          include: {
            player: { include: { city: { include: { country: true } } } },
            tournament: true,
          },
        });
        await writeAuditLog({
          actorType: tournamentManageActorType(session),
          actorId: session.playerId,
          action: "tournament.register",
          entityType: "tournament_registration",
          entityId: registration.id,
        });
        if (data.source === "CLUB") {
          await notifyTournamentRegisteredByClub(registration.id);
        } else if (data.source === "SELF") {
          await notifyTournamentSelfRegistered(registration.id);
        }
        const confirmLink = player.confirmToken
          ? buildConfirmLink(player.confirmToken)
          : null;
        return NextResponse.json({ ...registration, confirmLink }, { status: 200 });
      }
      return NextResponse.json({ error: "Игрок уже зарегистрирован" }, { status: 409 });
    }

    await assertCanAddTournamentParticipants(data.tournamentId, 1);

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
      actorType: data.source === "CLUB" ? "club" : tournamentManageActorType(session),
      actorId: data.clubId ?? session.playerId,
      action: "tournament.register",
      entityType: "tournament_registration",
      entityId: registration.id,
    });

    if (data.source === "CLUB") {
      await notifyTournamentRegisteredByClub(registration.id);
    } else if (data.source === "SELF") {
      await notifyTournamentSelfRegistered(registration.id);
    }

    const confirmLink = player.confirmToken
      ? buildConfirmLink(player.confirmToken)
      : null;

    return NextResponse.json({ ...registration, confirmLink }, { status: 201 });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error && error.message !== "Турнир не найден") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Ошибка регистрации" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const body = await request.json();
    const data = tournamentRegistrationPatchSchema.parse(body);

    const existing = await prisma.tournamentRegistration.findUnique({
      where: { id: data.id },
      include: {
        tournament: { include: { club: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    const isOrganizer =
      player.role === "SUPERADMIN" ||
      (await playerCanManageClub(existing.tournament.club, player));

    if (data.feePaid !== undefined && data.status === undefined) {
      if (!isOrganizer) {
        return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
      }
      const registration = await prisma.tournamentRegistration.update({
        where: { id: data.id },
        data: { feePaid: data.feePaid },
        include: { player: true, tournament: true },
      });
      return NextResponse.json(registration);
    }

    const { status } = data;
    if (!status) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }

    await reopenTournamentIfBracketEmpty(existing.tournamentId);

    if (["CANCELLED", "REJECTED"].includes(existing.status) && status !== "CONFIRMED") {
      return NextResponse.json({ error: "Заявка уже закрыта" }, { status: 400 });
    }

    const isOwner = existing.playerId === player.id;

    const bracketFormed =
      (await prisma.tournamentMatch.count({
        where: { tournamentId: existing.tournamentId },
      })) > 0;

    if (status === "CANCELLED") {
      if (bracketFormed) {
        return NextResponse.json(
          { error: "Нельзя снять участника после формирования сетки" },
          { status: 400 },
        );
      }
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
      if (
        !isTournamentRegistrationOpen(existing.tournament.status, bracketFormed) &&
        status === "CONFIRMED"
      ) {
        return NextResponse.json(
          { error: "Подтверждать новых участников можно только пока сетка не сформирована" },
          { status: 400 },
        );
      }
      if (status === "CONFIRMED") {
        const feeOk = data.feePaid === true || existing.feePaid;
        if (!feeOk) {
          return NextResponse.json(
            { error: "Отметьте «Сдал взнос» перед подтверждением" },
            { status: 400 },
          );
        }
      }
    } else {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }

    const registration = await prisma.tournamentRegistration.update({
      where: { id: data.id },
      data: {
        status,
        confirmedAt: status === "CONFIRMED" ? new Date() : null,
        ...(status === "CONFIRMED"
          ? { feePaid: true }
          : status === "REJECTED" || status === "CANCELLED"
            ? { feePaid: false }
            : {}),
      },
      include: { player: true, tournament: true },
    });

    if (status === "CANCELLED" || status === "REJECTED") {
      await prisma.tournamentTeam.updateMany({
        where: {
          tournamentId: existing.tournamentId,
          player1Id: existing.playerId,
          status: "CONFIRMED",
        },
        data: { status: "CANCELLED" },
      });
    }

    await writeAuditLog({
      actorType: isOwner && status === "CANCELLED" ? "player" : isOrganizer ? "club" : "admin",
      actorId: player.id,
      action: `tournament.registration.${status.toLowerCase()}`,
      entityType: "tournament_registration",
      entityId: registration.id,
    });

    if (status === "CONFIRMED") {
      await notifyTournamentRegistrationConfirmed(registration.id);
    } else if (status === "REJECTED") {
      await notifyTournamentRegistrationRejected(registration.id);
    }

    return NextResponse.json(registration);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 500 });
  }
}
