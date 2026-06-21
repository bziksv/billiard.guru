import type { AppLocale } from "@/i18n/routing";
import { parsePriceTiers, type PriceTier } from "@/lib/club-schedule";

const CYRILLIC = /[\u0400-\u04FF]/;

export function hasEnTranslation(value?: string | null): boolean {
  return Boolean(value?.trim());
}

/** Текст из БД: на EN — перевод, если есть, иначе RU. */
export function resolveLocalizedField(
  locale: AppLocale,
  ru: string,
  en?: string | null,
): string {
  const trimmedEn = en?.trim();
  if (locale === "en" && trimmedEn) return trimmedEn;
  return ru;
}

export function isRuOnlyOnEn(locale: AppLocale, ru: string, en?: string | null): boolean {
  if (locale !== "en") return false;
  if (hasEnTranslation(en)) return false;
  return CYRILLIC.test(ru.trim());
}

export function newsHasEnTranslation(row: {
  titleEn?: string | null;
  bodyEn?: string | null;
}): boolean {
  return hasEnTranslation(row.titleEn) && hasEnTranslation(row.bodyEn);
}

export function playListingHasEnTranslation(row: {
  titleEn?: string | null;
  bodyEn?: string | null;
}): boolean {
  return hasEnTranslation(row.titleEn);
}

export function ideaHasEnTranslation(row: {
  titleEn?: string | null;
  bodyEn?: string | null;
}): boolean {
  return hasEnTranslation(row.titleEn) && hasEnTranslation(row.bodyEn);
}

/** Тарифы клуба: на EN — переведённый JSON, если есть. */
export function resolveLocalizedPriceTiers(
  locale: AppLocale,
  ruRaw: unknown,
  enRaw?: unknown,
): PriceTier[] {
  const enTiers = parsePriceTiers(enRaw);
  if (locale === "en" && enTiers.length > 0) return enTiers;
  return parsePriceTiers(ruRaw);
}
