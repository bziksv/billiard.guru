import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { authErrorResponse } from "@/lib/auth";
import { validateClubManageBooking } from "@/lib/club-bookings-manage";
import { requireClubManageAccess } from "@/lib/club-manage";
import { parseFloorPlan } from "@/lib/club-floor-plan";
import { prisma } from "@/lib/prisma";
import { normalizePhoneForCity } from "@/lib/phone-server";
import {
  ACTIVE_BOOKING_STATUSES,
  type ClubBookingContext,
} from "@/lib/table-booking";
import type { ClubTableFormatId } from "@/lib/club-table-formats";
import { ZodError } from "zod";
import { bookingManageCreateSchema } from "@/lib/validators";

function clubBookingContext(club: {
  id: string;
  bookingEnabled: boolean;
  bookingSlotMinutes: number;
  bookingAdvanceDays: number;
  weeklyHours: unknown;
  workingHours: string | null;
  tableCounts: unknown;
  floorPlan: unknown;
}): ClubBookingContext {
  return {
    id: club.id,
    bookingEnabled: club.bookingEnabled,
    bookingSlotMinutes: club.bookingSlotMinutes,
    bookingAdvanceDays: club.bookingAdvanceDays,
    weeklyHours: club.weeklyHours,
    workingHours: club.workingHours,
    tableCounts: club.tableCounts,
    floorPlan: club.floorPlan,
  };
}

const bookingSelect = {
  tableFormat: true,
  startsAt: true,
  endsAt: true,
  status: true,
  playerId: true,
  floorItemId: true,
  kind: true,
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: clubId } = await params;
    await requireClubManageAccess(clubId);
    const phone = request.nextUrl.searchParams.get("phone")?.trim();
    if (!phone || phone.length < 6) {
      return NextResponse.json({ players: [] });
    }

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { cityId: true },
    });
    if (!club) {
      return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
    }

    const normalized = await normalizePhoneForCity(phone, club.cityId);
    if (normalized.error || !normalized.e164) {
      return NextResponse.json({ players: [] });
    }

    const players = await prisma.player.findMany({
      where: {
        OR: [
          { phone: normalized.e164 },
          { phone: { contains: phone.replace(/\D/g, "").slice(-10) } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, phone: true },
      take: 8,
    });

    return NextResponse.json({ players });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Ошибка поиска" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: clubId } = await params;
    const { player: actor } = await requireClubManageAccess(clubId);
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
    }

    const body = await request.json();
    const data = bookingManageCreateSchema.parse(body);
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    const ctx = clubBookingContext(club);
    const floorPlan = parseFloorPlan(club.floorPlan);

    const rangeStart = new Date(startsAt.getTime() - 24 * 60 * 60_000);
    const rangeEnd = new Date(endsAt.getTime() + 24 * 60 * 60_000);
    const existing = await prisma.tableBooking.findMany({
      where: {
        clubId,
        startsAt: { gte: rangeStart, lte: rangeEnd },
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
      select: bookingSelect,
    });

    const validationError = validateClubManageBooking(
      ctx,
      data.kind,
      data.tableFormat as ClubTableFormatId,
      startsAt,
      endsAt,
      existing,
      data.floorItemId,
      floorPlan,
    );
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    let playerId: string | null = data.playerId ?? null;
    let guestName = data.guestName?.trim() || null;
    let guestPhone = data.guestPhone?.trim() || null;

    if (data.kind === "CLUB") {
      if (!playerId && !guestName && !guestPhone) {
        return NextResponse.json(
          { error: "Укажите игрока или имя и телефон гостя" },
          { status: 400 },
        );
      }
      if (guestPhone && !playerId) {
        const norm = await normalizePhoneForCity(guestPhone, club.cityId);
        if (norm.e164) {
          guestPhone = norm.e164;
          const found = await prisma.player.findUnique({ where: { phone: norm.e164 } });
          if (found) playerId = found.id;
        }
      }
    }

    if (data.kind === "BLOCK" && !data.clubNote?.trim()) {
      return NextResponse.json({ error: "Укажите причину блокировки" }, { status: 400 });
    }

    const booking = await prisma.tableBooking.create({
      data: {
        clubId,
        kind: data.kind,
        playerId: data.kind === "BLOCK" ? null : playerId,
        guestName: data.kind === "BLOCK" ? null : guestName,
        guestPhone: data.kind === "BLOCK" ? null : guestPhone,
        tableFormat: data.tableFormat,
        floorItemId: data.floorItemId || null,
        startsAt,
        endsAt,
        playerNote: data.playerNote || null,
        clubNote: data.clubNote || null,
        status: "CONFIRMED",
      },
      include: {
        player: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    await writeAuditLog({
      actorType: "club",
      actorId: actor?.id ?? clubId,
      action: `table_booking.manage.${data.kind.toLowerCase()}`,
      entityType: "table_booking",
      entityId: booking.id,
      section: "bookings",
      clubId,
      summary:
        data.kind === "BLOCK"
          ? "Блокировка слота"
          : `Ручная бронь · ${booking.tableFormat}`,
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof ZodError) {
      const first = error.issues[0];
      const field = first?.path.join(".") ?? "";
      const msg = first?.message ?? "Ошибка валидации";
      return NextResponse.json(
        { error: field ? `${field}: ${msg}` : msg },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Не удалось создать запись" }, { status: 500 });
  }
}
