import type { BracketFormatCode } from "@/lib/bracket-formats/catalog";
import {
  FIXED_SWISS_32_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_32_FORMAT_LABEL,
  FIXED_SWISS_32R8_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_32R8_1_3_mesto_FORMAT_LABEL,
  FIXED_SWISS_32R8_FORMAT_LABEL,
  OLYMPIC_1L_BRONZE_FORMAT_LABEL,
  OLYMPIC_SINGLE_FORMAT_LABEL,
} from "@/lib/validators";

export type BracketFormatSeoEntry = {
  code: BracketFormatCode;
  slug: string;
  pageTitle: string;
  metaTitle: string;
  metaDescription: string;
  lead: string;
  participantBadge: string;
  keywords: string[];
};

const BRACKET_FORMAT_SEO: Record<BracketFormatCode, BracketFormatSeoEntry> = {
  OLYMPIC: {
    code: "OLYMPIC",
    slug: "olimpiyskaya-sistema",
    pageTitle: "Турнирная сетка oлимпийская система",
    metaTitle: "Oлимпийская турнирная сетка на выбывание | billiard.guru",
    metaDescription:
      "Классическая oлимпийская сетка на выбывание: жеребьёвка по рейтингу, автопроходы, демо на 8–16 игроков. Создайте турнир на billiard.guru.",
    lead: "Классическая сетка на выбывание: проигравший покидает турнир, все пары известны сразу после жеребьёвки.",
    participantBadge: "2–64 человека",
    keywords: [
      "олимпийская система",
      "турнирная сетка oлимпийская",
      "сетка на выбывание",
      "жеребьёвка турнира",
    ],
  },
  OLYMPIC_1L_BRONZE: {
    code: "OLYMPIC_1L_BRONZE",
    slug: "olimpiyskaya-s-bronzoy",
    pageTitle: "Oлимпийская сетка с матчем за 3–4 место",
    metaTitle: "Oлимпийская сетка + матч за 3–4 место | billiard.guru",
    metaDescription:
      "Oлимпийская система с дополнительной игрой проигравших полуфиналистов за бронзу. Демо-схема и организация турнира на billiard.guru.",
    lead: "Сетка на выбывание плюс отдельный матч между проигравшими в полуфиналах — для честного определения 3-го и 4-го места.",
    participantBadge: "4–64 человека",
    keywords: [
      "олимпийская сетка бронза",
      "матч за 3 место",
      "турнирная сетка с бронзой",
    ],
  },
  FIXED_SWISS_32R4_2_3_mesta: {
    code: "FIXED_SWISS_32R4_2_3_mesta",
    slug: "setka-32-chelovek-1-4",
    pageTitle: "Турнирная сетка на 32 человека — олимпийка с 1/4",
    metaTitle: "Турнирная сетка на 32 человека — до 2 поражений, 1/4 | billiard.guru",
    metaDescription:
      "Турнирная сетка на 32 участника: 59 встреч, подпись «олимпийка с 1/4». Демо на billiard.guru.",
    lead: "Фиксированная сетка на 32 участника (59 встреч), олимпийка с 1/4 — проигравшие полуфиналисты делят 3-е место.",
    participantBadge: "32 человека",
    keywords: [
      "турнирная сетка 32",
      "сетка на 32 человека",
      "таблица турнира 32",
    ],
  },
  FIXED_SWISS_32R4_1_3_mesto: {
    code: "FIXED_SWISS_32R4_1_3_mesto",
    slug: "setka-32-chelovek-1-4-s-bronzoy",
    pageTitle: "Сетка на 32 человека с 1/4 и матчем за 3–4 место",
    metaTitle: "Сетка на 32 человека (1/4) + матч за 3–4 | billiard.guru",
    metaDescription:
      "Турнирная таблица на 32 с олимпийкой с 1/4 и матчем за бронзу (#60). Демо 60 встреч на billiard.guru.",
    lead: "Сетка 32→16 (59+1 встреч) с подписью «1/4» плюс матч #60 за 3–4 между проигравшими полуфиналистами.",
    participantBadge: "32 человека",
    keywords: ["сетка 32 бронза", "турнирная таблица 32", "матч за 3 место"],
  },
  FIXED_SWISS_32R8_2_3_mesta: {
    code: "FIXED_SWISS_32R8_2_3_mesta",
    slug: "setka-32-chelovek-1-8",
    pageTitle: "Турнирная сетка на 32 человека — олимпийка с 1/8",
    metaTitle: "Турнирная сетка на 32 человека — до 2 поражений, 1/8 | billiard.guru",
    metaDescription:
      "Турнирная сетка на 32 участника: 55 встреч, oлимпийka с 1/8 — проигравшие в 1/8 сразу на места 9–12.",
    lead: "Фиксированная сетка на 32: 55 встреч, 9 колонок, oлимпийka с 1/8 — вылет с 1/8 на места 9–12, без нижней тур 4.",
    participantBadge: "32 человека",
    keywords: [
      "турнирная сетка 32",
      "сетка на 32 человека",
      "таблица турнира 32",
    ],
  },
  FIXED_SWISS_32R8_BRONZE: {
    code: "FIXED_SWISS_32R8_BRONZE",
    slug: "setka-32-chelovek-1-8-s-bronzoy",
    pageTitle: "Сетка на 32 с 1/8 и матчем за 3–4 место",
    metaTitle: "Сетка на 32 (1/8) + матч за 3–4 | billiard.guru",
    metaDescription:
      "Турнирная таблица на 32 с олимпийкой с 1/8 и матчем за бронзу (#60). Демо 60 встреч на billiard.guru.",
    lead: "Oлимпийka с 1/8 (59 встреч) плюс матч #60 между проигравшими полуфиналистами за 3-е и 4-е место.",
    participantBadge: "32 человека",
    keywords: ["сетка 32 бронза", "турнирная таблица 32", "матч за 3 место"],
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

export function bracketFormatDisplayLabel(code: BracketFormatCode): string {
  if (code === "OLYMPIC") return OLYMPIC_SINGLE_FORMAT_LABEL;
  if (code === "OLYMPIC_1L_BRONZE") return OLYMPIC_1L_BRONZE_FORMAT_LABEL;
  if (code === "FIXED_SWISS_32R4_2_3_mesta") return FIXED_SWISS_32_FORMAT_LABEL;
  if (code === "FIXED_SWISS_32R4_1_3_mesto") return FIXED_SWISS_32_BRONZE_FORMAT_LABEL;
  if (code === "FIXED_SWISS_32R8_2_3_mesta") return FIXED_SWISS_32R8_FORMAT_LABEL;
  if (code === "FIXED_SWISS_32R8_1_3_mesto") return FIXED_SWISS_32R8_1_3_mesto_FORMAT_LABEL;
  if (code === "FIXED_SWISS_32R8_BRONZE") return FIXED_SWISS_32R8_BRONZE_FORMAT_LABEL;
  return code;
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
