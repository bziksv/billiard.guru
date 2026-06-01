import type { ClubFloorPlan } from "@/lib/club-floor-plan";
import type { ClubTableFormatId } from "@/lib/club-table-formats";
import { bookingTableRowId } from "@/lib/club-bookings-calendar";
import {
  bookingCapacityForFormat,
  countFreeFloorTables,
  floorTablesForFormat,
  floorTableLabel,
  validateFloorItemBooking,
} from "@/lib/floor-plan-booking";
import {
  ACTIVE_BOOKING_STATUSES,
  bookingOverlaps,
  bookingStepMinutes,
  type ClubBookingContext,
  type ExistingBooking,
  maxBookingDurationMinutes,
  formatBookingDuration,
  clubBookableFormats,
  isBookingStartOnGrid,
  durationOptionsForSlot,
  formatDateInZone,
} from "@/lib/table-booking";
import { parseFloorPlan } from "@/lib/club-floor-plan";

export type ManageBookingKind = "CLUB" | "BLOCK";

export function mapManageBookingRow(
  b: {
    id: string;
    tableFormat: string;
    floorItemId: string | null;
    startsAt: Date;
    endsAt: Date;
    status: string;
    kind: string;
    playerNote: string | null;
    clubNote: string | null;
    guestName: string | null;
    guestPhone: string | null;
    player: { id: string; firstName: string; lastName: string; phone: string } | null;
  },
  floorPlan: ClubFloorPlan | null,
  dayKeyFn: (d: Date) => string,
) {
  return {
    id: b.id,
    tableFormat: b.tableFormat,
    floorItemId: b.floorItemId,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    status: b.status,
    kind: b.kind,
    playerNote: b.playerNote,
    clubNote: b.clubNote,
    guestName: b.guestName,
    guestPhone: b.guestPhone,
    dayKey: dayKeyFn(b.startsAt),
    tableRowId: bookingTableRowId(b.floorItemId, b.tableFormat, floorPlan),
    floorTableLabel: floorTableLabel(floorPlan, b.floorItemId),
    player: b.player,
    displayName: b.player
      ? `${b.player.lastName} ${b.player.firstName}`
      : b.guestName ?? "Гость",
    displayPhone: b.player?.phone ?? b.guestPhone ?? "",
  };
}

export function validateClubManageBooking(
  club: ClubBookingContext,
  kind: ManageBookingKind,
  tableFormat: ClubTableFormatId,
  startsAt: Date,
  endsAt: Date,
  existing: ExistingBooking[],
  floorItemId: string | null | undefined,
  floorPlan: ClubFloorPlan | null,
  now = new Date(),
): string | null {
  const formats = clubBookableFormats(club);
  if (!formats.includes(tableFormat)) return "Неверный формат стола";

  const plan = parseFloorPlan(floorPlan ?? club.floorPlan);
  const capacity = bookingCapacityForFormat(club.tableCounts, plan, tableFormat);
  if (capacity <= 0) return "Нет столов выбранного формата";

  const step = bookingStepMinutes(club);
  const durationMin = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
  if (durationMin <= 0) return "Некорректная длительность";
  if (durationMin % step !== 0) {
    return `Длительность должна быть кратна ${step} мин`;
  }
  if (durationMin > maxBookingDurationMinutes(club)) {
    return `Максимум ${formatBookingDuration(maxBookingDurationMinutes(club))}`;
  }

  if (kind !== "BLOCK" && startsAt <= now) {
    return "Укажите время в будущем";
  }

  const date = formatDateInZone(startsAt);
  if (kind !== "BLOCK" && !isBookingStartOnGrid(club, date, startsAt, now)) {
    return "Время вне сетки бронирования";
  }

  const durationOptions = durationOptionsForSlot(club, date, startsAt);
  if (kind !== "BLOCK" && !durationOptions.includes(durationMin)) {
    return "Не помещается в график работы";
  }

  const planTables = floorTablesForFormat(plan, tableFormat);
  const activeExisting = existing.filter((b) =>
    ACTIVE_BOOKING_STATUSES.includes(b.status as (typeof ACTIVE_BOOKING_STATUSES)[number]),
  );

  if (planTables.length > 0) {
    if (!floorItemId) return "Выберите стол";
    const floorError = validateFloorItemBooking(
      plan,
      floorItemId,
      tableFormat,
      startsAt,
      endsAt,
      activeExisting,
    );
    if (floorError) return floorError;
  } else {
    const overlaps = activeExisting.filter(
      (b) =>
        b.tableFormat === tableFormat &&
        bookingOverlaps(b.startsAt, b.endsAt, startsAt, endsAt),
    ).length;
    if (overlaps >= capacity) return "Нет свободных столов на это время";
  }

  return null;
}

export function bookingDisplayContact(booking: {
  player: { firstName: string; lastName: string; phone: string } | null;
  guestName: string | null;
  guestPhone: string | null;
}): { name: string; phone: string } {
  if (booking.player) {
    return {
      name: `${booking.player.lastName} ${booking.player.firstName}`,
      phone: booking.player.phone,
    };
  }
  return {
    name: booking.guestName ?? "Гость",
    phone: booking.guestPhone ?? "",
  };
}
