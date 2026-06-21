import { clubTableFormatLabel, type ClubTableFormatId } from "@/lib/club-table-formats";
import type { AppLocale } from "@/i18n/routing";
import { formatRating } from "@/lib/rating";

export const PLAY_LISTING_KIND_LABELS: Record<string, string> = {
  SPARRING: "Спарринг",
  PARTNER: "Напарник",
  OPPONENT: "Соперник",
  TRAINING: "Тренировка",
  OTHER: "Другое",
};

export const PLAY_LISTING_SCHEDULE_LABELS: Record<string, string> = {
  ONE_TIME: "Разово",
  RECURRING: "На постоянке",
};

const PLAY_LISTING_SCHEDULE_LABELS_EN: Record<string, string> = {
  ONE_TIME: "One-off",
  RECURRING: "Regular",
};

export const PLAY_LISTING_STATUS_LABELS: Record<string, string> = {
  OPEN: "Активно",
  MATCHED: "Нашёлся партнёр",
  CLOSED: "Закрыто",
};

export const PLAY_LISTING_RESPONSE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ожидает",
  ACCEPTED: "Принят",
  DECLINED: "Отклонён",
  WITHDRAWN: "Отозван",
};

export const WEEKDAY_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

const PLAYERS_NEEDED_EN: Record<string, string> = {
  "пара на пару": "pair vs pair",
  пара: "pair",
};

/** Подсказки в форме «Покатать» — можно выбрать или ввести своё. */
export const PLAY_LISTING_PLAYERS_NEEDED_PRESETS = [
  "1",
  "2",
  "3",
  "4",
  "1-2",
  "1-3",
  "1-4",
  "2-4",
  "пара на пару",
  "пара",
] as const;

export function normalizePlayersNeededInput(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").replace(/–/g, "-");
}

function weekdayShort(dayIndex: number, locale: AppLocale): string {
  const date = new Date(Date.UTC(2024, 0, 7 + dayIndex));
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
    weekday: "short",
  }).format(date);
}

function formatPlayersNeededEn(s: string): string {
  const lower = s.toLowerCase();
  const mapped = PLAYERS_NEEDED_EN[lower];
  if (mapped) return mapped;
  if (lower.includes("пара")) {
    return lower.includes("на") ? "pair vs pair" : "pair";
  }
  if (/^\d+-\d+$/.test(s)) {
    const [a, b] = s.split("-").map(Number);
    const max = Math.max(a, b);
    const range = s.replace("-", "–");
    return max === 1 ? "1 player" : `${range} players`;
  }
  const n = Number(s);
  if (Number.isFinite(n) && n > 0 && String(n) === s) {
    return n === 1 ? "1 player" : `${n} players`;
  }
  return s;
}

/** Текст для карточки объявления: «1 игрока», «1–4 игрока», «пара на пару». */
export function formatPlayersNeeded(raw: string | number, locale: AppLocale = "ru"): string {
  const s = normalizePlayersNeededInput(String(raw));
  if (!s) return locale === "en" ? "1 player" : "1 игрока";
  if (locale === "en") return formatPlayersNeededEn(s);

  const lower = s.toLowerCase();
  if (lower.includes("пара")) return s;
  if (/^\d+-\d+$/.test(s)) {
    const [a, b] = s.split("-").map(Number);
    const max = Math.max(a, b);
    if (max === 1) return "1 игрока";
    if (max >= 2 && max <= 4) return `${s.replace("-", "–")} игрока`;
    return `${s.replace("-", "–")} игроков`;
  }
  const n = Number(s);
  if (Number.isFinite(n) && n > 0 && String(n) === s) {
    if (n === 1) return "1 игрока";
    if (n >= 2 && n <= 4) return `${n} игрока`;
    return `${n} игроков`;
  }
  return s;
}

export function shouldShowPlayersNeededBadge(raw: string | number): boolean {
  const s = normalizePlayersNeededInput(String(raw));
  return s !== "" && s !== "1";
}

export function parseWeekdays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

export function formatWeekdays(weekdays: number[], locale: AppLocale = "ru"): string {
  const sorted = [...new Set(weekdays)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 7) return locale === "en" ? "every day" : "каждый день";
  return sorted
    .map((d) => (locale === "en" ? weekdayShort(d, locale) : WEEKDAY_LABELS[d] ?? String(d)))
    .join(", ");
}

export function formatTimeRange(
  timeFrom?: string | null,
  timeTo?: string | null,
  locale: AppLocale = "ru",
): string {
  if (timeFrom && timeTo) return `${timeFrom}–${timeTo}`;
  if (timeFrom) return locale === "en" ? `from ${timeFrom}` : `с ${timeFrom}`;
  if (timeTo) return locale === "en" ? `until ${timeTo}` : `до ${timeTo}`;
  return "";
}

export function formatPlayListingSchedule(
  listing: {
    scheduleType: string;
    playAt?: Date | string | null;
    weekdays?: unknown;
    timeFrom?: string | null;
    timeTo?: string | null;
  },
  locale: AppLocale = "ru",
): string {
  const time = formatTimeRange(listing.timeFrom, listing.timeTo, locale);
  const intlLocale = locale === "en" ? "en-US" : "ru-RU";
  if (listing.scheduleType === "ONE_TIME" && listing.playAt) {
    const d = typeof listing.playAt === "string" ? new Date(listing.playAt) : listing.playAt;
    const date = d.toLocaleDateString(intlLocale, {
      day: "numeric",
      month: "long",
      weekday: "short",
    });
    const clock = d.toLocaleTimeString(intlLocale, { hour: "2-digit", minute: "2-digit" });
    return time ? `${date}, ${clock} (${time})` : `${date}, ${clock}`;
  }
  const days = formatWeekdays(parseWeekdays(listing.weekdays), locale);
  if (days && time) return `${days}, ${time}`;
  if (days) return days;
  if (time) return time;
  const scheduleLabels = locale === "en" ? PLAY_LISTING_SCHEDULE_LABELS_EN : PLAY_LISTING_SCHEDULE_LABELS;
  return scheduleLabels[listing.scheduleType] ?? listing.scheduleType;
}

export function formatRatingRange(
  ratingMin?: number | null,
  ratingMax?: number | null,
  locale: AppLocale = "ru",
): string | null {
  if (ratingMin != null && ratingMax != null) {
    return `${formatRating(ratingMin)}–${formatRating(ratingMax)}`;
  }
  if (ratingMin != null) {
    return locale === "en"
      ? `from ${formatRating(ratingMin)}`
      : `от ${formatRating(ratingMin)}`;
  }
  if (ratingMax != null) {
    return locale === "en"
      ? `up to ${formatRating(ratingMax)}`
      : `до ${formatRating(ratingMax)}`;
  }
  return null;
}

export function formatGameFormat(
  gameFormat?: string | null,
  locale: AppLocale = "ru",
): string | null {
  if (!gameFormat) return null;
  return clubTableFormatLabel(gameFormat as ClubTableFormatId, locale);
}
