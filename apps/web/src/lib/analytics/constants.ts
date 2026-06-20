export const VISITOR_COOKIE = "setka_vid";
export const VISITOR_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export const ANALYTICS_RETENTION_YEARS = 5;
export const ANALYTICS_RETENTION_DAYS = ANALYTICS_RETENTION_YEARS * 365;
export const ANALYTICS_RETENTION_LABEL = `${ANALYTICS_RETENTION_YEARS} лет`;

export type AnalyticsSurfaceId = "MARKETING" | "ADMIN" | "MANAGE";

export const ANALYTICS_SURFACE_LABELS: Record<AnalyticsSurfaceId, string> = {
  MARKETING: "Маркетинговый сайт",
  ADMIN: "Админ-панель",
  MANAGE: "Управление клубом",
};

export const ANALYTICS_SURFACE_SHORT_LABELS: Record<AnalyticsSurfaceId, string> = {
  MARKETING: "Сайт",
  ADMIN: "Админ",
  MANAGE: "Клуб",
};

export const ANALYTICS_PERIOD_OPTIONS = [
  { value: 1, label: "Сегодня" },
  { value: 7, label: "7 дней" },
  { value: 30, label: "30 дней" },
  { value: 90, label: "90 дней" },
] as const;

export const ANALYTICS_ALLOWED_PERIODS = new Set<number>(
  ANALYTICS_PERIOD_OPTIONS.map((option) => option.value),
);

/** Значение фильтра «страна не определена» в API последних визитов. */
export const ANALYTICS_COUNTRY_UNKNOWN = "__none__";
