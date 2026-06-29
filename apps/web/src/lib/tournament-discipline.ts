import {
  CLUB_TABLE_FORMATS,
  clubTableFormatLabel,
  type ClubTableFormatId,
} from "@/lib/club-table-formats";

/** Дисциплина турнира = тип стола (Пирамида/Пул/Снукер/Китайский пул/Карамболь). */
export type DisciplineId = ClubTableFormatId;

export type GameTypeOption = { id: string; ru: string; en: string };

/** Подвиды (тип игры) внутри дисциплины. */
const GAME_TYPES: Record<DisciplineId, GameTypeOption[]> = {
  PYRAMID: [
    { id: "MOSCOW", ru: "Московская", en: "Moscow pyramid" },
    { id: "COMBINED", ru: "Комбинированная", en: "Combined pyramid" },
    { id: "FREE", ru: "Свободная", en: "Free pyramid" },
    { id: "DYNAMIC", ru: "Динамичная", en: "Dynamic pyramid" },
  ],
  POOL: [
    { id: "P8", ru: "Восьмёрка", en: "8-ball" },
    { id: "P9", ru: "Девятка", en: "9-ball" },
    { id: "P10", ru: "Десятка", en: "10-ball" },
    { id: "STRAIGHT", ru: "Прямой пул (14.1)", en: "Straight pool (14.1)" },
  ],
  SNOOKER: [
    { id: "FULL", ru: "Классический", en: "Classic" },
    { id: "SIX_RED", ru: "Снукер 6 красных", en: "Six-red" },
  ],
  CHINESE_POOL: [{ id: "HEYBALL", ru: "Хайбол", en: "Heyball" }],
  CAROM: [
    { id: "THREE_CUSHION", ru: "Трёхбортный", en: "Three-cushion" },
    { id: "ONE_CUSHION", ru: "Однобортный", en: "One-cushion" },
    { id: "FREE_GAME", ru: "Свободная партия", en: "Free game" },
  ],
};

export const TOURNAMENT_DISCIPLINES = CLUB_TABLE_FORMATS;

const DISCIPLINE_IDS = new Set<string>(CLUB_TABLE_FORMATS.map((d) => d.id));

export function isDisciplineId(value: unknown): value is DisciplineId {
  return typeof value === "string" && DISCIPLINE_IDS.has(value);
}

export function gameTypesForDiscipline(
  discipline: string | null | undefined,
): GameTypeOption[] {
  if (!discipline || !isDisciplineId(discipline)) return [];
  return GAME_TYPES[discipline];
}

export function isGameTypeId(
  discipline: string | null | undefined,
  gameType: unknown,
): boolean {
  if (typeof gameType !== "string") return false;
  return gameTypesForDiscipline(discipline).some((g) => g.id === gameType);
}

export function disciplineLabel(
  discipline: string | null | undefined,
  locale: "ru" | "en" = "ru",
): string | null {
  if (!discipline || !isDisciplineId(discipline)) return null;
  return clubTableFormatLabel(discipline, locale);
}

export function gameTypeLabel(
  discipline: string | null | undefined,
  gameType: string | null | undefined,
  locale: "ru" | "en" = "ru",
): string | null {
  if (!gameType) return null;
  const option = gameTypesForDiscipline(discipline).find(
    (g) => g.id === gameType,
  );
  if (!option) return null;
  return locale === "en" ? option.en : option.ru;
}

/** Полная подпись: «Пирамида · Московская» или «Пул». null, если дисциплина не задана. */
export function disciplineGroupLabel(
  discipline: string | null | undefined,
  gameType: string | null | undefined,
  locale: "ru" | "en" = "ru",
): string | null {
  const base = disciplineLabel(discipline, locale);
  if (!base) return null;
  const sub = gameTypeLabel(discipline, gameType, locale);
  return sub ? `${base} · ${sub}` : base;
}

/** Стабильный ключ группировки статистики по типу игры. */
export function disciplineGroupKey(
  discipline: string | null | undefined,
  gameType: string | null | undefined,
): string {
  if (!discipline || !isDisciplineId(discipline)) return "__none__";
  return gameType ? `${discipline}:${gameType}` : discipline;
}
