import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { auditBookingStatusSummary } from "@/lib/audit-display";
import { authErrorResponse, getCurrentPlayer } from "@/lib/auth";
import { requireClubManageAccess } from "@/lib/club-manage";
import {
  notifyPlayerBookingCancelledByClub,
  notifyPlayerBookingConfirmed,
  notifyPlayerBookingRejected,
} from "@/lib/player-booking-notify";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { bookingStatusSchema } from "@/lib/validators";

const clubBookingPatchSchema = z
  .object({
    status: z.enum(["CONFIRMED", "REJECTED", "CANCELLED"]).optional(),
    clubNote: z.string().max(500).nullable().optional(),
  })
  .refine((b) => b.status !== undefined || b.clubNote !== undefined, {
    message: "Нет данных для обновления",
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bookingId: string }> },
) {
  try {
    const { id: clubId, bookingId } = await params;
    const body = await request.json();
    const parsed = clubBookingPatchSchema.parse(body);
    const status = parsed.status;

    const booking = await prisma.tableBooking.findFirst({
      where: { id: bookingId, clubId },
    });
    if (!booking) {
      return NextResponse.json({ error: "Бронь не найдена" }, { status: 404 });
    }

    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
    }

    const isOwner = booking.playerId === player.id;
    let isClubManager = false;
    try {
      await requireClubManageAccess(clubId);
      isClubManager = true;
    } catch {
      isClubManager = false;
    }

    if (parsed.clubNote !== undefined && !isClubManager) {
      return NextResponse.json({ error: "Заметку клуба может менять только управляющий" }, { status: 403 });
    }

    if (status) {
      if (status === "CANCELLED") {
        if (!isOwner && !isClubManager) {
          return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
        }
        if (isOwner && !isClubManager && booking.startsAt <= new Date()) {
          return NextResponse.json({ error: "Нельзя отменить прошедшую бронь" }, { status: 400 });
        }
      } else if (!isClubManager) {
        return NextResponse.json({ error: "Подтверждать брони может клуб" }, { status: 403 });
      }

      if (booking.status === "CANCELLED" || booking.status === "REJECTED") {
        return NextResponse.json({ error: "Бронь уже закрыта" }, { status: 400 });
      }
    }

    const updated = await prisma.tableBooking.update({
      where: { id: bookingId },
      data: {
        ...(status !== undefined && { status }),
        ...(parsed.clubNote !== undefined && { clubNote: parsed.clubNote }),
      },
      include: {
        club: { select: { name: true } },
        player: { select: { firstName: true, lastName: true, phone: true } },
      },
    });

    await writeAuditLog({
      actorType: "club",
      actorId: player.id,
      action: status ? `table_booking.${status.toLowerCase()}` : "table_booking.note",
      entityType: "table_booking",
      entityId: bookingId,
      section: "bookings",
      clubId,
      summary: status
        ? auditBookingStatusSummary(status)
        : "Обновлена заметка клуба",
    });

    if (status && updated.playerId) {
      if (status === "CONFIRMED") {
        void notifyPlayerBookingConfirmed(bookingId);
      } else if (status === "REJECTED") {
        void notifyPlayerBookingRejected(bookingId);
      } else if (status === "CANCELLED" && isClubManager && !isOwner) {
        void notifyPlayerBookingCancelledByClub(bookingId);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось обновить бронь" }, { status: 500 });
  }
}
