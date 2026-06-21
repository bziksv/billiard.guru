import type { PublicBracketFormat } from "@/lib/bracket-formats/public-formats";

export const BRACKETS_INDEX_INTRO =
  "Выберите формат под ваш турнир — на каждой странице интерактивная демо-схема и кнопка «Создать турнир». Жеребьёвка, сетка и результаты — на платформе, без Excel и ручных таблиц.";

export type BracketsFormatGroup = {
  id: string;
  title: string;
  lead: string;
  match: (format: PublicBracketFormat) => boolean;
};

export const BRACKETS_FORMAT_GROUPS: BracketsFormatGroup[] = [
  {
    id: "single-knockout",
    title: "Одиночные — на выбывание",
    lead: "Классический кубок: проигравший выбывает, сетка готова сразу после жеребьёвки.",
    match: (f) =>
      f.definition.pairing === "single" && f.definition.layout === "olympic",
  },
  {
    id: "single-swiss",
    title: "Одиночные — швейцарская",
    lead: "Каждый играет несколько партий: пары следующего тура подбираются по результатам.",
    match: (f) =>
      f.definition.pairing === "single" && f.definition.layout === "swiss_dynamic",
  },
  {
    id: "single-fixed",
    title: "Одиночные — сетки на 16, 32 и 64",
    lead: "Готовая схема под полный состав: все встречи и переходы заданы заранее — удобно для клубных турниров.",
    match: (f) =>
      f.definition.pairing === "single" && f.definition.layout === "swiss_fixed",
  },
  {
    id: "pair-knockout",
    title: "Парные — на выбывание",
    lead: "Турнир команд из двух игроков в формате knockout.",
    match: (f) =>
      f.definition.pairing === "pair" && f.definition.layout === "olympic",
  },
  {
    id: "pair-swiss",
    title: "Парные — швейцарская",
    lead: "Швейцарка для пар: команды встречаются по турам с учётом очков и рейтинга.",
    match: (f) =>
      f.definition.pairing === "pair" && f.definition.layout === "swiss_dynamic",
  },
  {
    id: "pair-fixed",
    title: "Парные — сетки на 16, 32 и 64 команды",
    lead: "Фиксированные схемы для парных турниров с полным составом.",
    match: (f) =>
      f.definition.pairing === "pair" && f.definition.layout === "swiss_fixed",
  },
];

/** Короткая подпись на карточке каталога — без технических деталей */
export const BRACKET_INDEX_TEASER: Record<string, string> = {
  OLYMPIC: "Классика: проиграл — выбыл. Жеребьёвка по рейтингу.",
  OLYMPIC_1L_BRONZE: "Олимпийская сетка плюс отдельный матч за 3–4 место.",
  SWISS: "Много игр у каждого — пары тура подбираются по очкам.",
  FIXED_SWISS: "Готовая сетка на 16 участников, до двух поражений.",
  FIXED_SWISS_16_BRONZE: "Сетка на 16 с честным определением 3-го и 4-го места.",
  FIXED_SWISS_8R4_1_3_mesto:
    "8 участников, oлимпийka с 1/4 и матч #14 за бронзу между полуфиналистами.",
  FIXED_SWISS_16R4_2_3_mesta:
    "16 участников, oлимпийka с 1/4 — проигравшие полуфиналисты делят 3-е место без доп. игры.",
  FIXED_SWISS_16R4_1_3_mesto:
    "16 участников, oлимпийka с 1/4 и матч #28 за бронзу между полуфиналистами.",
  FIXED_SWISS_16R2_1_3_mesto:
    "16 участников, oлимпийka с 1/2 (без 1/4) — проигравшие полуфинала падают на #28 за 3–4.",
  FIXED_SWISS_32: "Турнир на 32 участника — олимпийка с 1/4 финала.",
  FIXED_SWISS_32_BRONZE: "32 участника, 1/4 и матч за бронзу между полуфиналистами.",
  FIXED_SWISS_32R8_2_3_mesta: "32 участника, олимпийка с 1/8 — проигравшие в 1/8 сразу на места 9–12.",
  FIXED_SWISS_32R8_1_3_mesto: "32 участника, R8_2_3_mesta + отдельный матч за 3–4 место (#60).",
  FIXED_SWISS_32R8_BRONZE: "32 участника, 1/8 и матч за бронзу между полуфиналистами.",
  FIXED_SWISS_64R8_2_3_mesta: "64 участника, олимпийка с 1/8 — проигравшие в 1/8 сразу на места 17–24.",
  FIXED_SWISS_64R8_1_3_mesto: "64 участника, R8 elim + отдельный матч за 3–4 место (#120).",
  FIXED_SWISS_128R8_2_3_mesta: "128 участников, олимпийка с 1/8 — проигравшие в 1/8 сразу на места 33–48.",
  FIXED_SWISS_128R8_1_3_mesto: "128 участников, R8 elim + отдельный матч за 3–4 место (#248).",
  FIXED_SWISS_256R8_1_3_mesto: "256 участников, oлимпийka с 1/16 + матч за 3–4 (#456).",
  FIXED_SWISS_64: "Крупный турнир на 64 участника — полная схема из коробки.",
  FIXED_SWISS_64_BRONZE: "64 участника и отдельная игра за 3–4 место.",
  EXCEL_REF_64: "Проверенная схема на 64 участника для больших турниров.",
  PAIR_OLYMPIC: "Парный knockout: команды из двух игроков.",
  PAIR_OLYMPIC_1L_BRONZE: "Парная олимпийская с матчем за бронзу.",
  PAIR_SWISS: "Парная швейцарка — команды играют несколько туров.",
  FIXED_PAIR_SWISS: "Парная сетка на 16 команд.",
  FIXED_PAIR_SWISS_16_BRONZE: "16 пар и матч за 3–4 место.",
  FIXED_PAIR_SWISS_32: "Парный турнир на 32 команды.",
  FIXED_PAIR_SWISS_32_BRONZE: "32 команды с матчем за бронзу.",
  FIXED_PAIR_SWISS_64: "Парная схема на 64 команды.",
  FIXED_PAIR_SWISS_64_BRONZE: "64 команды и игра за бронзу.",
};

export function bracketIndexTeaser(format: PublicBracketFormat): string {
  const fromMap = BRACKET_INDEX_TEASER[format.definition.code];
  if (fromMap) return fromMap;
  const first = format.seo.lead.split(/[.—]/)[0]?.trim();
  if (first) return `${first}.`;
  return format.seo.lead;
}

export const BRACKETS_CHOOSE_ROWS = [
  {
    format: "Олимпийская",
    forWhom: "Кубок, быстрый турнир на выбывание",
    size: "От 4 до 64 участников",
  },
  {
    format: "Олимпийская + бронза",
    forWhom: "Knockout, но 3-е место — в отдельном матче",
    size: "От 4 до 64 участников",
  },
  {
    format: "Швейцарская",
    forWhom: "Много игр у каждого, состав может быть любым",
    size: "Гибкий состав",
  },
  {
    format: "Сетка на 16 / 32 / 64",
    forWhom: "Клубный турнир с полным составом",
    size: "Ровно 16, 32 или 64 участника",
  },
] as const;
