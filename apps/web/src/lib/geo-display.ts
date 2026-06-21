import type { AppLocale } from "@/i18n/routing";

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

const TRANSLIT: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function transliterateRu(text: string): string {
  let out = "";
  for (const char of text) {
    const lower = char.toLowerCase();
    const mapped = TRANSLIT[lower];
    if (mapped !== undefined) {
      out +=
        char === lower
          ? mapped
          : mapped.charAt(0).toUpperCase() + mapped.slice(1);
      continue;
    }
    out += char;
  }
  return out;
}

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
