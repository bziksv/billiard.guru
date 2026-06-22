import type { AppLocale } from "@/i18n/routing";
import { transliterateRu } from "@/lib/transliterate";

export const COUNTRY_NAME_EN: Record<string, string> = {
  Армения: "Armenia",
  Азербайджан: "Azerbaijan",
  Беларусь: "Belarus",
  Грузия: "Georgia",
  Казахстан: "Kazakhstan",
  Кыргызстан: "Kyrgyzstan",
  Молдова: "Moldova",
  Россия: "Russia",
  Узбекистан: "Uzbekistan",
  Украина: "Ukraine",
};

export function localizedGeoName(
  nameRu: string,
  locale: AppLocale,
  nameEn?: string | null,
): string {
  if (locale === "ru") return nameRu;
  const trimmed = nameEn?.trim();
  if (trimmed) return trimmed;
  return COUNTRY_NAME_EN[nameRu] ?? transliterateRu(nameRu);
}

export function formatGeoLocation(
  cityNameRu: string,
  countryNameRu: string | null | undefined,
  locale: AppLocale,
  cityNameEn?: string | null,
  countryNameEn?: string | null,
): string {
  const city = localizedGeoName(cityNameRu, locale, cityNameEn);
  if (!countryNameRu) return city;
  return `${city}, ${localizedGeoName(countryNameRu, locale, countryNameEn)}`;
}
