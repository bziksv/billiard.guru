import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { authErrorResponse, getCurrentPlayer } from "@/lib/auth";
import { parseFloorPlan } from "@/lib/club-floor-plan";
import { requireClubManageAccess } from "@/lib/club-manage";
import type { ClubTableFormatId } from "@/lib/club-table-formats";
import {
  floorTableAvailability,
  floorTableLabel,
  floorTablesForFormat,
} from "@/lib/floor-plan-booking";
import { prisma } from "@/lib/prisma";
import {
  buildCalendarTableRows,
  buildDayKeys,
  bookingDayKey,
  ensureUnassignedRows,
  todayDayKey,
} from "@/lib/club-bookings-calendar";
import { computeBookingAnalytics } from "@/lib/club-bookings-stats";
import { mapManageBookingRow } from "@/lib/club-bookings-manage";
import { isClubOpenOnDay } from "@/lib/club-bookings-open-hours";
import { notifyClubNewBooking } from "@/lib/club-booking-notify";
import { resolveWeeklyHours } from "@/lib/club-schedule";
import {
  ACTIVE_BOOKING_STATUSES,
  bookingStepMinutes,
  buildBookingSlots,
  durationOptionsForSlot,
  type ClubBookingContext,
  validateBookingRequest,
} from "@/lib/table-booking";
import { bookingCreateSchema } from "@/lib/validators";

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

const bookingInclude = {
  player: { select: { id: true, firstName: true, lastName: true, phone: true } },
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const club = await prisma.club.findUnique({ where: { id } });
  if (!club) {
    return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
  }

  const floorPlan = parseFloorPlan(club.floorPlan);

  if (request.nextUrl.searchParams.get("floor") === "1") {
    const atParam = request.nextUrl.searchParams.get("at");
    const at = atParam ? new Date(atParam) : new Date();
    if (Number.isNaN(at.getTime())) {
      return NextResponse.json({ error: "Неверная дата" }, { status: 400 });
    }

    const slotMinutes = Math.max(30, club.bookingSlotMinutes);
    const endsAt = new Date(at.getTime() + slotMinutes * 60_000);
    const rangeStart = new Date(at.getTime() - 24 * 60 * 60_000);
    const rangeEnd = new Date(at.getTime() + 24 * 60 * 60_000);

    const existing = await prisma.tableBooking.findMany({
      where: {
        clubId: id,
        startsAt: { gte: rangeStart, lte: rangeEnd },
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
      select: bookingSelect,
    });

    const tables = floorPlan
      ? floorPlan.items
          .filter((item) => item.kind === "table" && item.tableFormat)
          .map((item) => {
            const availability = floorTableAvailability(
              floorPlan,
              item.tableFormat!,
              at,
              endsAt,
              existing,
            );
            const row = availability.find((t) => t.id === item.id);
            return {
              id: item.id,
              label: row?.label ?? item.id,
              tableFormat: item.tableFormat!,
              status: row?.status ?? "free",
            };
          })
      : [];

    return NextResponse.json({ tables });
  }

  if (request.nextUrl.searchParams.get("list") === "1") {
    try {
      await requireClubManageAccess(id);
      const bookings = await prisma.tableBooking.findMany({
        where: {
          clubId: id,
          status: { in: ["PENDING", "CONFIRMED"] },
          endsAt: { gte: new Date() },
        },
        include: {
          player: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { startsAt: "asc" },
        take: 50,
      });
      return NextResponse.json(
        bookings.map((b) => ({
          ...b,
          floorTableLabel: floorTableLabel(floorPlan, b.floorItemId),
        })),
      );
    } catch (error) {
      const authResp = authErrorResponse(error);
      if (authResp) return authResp;
      throw error;
    }
  }

  if (request.nextUrl.searchParams.get("calendar") === "1") {
    try {
      await requireClubManageAccess(id);
      const fromParam = request.nextUrl.searchParams.get("from");
      const fromDay =
        fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) ? fromParam : todayDayKey();
      const advance = Math.max(1, Math.min(club.bookingAdvanceDays, 31));
      const daysCount = Math.min(
        advance,
        Math.max(1, Number(request.nextUrl.searchParams.get("days") ?? 7) || 7),
      );
      const dayKeys = buildDayKeys(fromDay, daysCount);
      const rangeStart = new Date(`${fromDay}T00:00:00+03:00`);
      const lastDay = dayKeys[dayKeys.length - 1]!;
      const rangeEnd = new Date(`${lastDay}T23:59:59.999+03:00`);

      const bookings = await prisma.tableBooking.findMany({
        where: {
          clubId: id,
          status: { in: ["PENDING", "CONFIRMED"] },
          startsAt: { lte: rangeEnd },
          endsAt: { gte: rangeStart },
        },
        include: bookingInclude,
        orderBy: { startsAt: "asc" },
      });

      const mapped = bookings.map((b) =>
        mapManageBookingRow(
          {
            ...b,
            playerNote: b.playerNote,
            clubNote: b.clubNote,
            guestName: b.guestName,
            guestPhone: b.guestPhone,
            kind: b.kind,
          },
          floorPlan,
          bookingDayKey,
        ),
      );

      const tableRows = ensureUnassignedRows(
        buildCalendarTableRows(club.floorPlan, club.tableCounts),
        bookings,
        floorPlan,
      );

      const today = todayDayKey();
      const pending = mapped.filter((b) => b.status === "PENDING").length;
      const confirmedToday = mapped.filter(
        (b) => b.status === "CONFIRMED" && b.kind !== "BLOCK" && b.dayKey === today,
      ).length;
      const confirmedInRange = mapped.filter(
        (b) => b.status === "CONFIRMED" && b.kind !== "BLOCK",
      ).length;
      const blocksCount = mapped.filter((b) => b.kind === "BLOCK").length;

      const analytics = computeBookingAnalytics(
        mapped,
        tableRows,
        dayKeys,
        bookingStepMinutes(clubBookingContext(club)),
      );

      let history: ReturnType<typeof mapManageBookingRow>[] = [];
      if (request.nextUrl.searchParams.get("includeHistory") === "1") {
        const historyStart = new Date();
        historyStart.setDate(historyStart.getDate() - 30);
        const historyRows = await prisma.tableBooking.findMany({
          where: {
            clubId: id,
            status: { in: ["REJECTED", "CANCELLED"] },
            endsAt: { gte: historyStart },
          },
          include: bookingInclude,
          orderBy: { startsAt: "desc" },
          take: 40,
        });
        history = historyRows.map((b) =>
          mapManageBookingRow(
            {
              ...b,
              playerNote: b.playerNote,
              clubNote: b.clubNote,
              guestName: b.guestName,
              guestPhone: b.guestPhone,
              kind: b.kind,
            },
            floorPlan,
            bookingDayKey,
          ),
        );
      }

      const closedDays = dayKeys.filter(
        (d) => !isClubOpenOnDay(club.weeklyHours, club.workingHours, d),
      );

      return NextResponse.json({
        from: fromDay,
        days: dayKeys,
        closedDays,
        tables: tableRows,
        bookings: mapped,
        history,
        stats: {
          pending,
          confirmedToday,
          confirmedInRange,
          tablesCount: tableRows.length,
          blocksCount,
          utilizationPercent: analytics.utilizationPercent,
          peakHourLabel: analytics.peakHourLabel,
        },
        bookingAdvanceDays: club.bookingAdvanceDays,
        slotMinutes: bookingStepMinutes(clubBookingContext(club)),
        weeklyHours: resolveWeeklyHours(club.weeklyHours, club.workingHours),
        workingHours: club.workingHours,
        hasFloorPlan: Boolean(
          floorPlan?.items.some((i) => i.kind === "table" && i.tableFormat),
        ),
      });
    } catch (error) {
      const authResp = authErrorResponse(error);
      if (authResp) return authResp;
      throw error;
    }
  }

  const date = request.nextUrl.searchParams.get("date");
  const tableFormat = request.nextUrl.searchParams.get("format") as ClubTableFormatId | null;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !tableFormat) {
    return NextResponse.json({ error: "Укажите date и format" }, { status: 400 });
  }

  const ctx = clubBookingContext(club);
  const dayStart = new Date(`${date}T00:00:00+03:00`);
  const dayEnd = new Date(`${date}T23:59:59+03:00`);

  const existing = await prisma.tableBooking.findMany({
    where: {
      clubId: id,
      startsAt: { gte: dayStart, lte: dayEnd },
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
    },
    select: bookingSelect,
  });

  const slots = buildBookingSlots(ctx, date, tableFormat, existing);
  const startsAtParam = request.nextUrl.searchParams.get("startsAt");
  const planTables = floorTablesForFormat(floorPlan, tableFormat);

  const payload: {
    slots: typeof slots;
    slotMinutes: number;
    hasFloorPlan: boolean;
    durationOptions?: number[];
    floorTables?: ReturnType<typeof floorTableAvailability>;
  } = {
    slots,
    slotMinutes: bookingStepMinutes(ctx),
    hasFloorPlan: planTables.length > 0,
  };

  if (startsAtParam && planTables.length > 0) {
    const startsAt = new Date(startsAtParam);
    if (!Number.isNaN(startsAt.getTime())) {
      const endsAtParam = request.nextUrl.searchParams.get("endsAt");
      const step = bookingStepMinutes(ctx);
      const endsAt = endsAtParam
        ? new Date(endsAtParam)
        : new Date(startsAt.getTime() + step * 60_000);
      payload.durationOptions = durationOptionsForSlot(ctx, date, startsAt);
      if (!Number.isNaN(endsAt.getTime())) {
        payload.floorTables = floorTableAvailability(
          floorPlan,
          tableFormat,
          startsAt,
          endsAt,
          existing,
        );
      }
    }
  }

  if (startsAtParam && planTables.length === 0) {
    const startsAt = new Date(startsAtParam);
    if (!Number.isNaN(startsAt.getTime())) {
      payload.durationOptions = durationOptionsForSlot(ctx, date, startsAt);
    }
  }

  return NextResponse.json(payload);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Войдите, чтобы забронировать стол" }, { status: 401 });
    }
    if (!player.isVerified) {
      return NextResponse.json(
        { error: "Подтвердите профиль через Telegram" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const club = await prisma.club.findUnique({ where: { id } });
    if (!club) {
      return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
    }

    const body = await request.json();
    const data = bookingCreateSchema.parse(body);
    const startsAt = new Date(data.startsAt);
    const ctx = clubBookingContext(club);
    const floorPlan = parseFloorPlan(club.floorPlan);
    const step = bookingStepMinutes(ctx);
    const endsAt = data.endsAt
      ? new Date(data.endsAt)
      : new Date(startsAt.getTime() + step * 60_000);

    const rangeStart = new Date(startsAt.getTime() - 24 * 60 * 60_000);
    const rangeEnd = new Date(endsAt.getTime() + 24 * 60 * 60_000);

    const existing = await prisma.tableBooking.findMany({
      where: {
        clubId: id,
        startsAt: { gte: rangeStart, lte: rangeEnd },
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
      select: bookingSelect,
    });

    const error = validateBookingRequest(
      ctx,
      data.tableFormat,
      startsAt,
      endsAt,
      existing,
      player.id,
      new Date(),
      data.floorItemId,
      floorPlan,
    );
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const booking = await prisma.tableBooking.create({
      data: {
        clubId: id,
        playerId: player.id,
        kind: "PLAYER",
        tableFormat: data.tableFormat,
        floorItemId: data.floorItemId || null,
        startsAt,
        endsAt,
        playerNote: data.playerNote || null,
        status: "PENDING",
      },
      include: {
        club: { select: { name: true, telegramId: true } },
        player: { select: { firstName: true, lastName: true, phone: true } },
      },
    });

    void notifyClubNewBooking(booking.club, {
      tableFormat: booking.tableFormat,
      floorTableLabel: floorTableLabel(floorPlan, booking.floorItemId),
      floorItemId: booking.floorItemId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      player: booking.player,
      guestName: null,
      guestPhone: null,
      playerNote: booking.playerNote,
    });

    await writeAuditLog({
      actorType: "player",
      actorId: player.id,
      action: "table_booking.create",
      entityType: "table_booking",
      entityId: booking.id,
      payload: { clubId: id, tableFormat: data.tableFormat, floorItemId: data.floorItemId },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось создать бронь" }, { status: 500 });
  }
}
