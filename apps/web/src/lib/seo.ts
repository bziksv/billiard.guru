import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";
import {
  getAllBracketFormatSeoSlugs,
  getBracketFormatSeoBySlug,
  type BracketFormatSeoEntry,
} from "@/lib/bracket-formats/seo";
import { LEGAL_DOCS, type LegalDocSlug } from "@/lib/legal";

export const SEO_SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://billiard.guru";

export type SeoInput = {
  /** Короткий title; суффикс «| billiard.guru» добавляет title.template в layout. */
  title: string;
  description: string;
  keywords: string[];
  path?: string;
  noindex?: boolean;
  openGraphType?: "website" | "article";
};

export function buildPageMetadata(input: SeoInput): Metadata {
  const metadata: Metadata = {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
  };

  if (input.path) {
    const url = `${SEO_SITE_URL}${input.path}`;
    metadata.alternates = { canonical: url };
    metadata.openGraph = {
      title: `${input.title} | ${APP_NAME}`,
      description: input.description,
      url,
      type: input.openGraphType ?? "website",
    };
  }

  if (input.noindex) {
    metadata.robots = { index: false, follow: false };
  }

  return metadata;
}

/** Статические маркетинговые страницы — единый реестр. */
export const STATIC_PAGE_SEO = {
  home: {
    title: "Турниры по бильярду онлайн",
    description:
      "billiard.guru — организация турниров по бильярду: сетки, жеребьёвка, рейтинг игроков, клубы и трансляции со столов.",
    keywords: [
      "бильярд турниры",
      "турнирная сетка бильярд",
      "billiard guru",
      "организация турнира бильярд",
    ],
    path: "/",
  },
  tournaments: {
    title: "Турниры по бильярду — расписание и регистрация",
    description:
      "Актуальные и предстоящие турниры по бильярду: регистрация онлайн, формат сетки, клуб и дата проведения.",
    keywords: [
      "турниры бильярд",
      "расписание турниров бильярд",
      "регистрация на турнир бильярд",
    ],
    path: "/tournaments",
  },
  clubs: {
    title: "Бильярдные клубы — каталог на карте",
    description:
      "Каталог бильярдных клубов с адресами, столами и ближайшими турнирами. Найдите клуб в своём городе.",
    keywords: [
      "бильярдные клубы",
      "каталог клубов бильярд",
      "бильярд клуб рядом",
    ],
    path: "/clubs",
  },
  players: {
    title: "Рейтинг игроков бильярда",
    description:
      "Рейтинг и профили игроков billiard.guru: история турниров, город и текущий рейтинг.",
    keywords: [
      "рейтинг бильярд",
      "игроки бильярд",
      "таблица рейтинга бильярд",
    ],
    path: "/players",
  },
  coaches: {
    title: "Тренеры по бильярду",
    description:
      "Тренеры и преподаватели бильярда: контакты, город и клуб для индивидуальных занятий.",
    keywords: [
      "тренер бильярд",
      "обучение бильярду",
      "тренеры бильярд",
    ],
    path: "/coaches",
  },
  news: {
    title: "Новости billiard.guru",
    description:
      "Новости сервиса billiard.guru: обновления платформы, турниры и анонсы для игроков и клубов.",
    keywords: [
      "новости бильярд",
      "billiard guru новости",
      "анонсы турниров",
    ],
    path: "/news",
  },
  pokatat: {
    title: "Покатать — объявления об игре",
    description:
      "Объявления «покатать» от игроков billiard.guru: найдите партнёра для игры в бильярд в своём городе.",
    keywords: [
      "покатать бильярд",
      "найти партнёра бильярд",
      "игра в бильярд объявления",
    ],
    path: "/pokatat",
  },
  ideas: {
    title: "Идеи и предложения",
    description:
      "Предложения по улучшению billiard.guru от игроков и организаторов турниров.",
    keywords: [
      "идеи billiard guru",
      "обратная связь бильярд",
      "предложения сервис",
    ],
    path: "/ideas",
  },
  brackets: {
    title: "Турнирные сетки — форматы и демо",
    description:
      "Турнирные сетки на billiard.guru: олимпийская, фиксированная швейцарская, форматы на 8–256 участников с демо-схемами.",
    keywords: [
      "турнирные сетки",
      "форматы турнирных сеток",
      "демо сетка бильярд",
      "швейцарская система бильярд",
    ],
    path: "/brackets",
  },
  rules: {
    title: "Правила бильярда — справочник",
    description:
      "Справочник по дисциплинам бильярда, нарушениям, форе и этикете за столом для игроков и судей.",
    keywords: [
      "правила бильярда",
      "форa бильярд",
      "этикет бильярд",
      "нарушения бильярд",
    ],
    path: "/rules",
  },
  login: {
    title: "Вход в личный кабинет",
    description: "Авторизация на billiard.guru по номеру телефона или Telegram.",
    keywords: ["вход billiard guru", "авторизация бильярд"],
    path: "/login",
    noindex: true,
  },
  cabinet: {
    title: "Личный кабинет",
    description: "Личный кабинет игрока billiard.guru.",
    keywords: ["личный кабинет billiard guru"],
    path: "/cabinet",
    noindex: true,
  },
} as const satisfies Record<string, SeoInput>;

const LEGAL_KEYWORDS: Record<LegalDocSlug, string[]> = {
  privacy: [
    "политика конфиденциальности",
    "персональные данные billiard guru",
  ],
  cookies: ["cookie billiard guru", "политика cookie"],
  "recommendation-technologies": [
    "рекомендательные технологии",
    "персонализация billiard guru",
  ],
  "personal-data-consent": [
    "согласие персональные данные",
    "обработка данных billiard guru",
  ],
};

export function legalDocMetadata(doc: LegalDocSlug): Metadata {
  const entry = LEGAL_DOCS[doc];
  return buildPageMetadata({
    title: entry.title,
    description: entry.description,
    keywords: LEGAL_KEYWORDS[doc],
    path: `/legal/${doc}`,
  });
}

export function bracketFormatMetadata(seo: BracketFormatSeoEntry): Metadata {
  return buildPageMetadata({
    title: seo.metaTitle,
    description: seo.metaDescription,
    keywords: seo.keywords,
    path: `/brackets/${seo.slug}`,
    openGraphType: "article",
  });
}

export function tournamentDetailMetadata(
  name: string,
  clubName: string,
  city: string,
  id: string,
): Metadata {
  return buildPageMetadata({
    title: `${name} — турнир`,
    description: `Турнир «${name}» в клубе ${clubName}, ${city}. Регистрация, формат сетки и результаты на billiard.guru.`,
    keywords: [
      name,
      "турнир бильярд",
      clubName,
      city,
    ],
    path: `/tournaments/${id}`,
  });
}

export function tournamentBracketMetadata(name: string, id: string): Metadata {
  return buildPageMetadata({
    title: `Сетка — ${name}`,
    description: `Интерактивная турнирная сетка «${name}»: встречи, счёт и места участников на billiard.guru.`,
    keywords: [
      "сетка турнира",
      name,
      "турнирная таблица бильярд",
    ],
    path: `/tournaments/${id}/bracket`,
  });
}

export function clubDetailMetadata(
  name: string,
  city: string,
  id: string,
): Metadata {
  return buildPageMetadata({
    title: `${name} — бильярдный клуб`,
    description: `${name}, ${city}: столы, турниры и запись на billiard.guru.`,
    keywords: [name, "бильярдный клуб", city],
    path: `/clubs/${id}`,
  });
}

export function playerDetailMetadata(
  name: string,
  city: string | null,
  id: string,
): Metadata {
  return buildPageMetadata({
    title: `${name} — профиль игрока`,
    description: `Профиль игрока ${name}${city ? `, ${city}` : ""}: рейтинг и турниры на billiard.guru.`,
    keywords: [name, "игрок бильярд", "рейтинг бильярд"],
    path: `/players/${id}`,
  });
}

export function coachDetailMetadata(
  name: string,
  city: string | null,
  id: string,
): Metadata {
  return buildPageMetadata({
    title: `${name} — тренер бильярда`,
    description: `Тренер ${name}${city ? `, ${city}` : ""} — контакты и клуб на billiard.guru.`,
    keywords: [name, "тренер бильярд", city ?? "бильярд"],
    path: `/coaches/${id}`,
  });
}

export function siteNewsMetadata(
  title: string,
  excerpt: string,
  id: string,
): Metadata {
  return buildPageMetadata({
    title,
    description: excerpt.slice(0, 160),
    keywords: ["новости billiard guru", title],
    path: `/news/${id}`,
    openGraphType: "article",
  });
}

export function pokatatDetailMetadata(
  title: string,
  city: string,
  id: string,
): Metadata {
  return buildPageMetadata({
    title: `${title} — покатать`,
    description: `Объявление «${title}» в ${city}: найти партнёра для игры в бильярд на billiard.guru.`,
    keywords: ["покатать бильярд", city, title],
    path: `/pokatat/${id}`,
  });
}

type SeoRegistryEntry = {
  key: string;
  title: string;
  description: string;
  keywords: string[];
};

/** Все SEO-записи для проверки уникальности (статика + форматы + legal). */
export function collectAllSeoEntries(): SeoRegistryEntry[] {
  const entries: SeoRegistryEntry[] = [];

  for (const [key, seo] of Object.entries(STATIC_PAGE_SEO)) {
    entries.push({
      key: `static:${key}`,
      title: seo.title,
      description: seo.description,
      keywords: [...seo.keywords],
    });
  }

  for (const slug of getAllBracketFormatSeoSlugs()) {
    const seo = getBracketFormatSeoBySlug(slug);
    if (!seo) continue;
    entries.push({
      key: `bracket:${slug}`,
      title: seo.metaTitle,
      description: seo.metaDescription,
      keywords: [...seo.keywords],
    });
  }

  for (const doc of Object.keys(LEGAL_DOCS) as LegalDocSlug[]) {
    const entry = LEGAL_DOCS[doc];
    entries.push({
      key: `legal:${doc}`,
      title: entry.title,
      description: entry.description,
      keywords: [...LEGAL_KEYWORDS[doc]],
    });
  }

  return entries;
}

export function validateSeoUniqueness(entries = collectAllSeoEntries()): string[] {
  const errors: string[] = [];

  const dupes = findDuplicates(entries.map((e) => normalize(e.title)));
  for (const title of dupes) {
    const keys = entries.filter((e) => normalize(e.title) === title).map((e) => e.key);
    errors.push(`duplicate title «${title}»: ${keys.join(", ")}`);
  }

  const descDupes = findDuplicates(entries.map((e) => normalize(e.description)));
  for (const desc of descDupes) {
    const keys = entries
      .filter((e) => normalize(e.description) === desc)
      .map((e) => e.key);
    errors.push(`duplicate description: ${keys.join(", ")}`);
  }

  for (const entry of entries) {
    const kwDupes = findDuplicates(entry.keywords.map(normalize));
    if (kwDupes.length > 0) {
      errors.push(`${entry.key}: duplicate keywords within page: ${kwDupes.join(", ")}`);
    }
  }

  const kwSets = new Map<string, string[]>();
  for (const entry of entries) {
    const sig = [...entry.keywords].map(normalize).sort().join("|");
    const list = kwSets.get(sig) ?? [];
    list.push(entry.key);
    kwSets.set(sig, list);
  }
  for (const [sig, keys] of kwSets) {
    if (keys.length > 1 && sig.length > 0) {
      errors.push(`duplicate keywords set: ${keys.join(", ")}`);
    }
  }

  return errors;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function findDuplicates(values: string[]): string[] {
  const seen = new Map<string, number>();
  for (const v of values) {
    seen.set(v, (seen.get(v) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([v]) => v);
}
