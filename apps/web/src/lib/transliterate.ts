const CYRILLIC = /[\u0400-\u04FF]/;

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

export function hasCyrillic(text: string): boolean {
  return CYRILLIC.test(text);
}

/** Русский текст → латиница (паспортная схема). Уже латинские символы не меняются. */
export function transliterateRu(text: string): string {
  let out = "";
  for (const char of text) {
    const lower = char.toLowerCase();
    const mapped = TRANSLIT[lower];
    if (mapped !== undefined) {
      out +=
        char === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1);
      continue;
    }
    out += char;
  }
  return out;
}

export function latinizeNamePart(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return hasCyrillic(trimmed) ? transliterateRu(trimmed) : trimmed;
}
