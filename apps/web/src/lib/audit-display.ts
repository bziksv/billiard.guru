import { clubTableFormatLabel, type ClubTableFormatId } from "@/lib/club-table-formats";
import {
  PLAY_LISTING_RESPONSE_STATUS_LABELS,
  PLAY_LISTING_STATUS_LABELS,
} from "@/lib/play-listing-display";
import {
  IDEA_STATUS_LABELS,
  REGISTRATION_STATUS_LABELS,
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/validators";

const TABLE_FORMAT_IDS: ClubTableFormatId[] = [
  "PYRAMID",
  "POOL",
  "SNOOKER",
  "CHINESE_POOL",
  "CAROM",
];

/** Статус брони стола (PENDING, CONFIRMED, …). */
export function auditBookingStatusLabel(status: string): string {
  return REGISTRATION_STATUS_LABELS[status] ?? status;
}

/** Статус объявления «Покатать». */
export function auditPlayListingStatusLabel(status: string): string {
  return PLAY_LISTING_STATUS_LABELS[status] ?? status;
}

/** Статус отклика на «Покатать». */
export function auditPlayListingResponseStatusLabel(status: string): string {
  return PLAY_LISTING_RESPONSE_STATUS_LABELS[status] ?? status;
}

export function auditTableFormatLabel(format: string): string {
  if (TABLE_FORMAT_IDS.includes(format as ClubTableFormatId)) {
    return clubTableFormatLabel(format as ClubTableFormatId);
  }
  return format;
}

function replaceToken(text: string, token: string, label: string): string {
  if (token === label) return text;
  const re = new RegExp(`(?<=[\\s:→·]|^)${token}(?=[\\s.»;,]|$)`, "g");
  return text.replace(re, label);
}

/** Подписи для уже сохранённых записей журнала (сырые enum в summary). */
export function humanizeAuditSummary(text: string | null | undefined): string | null {
  if (!text) return text ?? null;

  let out = text;
  const statusMaps = [
    REGISTRATION_STATUS_LABELS,
    PLAY_LISTING_STATUS_LABELS,
    PLAY_LISTING_RESPONSE_STATUS_LABELS,
    TOURNAMENT_STATUS_LABELS,
    IDEA_STATUS_LABELS,
  ];
  for (const map of statusMaps) {
    for (const [token, label] of Object.entries(map)) {
      out = replaceToken(out, token, label);
    }
  }
  for (const id of TABLE_FORMAT_IDS) {
    out = replaceToken(out, id, clubTableFormatLabel(id));
  }
  return out;
}

export function auditBookingStatusSummary(
  status: string,
  source?: "telegram" | "site",
): string {
  const label = auditBookingStatusLabel(status);
  if (source === "telegram") return `Статус брони из Telegram: ${label}`;
  return `Статус брони: ${label}`;
}
