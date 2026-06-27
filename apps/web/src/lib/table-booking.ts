import {
  clubTableCountsEntries,
  clubTableFormatLabel,
  CLUB_TABLE_FORMATS,
  parseClubTableCounts,
  type ClubTableFormatId,
} from "@/lib/club-table-formats";
import type { ClubFloorPlan } from "@/lib/club-floor-plan";
import { parseFloorPlan } from "@/lib/club-floor-plan";
import {
  bookingCapacityForFormat,
  countFreeFloorTables,
  floorTablesForFormat,
  validateFloorItemBooking,
} from "@/lib/floor-plan-booking";
import {
  resolveWeeklyHours,
  type Weekday,
  WEEKDAYS,
} from "@/lib/club-schedule";

export const BOOKING_TIMEZONE = "Europe/Moscow";
export const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED"] as const;

export type ClubBookingContext = {
  id: string;
  bookingEnabled: boolean;
  bookingSlotMinutes: number;
  bookingAdvanceDays: number;
  weeklyHours: unknown;
  workingHours: string | null;
  tableCounts: unknown;
  floorPlan?: unknown;
};

export type BookingSlotOffer = {
  startsAt: string;
  endsAt: string;
  label: string;
  available: number;
  capacity: number;
};

export type TableBookingView = {
  id: string;
  clubId: string;
  tableFormat: ClubTableFormatId;
  startsAt: string;
  endsAt: string;
  status: string;
  playerNote: string | null;
};

export type ExistingBooking = {
  tableFormat: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  playerId: string | null;
  floorItemId?: string | null;
};

export function clubBookableFormats(club: ClubBookingContext): ClubTableFormatId[] {
  return clubBookingFormatEntries(club.tableCounts, club.floorPlan).map((e) => e.id);
}

export function clubBookingFormatEntries(
  tableCounts: unknown,
  floorPlanRaw: unknown,
  locale: "ru" | "en" = "ru",
) {
  const plan = parseFloorPlan(floorPlanRaw);
  const counts = parseClubTableCounts(tableCounts);
  return CLUB_TABLE_FORMATS.filter((f) => {
    const onPlan = plan ? floorTablesForFormat(plan, f.id).length : 0;
    const fromProfile = counts[f.id] ?? 0;
    return (onPlan > 0 ? onPlan : fromProfile) > 0;
  }).map((f) => {
    const onPlan = plan ? floorTablesForFormat(plan, f.id).length : 0;
    const fromProfile = counts[f.id] ?? 0;
    return {
      id: f.id,
      label: clubTableFormatLabel(f.id, locale),
      count: onPlan > 0 ? onPlan : fromProfile,
    };
  });
}

export function formatBookingRange(
  startsAt: Date,
  endsAt: Date,
  locale: "ru" | "en" = "ru",
  timeZone = BOOKING_TIMEZONE,
) {
  const intlLocale = locale === "en" ? "en-US" : "ru-RU";
  const dateFmt = new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "long",
    timeZone,
  });
  const timeFmt = new Intl.DateTimeFormat(intlLocale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  return `${dateFmt.format(startsAt)}, ${timeFmt.format(startsAt)} – ${timeFmt.format(endsAt)}`;
}

export function bookingStepMinutes(club: ClubBookingContext) {
  return Math.max(30, club.bookingSlotMinutes);
}

export function maxBookingDurationMinutes(club: ClubBookingContext) {
  return Math.min(240, bookingStepMinutes(club) * 8);
}

export function formatBookingDuration(
  minutes: number,
  locale: "ru" | "en" = "ru",
): string {
  if (locale === "en") {
    if (minutes >= 60 && minutes % 60 === 0) {
      const hours = minutes / 60;
      return hours === 1 ? "1 hour" : `${hours} hours`;
    }
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
    }
    return `${minutes} min`;
  }

  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    if (hours === 1) return "1 час";
    if (hours >= 2 && hours <= 4) {
      const labels: Record<number, string> = { 2: "2 часа", 3: "3 часа", 4: "4 часа" };
      return labels[hours] ?? `${hours} ч`;
    }
    return `${hours} ч`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours} ч ${rest} мин`;
  }
  return `${minutes} мин`;
}

export function durationOptionsForSlot(
  club: ClubBookingContext,
  date: string,
  startsAt: Date,
): number[] {
  const step = bookingStepMinutes(club);
  const maxTotal = maxBookingDurationMinutes(club);
  const startMin = minutesFromDate(startsAt);
  const dayHours = openingIntervalsForDate(club, date);

  let closeMin: number | null = null;
  for (const interval of dayHours) {
    if (startMin >= interval.openMin && startMin < interval.closeMin) {
      closeMin = interval.closeMin;
      break;
    }
  }
  if (closeMin == null) return [step];

  const maxByClose = closeMin - startMin;
  const maxDur = Math.min(maxTotal, maxByClose);
  const options: number[] = [];
  for (let d = step; d <= maxDur; d += step) {
    options.push(d);
  }
  return options.length > 0 ? options : [Math.min(step, maxByClose)];
}

export function isBookingStartOnGrid(
  club: ClubBookingContext,
  date: string,
  startsAt: Date,
  now = new Date(),
): boolean {
  if (startsAt <= now) return false;
  const step = bookingStepMinutes(club);
  const startMin = minutesFromDate(startsAt);
  const dayHours = openingIntervalsForDate(club, date);

  for (const interval of dayHours) {
    if (startMin < interval.openMin || startMin >= interval.closeMin) continue;
    return (startMin - interval.openMin) % step === 0;
  }
  return false;
}

export function bookingEndsAt(startsAt: Date, durationMinutes: number) {
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}

export function buildBookingSlots(
  club: ClubBookingContext,
  date: string,
  tableFormat: ClubTableFormatId,
  existing: ExistingBooking[],
  now = new Date(),
): BookingSlotOffer[] {
  if (!club.bookingEnabled) return [];

  const plan = parseFloorPlan(club.floorPlan);
  const planTables = floorTablesForFormat(plan, tableFormat);
  const capacity = bookingCapacityForFormat(club.tableCounts, plan, tableFormat);
  if (capacity <= 0) return [];

  const dayHours = openingIntervalsForDate(club, date);
  if (dayHours.length === 0) return [];

  const slotMinutes = Math.max(30, club.bookingSlotMinutes);
  const slots: BookingSlotOffer[] = [];

  for (const interval of dayHours) {
    for (
      let startMin = interval.openMin;
      startMin + slotMinutes <= interval.closeMin;
      startMin += slotMinutes
    ) {
      const startsAt = zonedDateTime(date, startMin);
      const endsAt = new Date(startsAt.getTime() + slotMinutes * 60_000);
      if (startsAt <= now) continue;

      const available =
        planTables.length > 0
          ? countFreeFloorTables(plan, tableFormat, startsAt, endsAt, existing)
          : capacity -
            countOverlappingBookings(existing, tableFormat, startsAt, endsAt);
      if (available <= 0) continue;

      slots.push({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        label: formatSlotLabel(startsAt, endsAt),
        available,
        capacity,
      });
    }
  }

  return slots;
}

export function validateBookingRequest(
  club: ClubBookingContext,
  tableFormat: ClubTableFormatId,
  startsAt: Date,
  endsAt: Date,
  existing: ExistingBooking[],
  playerId: string,
  now = new Date(),
  floorItemId?: string | null,
  floorPlan?: ClubFloorPlan | null,
): string | null {
  if (!club.bookingEnabled) return "Бронирование в этом клубе отключено";

  const formats = clubBookableFormats(club);
  if (!formats.includes(tableFormat)) return "Неверный формат стола";

  const plan = parseFloorPlan(floorPlan ?? club.floorPlan);
  const planTables = floorTablesForFormat(plan, tableFormat);
  const capacity = bookingCapacityForFormat(club.tableCounts, plan, tableFormat);
  if (capacity <= 0) return "Нет столов выбранного формата";

  const step = bookingStepMinutes(club);
  const durationMin = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);

  if (durationMin <= 0) return "Некорректная длительность брони";
  if (durationMin % step !== 0) {
    return `Длительность должна быть кратна ${step} мин`;
  }
  if (durationMin > maxBookingDurationMinutes(club)) {
    return `Максимальная длительность — ${formatBookingDuration(maxBookingDurationMinutes(club))}`;
  }

  if (startsAt <= now) return "Нельзя забронировать прошедшее время";

  const maxDate = addDays(startOfDayInZone(now), club.bookingAdvanceDays);
  if (startsAt > maxDate) {
    return `Бронирование доступно максимум на ${club.bookingAdvanceDays} дней вперёд`;
  }

  const date = formatDateInZone(startsAt);
  if (!isBookingStartOnGrid(club, date, startsAt, now)) {
    return "Выбранное время недоступно";
  }

  const durationOptions = durationOptionsForSlot(club, date, startsAt);
  if (!durationOptions.includes(durationMin)) {
    return "Бронь не помещается в график работы клуба";
  }

  const playerOverlap = existing.some(
    (b) =>
      b.playerId === playerId &&
      ACTIVE_BOOKING_STATUSES.includes(b.status as (typeof ACTIVE_BOOKING_STATUSES)[number]) &&
      intervalsOverlap(b.startsAt, b.endsAt, startsAt, endsAt),
  );
  if (playerOverlap) return "У вас уже есть бронь на это время";

  const available =
    planTables.length > 0
      ? countFreeFloorTables(plan, tableFormat, startsAt, endsAt, existing)
      : capacity - countOverlappingBookings(existing, tableFormat, startsAt, endsAt);
  if (available <= 0) return "На это время нет свободных столов";

  if (planTables.length > 0) {
    if (!floorItemId) return "Выберите стол на схеме зала";
    const floorError = validateFloorItemBooking(
      plan,
      floorItemId,
      tableFormat,
      startsAt,
      endsAt,
      existing,
    );
    if (floorError) return floorError;
  } else if (floorItemId) {
    return "Схема зала не настроена для этого формата";
  }

  return null;
}

export function bookingOverlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
) {
  return intervalsOverlap(aStart, aEnd, bStart, bEnd);
}

export function bookingFormatLabel(format: string) {
  return clubTableFormatLabel(format as ClubTableFormatId);
}

/** Понятное описание стола для админки и клуба */
export function formatBookingTableCaption(
  tableFormat: string,
  floorTableLabel: string | null | undefined,
  floorItemId: string | null | undefined,
): { title: string; hint: string } {
  const formatName = bookingFormatLabel(tableFormat);

  if (floorItemId) {
    const title = floorTableLabel?.trim() || formatName;
    return {
      title,
      hint: `Стол на плане зала · ${formatName}`,
    };
  }

  return {
    title: formatName,
    hint: "Формат игры · конкретный стол не выбран",
  };
}

function countOverlappingBookings(
  existing: ExistingBooking[],
  tableFormat: ClubTableFormatId,
  startsAt: Date,
  endsAt: Date,
) {
  return existing.filter(
    (b) =>
      b.tableFormat === tableFormat &&
      ACTIVE_BOOKING_STATUSES.includes(b.status as (typeof ACTIVE_BOOKING_STATUSES)[number]) &&
      intervalsOverlap(b.startsAt, b.endsAt, startsAt, endsAt),
  ).length;
}

function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function openingIntervalsForDate(club: ClubBookingContext, date: string) {
  const weekday = weekdayFromDateString(date);
  const weekly = resolveWeeklyHours(club.weeklyHours, club.workingHours);
  const intervals: Array<{ openMin: number; closeMin: number }> = [];

  for (const slot of weekly) {
    if (!slot.days.includes(weekday)) continue;
    const openMin = timeToMinutes(slot.open);
    let closeMin = timeToMinutes(slot.close);
    if (slot.closesAfterMidnight || closeMin <= openMin) {
      closeMin = 24 * 60;
    }
    intervals.push({ openMin, closeMin });
  }

  return intervals;
}

function weekdayFromDateString(date: string): Weekday {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
  const label = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: BOOKING_TIMEZONE,
  })
    .format(utc)
    .toLowerCase()
    .slice(0, 3);
  const map: Record<string, Weekday> = {
    mon: "mon",
    tue: "tue",
    wed: "wed",
    thu: "thu",
    fri: "fri",
    sat: "sat",
    sun: "sun",
  };
  return map[label] ?? WEEKDAYS[utc.getUTCDay() === 0 ? 6 : utc.getUTCDay() - 1]!;
}

function zonedDateTime(date: string, minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00+03:00`);
}

export function formatDateInZone(date: Date, timeZone = BOOKING_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

function startOfDayInZone(now: Date, timeZone = BOOKING_TIMEZONE) {
  const date = formatDateInZone(now, timeZone);
  return zonedDateTime(date, 0);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60_000);
}

function timeToMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function minutesFromDate(date: Date, timeZone = BOOKING_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function formatSlotLabel(startsAt: Date, endsAt: Date) {
  const fmt = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BOOKING_TIMEZONE,
  });
  return `${fmt.format(startsAt)} – ${fmt.format(endsAt)}`;
}

export function bookingDateOptions(
  advanceDays: number,
  locale: "ru" | "en" = "ru",
  now = new Date(),
) {
  const options: Array<{ value: string; label: string }> = [];
  const start = startOfDayInZone(now);
  for (let i = 0; i <= advanceDays; i++) {
    const day = addDays(start, i);
    const value = formatDateInZone(day);
    const label = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: BOOKING_TIMEZONE,
    }).format(day);
    options.push({ value, label });
  }
  return options;
}
