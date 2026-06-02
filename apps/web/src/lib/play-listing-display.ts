import { clubTableFormatLabel, type ClubTableFormatId } from "@/lib/club-table-formats";
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

export function parseWeekdays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

export function formatWeekdays(weekdays: number[]): string {
  const sorted = [...new Set(weekdays)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 7) return "каждый день";
  return sorted.map((d) => WEEKDAY_LABELS[d] ?? String(d)).join(", ");
}

export function formatTimeRange(timeFrom?: string | null, timeTo?: string | null): string {
  if (timeFrom && timeTo) return `${timeFrom}–${timeTo}`;
  if (timeFrom) return `с ${timeFrom}`;
  if (timeTo) return `до ${timeTo}`;
  return "";
}

export function formatPlayListingSchedule(listing: {
  scheduleType: string;
  playAt?: Date | string | null;
  weekdays?: unknown;
  timeFrom?: string | null;
  timeTo?: string | null;
}): string {
  const time = formatTimeRange(listing.timeFrom, listing.timeTo);
  if (listing.scheduleType === "ONE_TIME" && listing.playAt) {
    const d = typeof listing.playAt === "string" ? new Date(listing.playAt) : listing.playAt;
    const date = d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      weekday: "short",
    });
    const clock = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    return time ? `${date}, ${clock} (${time})` : `${date}, ${clock}`;
  }
  const days = formatWeekdays(parseWeekdays(listing.weekdays));
  if (days && time) return `${days}, ${time}`;
  if (days) return days;
  if (time) return time;
  return PLAY_LISTING_SCHEDULE_LABELS[listing.scheduleType] ?? listing.scheduleType;
}

export function formatRatingRange(
  ratingMin?: number | null,
  ratingMax?: number | null,
): string | null {
  if (ratingMin != null && ratingMax != null) {
    return `${formatRating(ratingMin)}–${formatRating(ratingMax)}`;
  }
  if (ratingMin != null) return `от ${formatRating(ratingMin)}`;
  if (ratingMax != null) return `до ${formatRating(ratingMax)}`;
  return null;
}

export function formatGameFormat(gameFormat?: string | null): string | null {
  if (!gameFormat) return null;
  return clubTableFormatLabel(gameFormat as ClubTableFormatId);
}
