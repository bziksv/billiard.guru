import { BOOKING_TIMEZONE } from "@/lib/table-booking";
import {
  resolveWeeklyHours,
  type WeeklyHoursSlot,
  WEEKDAYS,
  type Weekday,
} from "@/lib/club-schedule";

/** Map YYYY-MM-DD (MSK) → weekday id */
export function weekdayFromDayKey(dayKey: string): Weekday {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: BOOKING_TIMEZONE });
  const short = fmt.format(date).toLowerCase().slice(0, 3);
  const map: Record<string, Weekday> = {
    mon: "mon",
    tue: "tue",
    wed: "wed",
    thu: "thu",
    fri: "fri",
    sat: "sat",
    sun: "sun",
  };
  return map[short] ?? "mon";
}

export function clubHoursForDay(
  weeklyHoursRaw: unknown,
  workingHours: string | null,
  dayKey: string,
): WeeklyHoursSlot | null {
  const slots = resolveWeeklyHours(weeklyHoursRaw, workingHours);
  const day = weekdayFromDayKey(dayKey);
  return slots.find((s) => s.days.includes(day)) ?? null;
}

export function isClubOpenOnDay(
  weeklyHoursRaw: unknown,
  workingHours: string | null,
  dayKey: string,
): boolean {
  return clubHoursForDay(weeklyHoursRaw, workingHours, dayKey) !== null;
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export function isMinuteWithinClubHours(
  slot: WeeklyHoursSlot,
  minuteOfDay: number,
): boolean {
  const open = parseHm(slot.open);
  let close = parseHm(slot.close);
  if (slot.closesAfterMidnight && close <= open) {
    close += 24 * 60;
    const m = minuteOfDay < open ? minuteOfDay + 24 * 60 : minuteOfDay;
    return m >= open && m < close;
  }
  return minuteOfDay >= open && minuteOfDay < close;
}

export function buildDayTimelineMinutes(
  weeklyHoursRaw: unknown,
  workingHours: string | null,
  dayKey: string,
  stepMinutes: number,
): { minutes: number[]; closed: boolean; openLabel: string } {
  const slot = clubHoursForDay(weeklyHoursRaw, workingHours, dayKey);
  if (!slot) {
    return { minutes: [], closed: true, openLabel: "Закрыто" };
  }
  const open = parseHm(slot.open);
  let close = parseHm(slot.close);
  if (slot.closesAfterMidnight && close <= open) close += 24 * 60;
  const minutes: number[] = [];
  for (let m = open; m < close; m += stepMinutes) {
    if (m >= 24 * 60) break;
    minutes.push(m);
  }
  return {
    minutes,
    closed: false,
    openLabel: `${slot.open}–${slot.close}`,
  };
}

export function formatMinuteLabel(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function dayKeyFromWeekdayInRange(dayKeys: string[], weekday: Weekday): string | null {
  return dayKeys.find((d) => weekdayFromDayKey(d) === weekday) ?? null;
}

export { WEEKDAYS };
