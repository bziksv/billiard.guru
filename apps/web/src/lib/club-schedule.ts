export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type WeeklyHoursSlot = {
  days: Weekday[];
  open: string;
  close: string;
  closesAfterMidnight?: boolean;
};

export type PriceTier = {
  label: string;
  days?: Weekday[] | "weekdays" | "weekend" | "all";
  timeFrom?: string;
  timeTo?: string;
  closesAfterMidnight?: boolean;
  price: string;
  note?: string;
};

export type ClubOpenStatus = {
  isOpen: boolean;
  today: Weekday;
  todayLabel: string;
  message: string;
  detail?: string;
  closesAt?: string;
  opensAt?: string;
};

export type ScheduleLocale = "ru" | "en";

const DAY_LABELS: Record<Weekday, string> = {
  mon: "Пн",
  tue: "Вт",
  wed: "Ср",
  thu: "Чт",
  fri: "Пт",
  sat: "Сб",
  sun: "Вс",
};

const DAY_LABELS_EN: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const DAY_LABELS_FULL: Record<Weekday, string> = {
  mon: "понедельник",
  tue: "вторник",
  wed: "среда",
  thu: "четверг",
  fri: "пятница",
  sat: "суббота",
  sun: "воскресенье",
};

const DAY_LABELS_FULL_EN: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function shortDayLabels(locale: ScheduleLocale): Record<Weekday, string> {
  return locale === "en" ? DAY_LABELS_EN : DAY_LABELS;
}

function fullDayLabels(locale: ScheduleLocale): Record<Weekday, string> {
  return locale === "en" ? DAY_LABELS_FULL_EN : DAY_LABELS_FULL;
}

const WEEKDAY_SET = new Set<Weekday>(["mon", "tue", "wed", "thu", "fri"]);
const WEEKEND_SET = new Set<Weekday>(["sat", "sun"]);

const DAY_ALIASES: Record<string, Weekday> = {
  пн: "mon",
  вт: "tue",
  ср: "wed",
  чт: "thu",
  пт: "fri",
  сб: "sat",
  вс: "sun",
};

export function parseWeeklyHours(raw: unknown): WeeklyHoursSlot[] {
  if (!Array.isArray(raw)) return [];
  const slots: WeeklyHoursSlot[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const days = Array.isArray(row.days)
      ? row.days.filter((d): d is Weekday => WEEKDAYS.includes(d as Weekday))
      : [];
    if (days.length === 0) continue;
    const open = normalizeTime(String(row.open ?? ""));
    const close = normalizeTime(String(row.close ?? ""));
    if (!open || !close) continue;
    slots.push({
      days,
      open,
      close,
      closesAfterMidnight: Boolean(row.closesAfterMidnight),
    });
  }
  return slots;
}

export function parsePriceTiers(raw: unknown): PriceTier[] {
  if (!Array.isArray(raw)) return [];
  const tiers: PriceTier[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const label = String(row.label ?? "").trim();
    const price = String(row.price ?? "").trim();
    if (!label || !price) continue;
    let days: PriceTier["days"] = "all";
    if (row.days === "weekdays" || row.days === "weekend" || row.days === "all") {
      days = row.days;
    } else if (Array.isArray(row.days)) {
      const parsed = row.days.filter((d): d is Weekday => WEEKDAYS.includes(d as Weekday));
      if (parsed.length > 0) days = parsed;
    }
    tiers.push({
      label,
      days,
      timeFrom: normalizeTime(String(row.timeFrom ?? "")) || undefined,
      timeTo: normalizeTime(String(row.timeTo ?? "")) || undefined,
      closesAfterMidnight: Boolean(row.closesAfterMidnight),
      price,
      note: String(row.note ?? "").trim() || undefined,
    });
  }
  return tiers;
}

/** Парсит текст вида «Пн–Чт: 12:00 – 23:00» для старых записей. */
export function parseLegacyWorkingHours(text: string): WeeklyHoursSlot[] {
  const slots: WeeklyHoursSlot[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || !/^\p{L}/u.test(trimmed)) continue;
    const match =
      /^([\p{L}]{2}(?:\s*[–-]\s*[\p{L}]{2})?(?:,\s*[\p{L}]{2}(?:\s*[–-]\s*[\p{L}]{2})?)*)\s*:\s*(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/iu.exec(
        trimmed,
      );
    if (!match) continue;
    const days = expandDayTokens(match[1]);
    const open = normalizeTime(match[2]);
    const close = normalizeTime(match[3]);
    if (days.length === 0 || !open || !close) continue;
    const openM = timeToMinutes(open);
    const closeM = timeToMinutes(close);
    slots.push({
      days,
      open,
      close,
      closesAfterMidnight: closeM <= openM,
    });
  }
  return slots;
}

function expandDayTokens(raw: string): Weekday[] {
  const parts = raw.split(/,\s*/);
  const days = new Set<Weekday>();
  for (const part of parts) {
    const range = part.trim().split(/\s*[–-]\s*/);
    if (range.length === 2) {
      const start = DAY_ALIASES[range[0]!.toLowerCase()];
      const end = DAY_ALIASES[range[1]!.toLowerCase()];
      if (!start || !end) continue;
      let active = false;
      for (const day of WEEKDAYS) {
        if (day === start) active = true;
        if (active) days.add(day);
        if (day === end) active = false;
      }
      continue;
    }
    const day = DAY_ALIASES[part.toLowerCase()];
    if (day) days.add(day);
  }
  return WEEKDAYS.filter((d) => days.has(d));
}

export function resolveWeeklyHours(
  weeklyHours: unknown,
  workingHours?: string | null,
): WeeklyHoursSlot[] {
  const structured = parseWeeklyHours(weeklyHours);
  if (structured.length > 0) return structured;
  if (workingHours?.trim()) return parseLegacyWorkingHours(workingHours);
  return [];
}

export function formatDayRange(days: Weekday[], locale: ScheduleLocale = "ru"): string {
  if (days.length === 0) return "";
  const indices = days.map((d) => WEEKDAYS.indexOf(d)).sort((a, b) => a - b);
  const groups: string[] = [];
  let start = indices[0]!;
  let prev = start;
  for (let i = 1; i <= indices.length; i++) {
    const cur = indices[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    groups.push(formatIndexRange(start, prev, locale));
    if (cur == null) break;
    start = cur;
    prev = cur;
  }
  return groups.join(", ");
}

function formatIndexRange(start: number, end: number, locale: ScheduleLocale): string {
  const labels = shortDayLabels(locale);
  const startDay = WEEKDAYS[start]!;
  const endDay = WEEKDAYS[end]!;
  if (start === end) return labels[startDay];
  return `${labels[startDay]}–${labels[endDay]}`;
}

export function formatHoursSlot(slot: WeeklyHoursSlot): string {
  return `${slot.open} – ${slot.close}`;
}

export function scheduleRows(slots: WeeklyHoursSlot[], today: Weekday, locale: ScheduleLocale = "ru") {
  return slots.map((slot) => ({
    key: `${slot.days.join("-")}-${slot.open}-${slot.close}`,
    daysLabel: formatDayRange(slot.days, locale),
    hoursLabel: formatHoursSlot(slot),
    isToday: slot.days.includes(today),
  }));
}

export function getClubOpenStatus(
  slots: WeeklyHoursSlot[],
  now = new Date(),
  timeZone = "Europe/Moscow",
  locale: ScheduleLocale = "ru",
): ClubOpenStatus | null {
  if (slots.length === 0) return null;

  const today = weekdayInZone(now, timeZone);
  const minutesNow = minutesInZone(now, timeZone);
  const fullLabels = fullDayLabels(locale);

  for (const slot of slots) {
    const interval = activeIntervalForSlot(slot, today, minutesNow, timeZone, now);
    if (interval?.isOpen) {
      return {
        isOpen: true,
        today,
        todayLabel: fullLabels[today],
        message: locale === "en" ? "Open now" : "Сейчас открыто",
        detail:
          locale === "en"
            ? `Closes at ${interval.closesAt}`
            : `Закроется в ${interval.closesAt}`,
        closesAt: interval.closesAt,
      };
    }
  }

  const next = findNextOpening(slots, today, minutesNow, locale);
  return {
    isOpen: false,
    today,
    todayLabel: fullLabels[today],
    message: locale === "en" ? "Closed now" : "Сейчас закрыто",
    detail: next
      ? locale === "en"
        ? `Opens ${next.label} at ${next.time}`
        : `Откроется ${next.label} в ${next.time}`
      : undefined,
    opensAt: next?.time,
  };
}

export function isTimedPriceTier(tier: PriceTier): boolean {
  return Boolean(tier.timeFrom || tier.timeTo);
}

export function isPriceTierActive(
  tier: PriceTier,
  today: Weekday,
  minutesNow: number,
): boolean {
  if (!isTimedPriceTier(tier)) return false;
  if (!tierMatchesDay(tier, today)) return false;

  const from = tier.timeFrom ? timeToMinutes(tier.timeFrom) : 0;
  const to = tier.timeTo ? timeToMinutes(tier.timeTo) : 24 * 60;

  if (tier.closesAfterMidnight && to <= from) {
    return minutesNow >= from || minutesNow < to;
  }
  if (tier.timeFrom && tier.timeTo) {
    return minutesNow >= from && minutesNow < to;
  }
  if (tier.timeFrom) return minutesNow >= from;
  if (tier.timeTo) return minutesNow < to;
  return false;
}

/** Один почасовой тариф с интервалом — «сейчас»; абонементы и фикс. цены без времени не подсвечиваются. */
export function findActivePriceTierIndex(
  tiers: PriceTier[],
  today: Weekday,
  minutesNow: number,
): number | null {
  for (let i = 0; i < tiers.length; i++) {
    if (isPriceTierActive(tiers[i]!, today, minutesNow)) return i;
  }
  return null;
}

export function findActivePriceTierAt(
  tiers: PriceTier[],
  now = new Date(),
  timeZone = "Europe/Moscow",
): PriceTier | null {
  const today = weekdayInZone(now, timeZone);
  const minutesNow = minutesInZone(now, timeZone);
  const idx = findActivePriceTierIndex(tiers, today, minutesNow);
  return idx != null ? tiers[idx]! : null;
}

export function priceTierDaysLabel(days: PriceTier["days"], locale: ScheduleLocale = "ru"): string {
  if (!days || days === "all") return locale === "en" ? "daily" : "ежедневно";
  if (days === "weekdays") return locale === "en" ? "weekdays" : "будни";
  if (days === "weekend") return locale === "en" ? "weekends" : "выходные";
  return formatDayRange(days, locale);
}

export function formatPriceTierTimeRange(tier: PriceTier, locale: ScheduleLocale = "ru"): string | null {
  if (tier.timeFrom && tier.timeTo) {
    return `${tier.timeFrom} – ${tier.timeTo}`;
  }
  if (tier.timeFrom) return locale === "en" ? `from ${tier.timeFrom}` : `с ${tier.timeFrom}`;
  if (tier.timeTo) return locale === "en" ? `until ${tier.timeTo}` : `до ${tier.timeTo}`;
  return null;
}

function tierMatchesDay(tier: PriceTier, today: Weekday): boolean {
  const days = tier.days ?? "all";
  if (days === "all") return true;
  if (days === "weekdays") return WEEKDAY_SET.has(today);
  if (days === "weekend") return WEEKEND_SET.has(today);
  return days.includes(today);
}

function activeIntervalForSlot(
  slot: WeeklyHoursSlot,
  today: Weekday,
  minutesNow: number,
  timeZone: string,
  now: Date,
) {
  const candidates: Array<{ isOpen: boolean; closesAt: string; day: Weekday }> = [];

  for (const day of slot.days) {
    const openM = timeToMinutes(slot.open);
    const closeM = timeToMinutes(slot.close);
    const closesAfterMidnight = slot.closesAfterMidnight ?? closeM <= openM;

    if (closesAfterMidnight) {
      if (day === today && minutesNow >= openM) {
        candidates.push({ isOpen: true, closesAt: slot.close, day });
      }
      const nextDay = WEEKDAYS[(WEEKDAYS.indexOf(day) + 1) % 7]!;
      if (nextDay === today && minutesNow < closeM) {
        candidates.push({ isOpen: true, closesAt: slot.close, day });
      }
      continue;
    }

    if (day === today && minutesNow >= openM && minutesNow < closeM) {
      candidates.push({ isOpen: true, closesAt: slot.close, day });
    }
  }

  return candidates[0] ?? null;
}

function findNextOpening(
  slots: WeeklyHoursSlot[],
  today: Weekday,
  minutesNow: number,
  locale: ScheduleLocale,
) {
  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (WEEKDAYS.indexOf(today) + offset) % 7;
    const day = WEEKDAYS[dayIndex]!;
    for (const slot of slots) {
      if (!slot.days.includes(day)) continue;
      const openM = timeToMinutes(slot.open);
      if (offset === 0 && minutesNow >= openM) continue;
      const fullLabels = fullDayLabels(locale);
      const label =
        offset === 0
          ? locale === "en"
            ? "today"
            : "сегодня"
          : offset === 1
            ? locale === "en"
              ? "tomorrow"
              : "завтра"
            : locale === "en"
              ? `on ${fullLabels[day]}`
              : `в ${fullLabels[day]}`;
      return { label, time: slot.open };
    }
  }
  return null;
}

function weekdayInZone(date: Date, timeZone: string): Weekday {
  const label = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone })
    .format(date)
    .toLowerCase();
  const map: Record<string, Weekday> = {
    mon: "mon",
    tue: "tue",
    wed: "wed",
    thu: "thu",
    fri: "fri",
    sat: "sat",
    sun: "sun",
  };
  return map[label.slice(0, 3)] ?? "mon";
}

function minutesInZone(date: Date, timeZone: string): number {
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

function normalizeTime(value: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function weeklyHoursToJson(slots: WeeklyHoursSlot[]) {
  if (slots.length === 0) return null;
  return slots.map((slot) => ({
    days: slot.days,
    open: slot.open,
    close: slot.close,
    ...(slot.closesAfterMidnight ? { closesAfterMidnight: true } : {}),
  }));
}

export function priceTiersToJson(tiers: PriceTier[]) {
  if (tiers.length === 0) return null;
  return tiers.map((tier) => ({
    label: tier.label,
    days: tier.days ?? "all",
    ...(tier.timeFrom ? { timeFrom: tier.timeFrom } : {}),
    ...(tier.timeTo ? { timeTo: tier.timeTo } : {}),
    ...(tier.closesAfterMidnight ? { closesAfterMidnight: true } : {}),
    price: tier.price,
    ...(tier.note ? { note: tier.note } : {}),
  }));
}

export function hoursFootnote(workingHours?: string | null): string | null {
  if (!workingHours?.trim()) return null;
  const lines = workingHours
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const notes = lines.filter((line) => !parseLegacyWorkingHours(line).length);
  return notes.length > 0 ? notes.join("\n") : null;
}

export { DAY_LABELS_FULL as CLUB_WEEKDAY_LABELS_FULL };
