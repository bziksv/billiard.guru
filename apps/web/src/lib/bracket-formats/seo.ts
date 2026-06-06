import type { BracketFormatCode } from "@/lib/bracket-formats/catalog";
import {
  EXCEL_REF_64_FORMAT_LABEL,
  OLYMPIC_1L_BRONZE_FORMAT_LABEL,
  OLYMPIC_SINGLE_FORMAT_LABEL,
  TOURNAMENT_FORMAT_LABELS,
} from "@/lib/validators";

export type BracketFormatSeoEntry = {
  code: BracketFormatCode;
  slug: string;
  /** Заголовок H1 */
  pageTitle: string;
  metaTitle: string;
  metaDescription: string;
  /** Подзаголовок на лендинге */
  lead: string;
  /** Для карточек и бейджей: «16 человек», «парный, 32 команды» */
  participantBadge: string;
  keywords: string[];
};

const BRACKET_FORMAT_SEO: Record<BracketFormatCode, BracketFormatSeoEntry> = {
  EXCEL_REF_64: {
    code: "EXCEL_REF_64",
    slug: "setka-64-iz-excel",
    pageTitle: "Турнирная сетка на 64 человека (эталон Excel)",
    metaTitle: "Турнирная сетка на 64 человека — эталон Excel | billiard.guru",
    metaDescription:
      "Сетка на 64 участника по разметке из Excel: 119 встреч, фиксированные переходы. Демо-схема и создание турнира на billiard.guru.",
    lead: "Эталонная разметка 64→32 из таблицы Excel — для турниров с полным составом и заранее заданными переходами между встречами.",
    participantBadge: "64 человека",
    keywords: [
      "турнирная сетка 64",
      "сетка на 64 человека",
      "таблица турнира 64",
      "бильярд турнир",
    ],
  },
  OLYMPIC: {
    code: "OLYMPIC",
    slug: "olimpiyskaya-sistema",
    pageTitle: "Турнирная сетка олимпийская система",
    metaTitle: "Олимпийская турнирная сетка на выбывание | billiard.guru",
    metaDescription:
      "Классическая олимпийская сетка на выбывание: жеребьёвка по рейтингу, автопроходы, демо на 8–16 игроков. Создайте турнир на billiard.guru.",
    lead: "Классическая сетка на выбывание: проигравший покидает турнир, все пары известны сразу после жеребьёвки.",
    participantBadge: "2–64 человека",
    keywords: [
      "олимпийская система",
      "турнирная сетка олимпийская",
      "сетка на выбывание",
      "жеребьёвка турнира",
    ],
  },
  OLYMPIC_1L_BRONZE: {
    code: "OLYMPIC_1L_BRONZE",
    slug: "olimpiyskaya-s-bronzoy",
    pageTitle: "Олимпийская сетка с матчем за 3–4 место",
    metaTitle: "Олимпийская сетка + матч за 3–4 место | billiard.guru",
    metaDescription:
      "Олимпийская система с дополнительной игрой проигравших полуфиналистов за бронзу. Демо-схема и организация турнира на billiard.guru.",
    lead: "Сетка на выбывание плюс отдельный матч между проигравшими в полуфиналах — для честного определения 3-го и 4-го места.",
    participantBadge: "4–64 человека",
    keywords: [
      "олимпийская сетка бронза",
      "матч за 3 место",
      "турнирная сетка с бронзой",
    ],
  },
  SWISS: {
    code: "SWISS",
    slug: "shveysarskaya-sistema",
    pageTitle: "Швейцарская турнирная система (по турам)",
    metaTitle: "Швейцарская система — турнирная сетка по турам | billiard.guru",
    metaDescription:
      "Швейцарская система: пары каждого тура подбираются по очкам и рейтингу. Демо-схема, описание правил и создание турнира на billiard.guru.",
    lead: "Каждый тур формируется после завершения предыдущего: игроки с одинаковым числом побед встречаются между собой.",
    participantBadge: "2–128 человек",
    keywords: [
      "швейцарская система",
      "турнирная сетка швейцарская",
      "швейцарка турнир",
    ],
  },
  FIXED_SWISS: {
    code: "FIXED_SWISS",
    slug: "setka-16-chelovek",
    pageTitle: "Турнирная сетка / таблица на 16 человек",
    metaTitle: "Турнирная сетка на 16 человек — до 2 поражений | billiard.guru",
    metaDescription:
      "Турнирная сетка и таблица на 16 участников: 27 встреч, фиксированные переходы победителя и проигравшего. Демо-схема и создание турнира на billiard.guru.",
    lead: "Эталонная сетка Setka на 16 участников (16→8): все встречи и переходы заданы заранее — 27 матчей, 7 колонок.",
    participantBadge: "16 человек",
    keywords: [
      "турнирная сетка 16",
      "сетка на 16 человек",
      "таблица турнира 16",
      "сетка до 2 поражений",
    ],
  },
  FIXED_SWISS_16_BRONZE: {
    code: "FIXED_SWISS_16_BRONZE",
    slug: "setka-16-chelovek-s-bronzoy",
    pageTitle: "Турнирная сетка на 16 человек с матчем за 3–4 место",
    metaTitle: "Сетка на 16 человек + матч за 3–4 место | billiard.guru",
    metaDescription:
      "Турнирная таблица на 16 участников с дополнительной игрой за бронзу (#28). Демо-схема 28 встреч и организация на billiard.guru.",
    lead: "Та же эталонная сетка 16→8 (27 встреч), но 3-е и 4-е места определяются отдельным матчем проигравших полуфиналистов.",
    participantBadge: "16 человек",
    keywords: [
      "сетка 16 человек бронза",
      "турнирная таблица 16",
      "матч за 3 место 16 участников",
    ],
  },
  FIXED_SWISS_32: {
    code: "FIXED_SWISS_32",
    slug: "setka-32-chelovek",
    pageTitle: "Турнирная сетка / таблица на 32 человека",
    metaTitle: "Турнирная сетка на 32 человека — до 2 поражений | billiard.guru",
    metaDescription:
      "Турнирная сетка и таблица на 32 участника: 59 встреч, фиксированная схема 32→16. Демо и создание турнира на billiard.guru.",
    lead: "Фиксированная швейцарская сетка на 32 участника: 59 встреч, 10 колонок, нижняя ветка и олимпийка с 1/8 финала.",
    participantBadge: "32 человека",
    keywords: [
      "турнирная сетка 32",
      "сетка на 32 человека",
      "таблица турнира 32",
    ],
  },
  FIXED_SWISS_32_BRONZE: {
    code: "FIXED_SWISS_32_BRONZE",
    slug: "setka-32-chelovek-s-bronzoy",
    pageTitle: "Турнирная сетка на 32 человека с матчем за 3–4 место",
    metaTitle: "Сетка на 32 человека + матч за 3–4 | billiard.guru",
    metaDescription:
      "Турнирная таблица на 32 участника с матчем за бронзу (#60). Демо-схема 60 встреч на billiard.guru.",
    lead: "Эталон 32→16 (59 встреч) плюс матч #60 между проигравшими полуфиналистами за 3-е и 4-е место.",
    participantBadge: "32 человека",
    keywords: ["сетка 32 бронза", "турнирная таблица 32", "матч за 3 место"],
  },
  FIXED_SWISS_64: {
    code: "FIXED_SWISS_64",
    slug: "setka-64-chelovek",
    pageTitle: "Турнирная сетка / таблица на 64 человека",
    metaTitle: "Турнирная сетка на 64 человека — до 2 поражений | billiard.guru",
    metaDescription:
      "Турнирная сетка и таблица на 64 участника: 119 встреч, фиксированная схема 64→32. Демо и создание турнира на billiard.guru.",
    lead: "Крупная фиксированная сетка на 64 участника: 119 встреч, 11 колонок — нижняя ветка, 1/8, полуфинал и финал.",
    participantBadge: "64 человека",
    keywords: [
      "турнирная сетка 64",
      "сетка на 64 человека",
      "таблица турнира 64",
    ],
  },
  FIXED_SWISS_64_BRONZE: {
    code: "FIXED_SWISS_64_BRONZE",
    slug: "setka-64-chelovek-s-bronzoy",
    pageTitle: "Турнирная сетка на 64 человека с матчем за 3–4 место",
    metaTitle: "Сетка на 64 человека + матч за 3–4 | billiard.guru",
    metaDescription:
      "Турнирная таблица на 64 участника с матчем за бронзу (#120). Демо-схема 120 встреч на billiard.guru.",
    lead: "Эталон 64→32 (119 встреч) плюс матч #120 за 3-е и 4-е место между проигравшими полуфиналистами.",
    participantBadge: "64 человека",
    keywords: ["сетка 64 бронза", "турнир 64 участника", "матч за 3 место"],
  },
  PAIR_OLYMPIC: {
    code: "PAIR_OLYMPIC",
    slug: "par-olimpiyskaya-sistema",
    pageTitle: "Парная олимпийская турнирная сетка",
    metaTitle: "Парная олимпийская сетка на выбывание | billiard.guru",
    metaDescription:
      "Олимпийская сетка для парных турниров: команды из двух игроков, жеребьёвка по сумме рейтингов. Демо и регистрация на billiard.guru.",
    lead: "Классическая сетка на выбывание для команд из двух игроков — все пары известны после жеребьёвки.",
    participantBadge: "2–64 команды",
    keywords: ["парная олимпийская сетка", "парный турнир сетка", "парный бильярд"],
  },
  PAIR_OLYMPIC_1L_BRONZE: {
    code: "PAIR_OLYMPIC_1L_BRONZE",
    slug: "par-olimpiyskaya-s-bronzoy",
    pageTitle: "Парная олимпийская сетка с матчем за 3–4 место",
    metaTitle: "Парная олимпийская сетка + бронза | billiard.guru",
    metaDescription:
      "Парный турнир на выбывание с матчем проигравших полуфиналистов за 3–4 место. Демо-схема на billiard.guru.",
    lead: "Парная олимпийская система с дополнительной игрой за бронзу между проигравшими в полуфиналах.",
    participantBadge: "4–64 команды",
    keywords: ["парная сетка бронза", "парный турнир 3 место"],
  },
  PAIR_SWISS: {
    code: "PAIR_SWISS",
    slug: "par-shveysarskaya-sistema",
    pageTitle: "Парная швейцарская система (по турам)",
    metaTitle: "Парная швейцарская турнирная сетка | billiard.guru",
    metaDescription:
      "Швейцарская система для парных турниров: команды подбираются по турам. Демо-схема и создание события на billiard.guru.",
    lead: "Швейцарка для команд из двух игроков — пары каждого тура формируются после завершения предыдущего.",
    participantBadge: "2–128 команд",
    keywords: ["парная швейцарская", "швейцарка парный турнир"],
  },
  FIXED_PAIR_SWISS: {
    code: "FIXED_PAIR_SWISS",
    slug: "par-setka-16-komand",
    pageTitle: "Парная турнирная сетка на 16 команд",
    metaTitle: "Парная сетка на 16 команд — до 2 поражений | billiard.guru",
    metaDescription:
      "Фиксированная сетка для парного турнира на 16 команд (16→8). Демо-схема 27 встреч на billiard.guru.",
    lead: "Парный аналог эталонной сетки 16→8: команды из двух игроков, 27 встреч с фиксированными переходами.",
    participantBadge: "16 команд",
    keywords: ["парная сетка 16", "парный турнир 16 команд", "сетка на 16 пар"],
  },
  FIXED_PAIR_SWISS_16_BRONZE: {
    code: "FIXED_PAIR_SWISS_16_BRONZE",
    slug: "par-setka-16-komand-s-bronzoy",
    pageTitle: "Парная сетка на 16 команд с матчем за 3–4 место",
    metaTitle: "Парная сетка 16 команд + бронза | billiard.guru",
    metaDescription:
      "Парный турнир на 16 команд с матчем за 3–4 место (#28). Демо-схема на billiard.guru.",
    lead: "Парная сетка 16→8 с дополнительной игрой проигравших полуфиналистов за бронзу.",
    participantBadge: "16 команд",
    keywords: ["парная сетка 16 бронза", "парный турнир таблица"],
  },
  FIXED_PAIR_SWISS_32: {
    code: "FIXED_PAIR_SWISS_32",
    slug: "par-setka-32-komand",
    pageTitle: "Парная турнирная сетка на 32 команды",
    metaTitle: "Парная сетка на 32 команды | billiard.guru",
    metaDescription:
      "Фиксированная парная сетка на 32 команды: 59 встреч, эталон 32→16. Демо на billiard.guru.",
    lead: "Парный аналог сетки 32→16 — 59 встреч для команд из двух игроков.",
    participantBadge: "32 команды",
    keywords: ["парная сетка 32", "парный турнир 32 команды"],
  },
  FIXED_PAIR_SWISS_32_BRONZE: {
    code: "FIXED_PAIR_SWISS_32_BRONZE",
    slug: "par-setka-32-komand-s-bronzoy",
    pageTitle: "Парная сетка на 32 команды с матчем за 3–4 место",
    metaTitle: "Парная сетка 32 команды + бронза | billiard.guru",
    metaDescription:
      "Парный турнир на 32 команды с матчем за бронзу (#60). Демо-схема на billiard.guru.",
    lead: "Парная сетка 32→16 с матчем #60 между проигравшими полуфиналистами.",
    participantBadge: "32 команды",
    keywords: ["парная сетка 32 бронза"],
  },
  FIXED_PAIR_SWISS_64: {
    code: "FIXED_PAIR_SWISS_64",
    slug: "par-setka-64-komand",
    pageTitle: "Парная турнирная сетка на 64 команды",
    metaTitle: "Парная сетка на 64 команды | billiard.guru",
    metaDescription:
      "Фиксированная парная сетка на 64 команды: 119 встреч. Демо-схема на billiard.guru.",
    lead: "Парный аналог эталона 64→32 — 119 встреч для команд из двух игроков.",
    participantBadge: "64 команды",
    keywords: ["парная сетка 64", "парный турнир 64 команды"],
  },
  FIXED_PAIR_SWISS_64_BRONZE: {
    code: "FIXED_PAIR_SWISS_64_BRONZE",
    slug: "par-setka-64-komand-s-bronzoy",
    pageTitle: "Парная сетка на 64 команды с матчем за 3–4 место",
    metaTitle: "Парная сетка 64 команды + бронза | billiard.guru",
    metaDescription:
      "Парный турнир на 64 команды с матчем за бронзу (#120). Демо на billiard.guru.",
    lead: "Парная сетка 64→32 с матчем #120 за 3-е и 4-е место.",
    participantBadge: "64 команды",
    keywords: ["парная сетка 64 бронза"],
  },
};

const slugToSeo = new Map(
  Object.values(BRACKET_FORMAT_SEO).map((entry) => [entry.slug, entry]),
);

export function getBracketFormatSeo(code: BracketFormatCode): BracketFormatSeoEntry {
  return BRACKET_FORMAT_SEO[code];
}

export function getBracketFormatSeoBySlug(slug: string): BracketFormatSeoEntry | undefined {
  return slugToSeo.get(slug);
}

export function getAllBracketFormatSeoSlugs(): string[] {
  return [...slugToSeo.keys()];
}

/** Короткая подпись формата для UI (из validators / каталога) */
export function bracketFormatDisplayLabel(code: BracketFormatCode): string {
  if (code === "OLYMPIC") return OLYMPIC_SINGLE_FORMAT_LABEL;
  if (code === "OLYMPIC_1L_BRONZE") return OLYMPIC_1L_BRONZE_FORMAT_LABEL;
  if (code === "EXCEL_REF_64") return EXCEL_REF_64_FORMAT_LABEL;
  if (code === "SWISS") return "Швейцарская (по турам, одиночный)";
  if (code === "PAIR_OLYMPIC") return "Парный (фикс. сетка)";
  if (code === "PAIR_SWISS") return "Парный швейцарская (по турам)";
  return TOURNAMENT_FORMAT_LABELS[code] ?? code;
}

export const BRACKET_PLATFORM_FEATURES = [
  {
    title: "Жеребьёвка по рейтингу",
    text: "Участники получают посев автоматически — сильнейшие не встречаются в первом туре.",
  },
  {
    title: "Автоматические переходы",
    text: "После внесения счёта победитель и проигравший попадают в следующие встречи без ручной правки.",
  },
  {
    title: "Публичная ссылка на сетку",
    text: "Игроки и зрители видят актуальную схему на странице турнира — удобно с телефона.",
  },
  {
    title: "Фора по рейтингу",
    text: "Разница рейтингов отображается в карточке встречи — игроки знают условия до матча.",
  },
  {
    title: "Telegram-уведомления",
    text: "Напоминания о матчах и результаты — в боте billiard.guru после регистрации.",
  },
  {
    title: "Протокол и места",
    text: "Итоговая таблица мест формируется по завершении турнира — готова для отчёта.",
  },
] as const;
