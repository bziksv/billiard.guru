import type { Metadata } from "next";
import {
  buildPageMetadata,
  SEO_SITE_URL,
  STATIC_PAGE_SEO,
  type SeoInput,
} from "@/lib/seo";
import type { BilliardGame, BilliardTableType } from "@/lib/billiard-rules/content";
import {
  resolveRulesGameSeo,
  resolveRulesTableSeo,
} from "@/lib/billiard-rules/rules-seo";

export type StaticSeoKey = keyof typeof STATIC_PAGE_SEO;

export const STATIC_PAGE_SEO_EN: Record<StaticSeoKey, SeoInput> = {
  home: {
    title: "Billiards tournaments online",
    description:
      "billiard.guru — run billiards tournaments: brackets, draws, player ratings, clubs, and table streams.",
    keywords: [
      "billiards tournaments",
      "tournament bracket billiards",
      "billiard guru",
      "organize billiards tournament",
    ],
    path: "/",
  },
  tournaments: {
    title: "Billiards tournaments — schedule & registration",
    description:
      "Upcoming and live billiards tournaments: online registration, bracket format, venue, and date.",
    keywords: [
      "billiards tournaments",
      "tournament schedule billiards",
      "billiards tournament registration",
    ],
    path: "/tournaments",
  },
  clubs: {
    title: "Billiards clubs — directory",
    description:
      "Billiards club directory with addresses, tables, and upcoming tournaments. Find a club in your city.",
    keywords: ["billiards clubs", "billiards club directory", "billiards club near me"],
    path: "/clubs",
  },
  players: {
    title: "Billiards player ratings",
    description:
      "Ratings and profiles on billiard.guru: tournament history, city, and current rating.",
    keywords: ["billiards rating", "billiards players", "player ranking billiards"],
    path: "/players",
  },
  coaches: {
    title: "Billiards coaches",
    description:
      "Billiards coaches and instructors: contacts, city, and club for private lessons.",
    keywords: ["billiards coach", "billiards lessons", "billiards trainer"],
    path: "/coaches",
  },
  news: {
    title: "billiard.guru news",
    description:
      "News from billiard.guru: platform updates, tournaments, and announcements for players and clubs.",
    keywords: ["billiards news", "billiard guru news", "tournament announcements"],
    path: "/news",
  },
  pokatat: {
    title: "Play a match — find a partner",
    description:
      "Player and club listings for sparring, practice partners, and open tables — on the site and in Telegram.",
    keywords: ["billiards partner", "play billiards", "sparring billiards"],
    path: "/pokatat",
  },
  ideas: {
    title: "Ideas for billiard.guru",
    description: "Suggest features and improvements for the billiard.guru platform.",
    keywords: ["billiard guru ideas", "platform feedback"],
    path: "/ideas",
  },
  rules: {
    title: "Billiards rules — guide",
    description:
      "Rules for pyramid, pool, snooker, Chinese pool, and carom — equipment, fouls, and disciplines.",
    keywords: ["billiards rules", "pyramid rules", "pool rules"],
    path: "/rules",
  },
  brackets: {
    title: "Tournament bracket formats",
    description:
      "Bracket formats on billiard.guru — interactive demos for 16, 32, and 64 players.",
    keywords: ["tournament bracket", "billiards bracket format", "elimination bracket"],
    path: "/brackets",
  },
  login: {
    title: "Sign in",
    description: "Sign in to billiard.guru via Telegram.",
    keywords: ["billiard guru login"],
    path: "/login",
    noindex: true,
  },
  cabinet: {
    title: "Account",
    description: "Your billiard.guru account: profile, registrations, and club management.",
    keywords: ["billiard guru account"],
    path: "/cabinet",
    noindex: true,
  },
};

function localizedPath(path: string | undefined, locale: string): string | undefined {
  if (!path) return undefined;
  if (locale === "en") return path === "/" ? "/en" : `/en${path}`;
  return path;
}

/** Metadata для статических страниц с hreflang ru/en. */
export function buildLocalizedStaticMetadata(
  key: StaticSeoKey,
  locale: string,
): Metadata {
  const ruSeo = STATIC_PAGE_SEO[key];
  const seo = locale === "en" ? STATIC_PAGE_SEO_EN[key] : ruSeo;
  const path = localizedPath(seo.path, locale);
  const ruPath = ruSeo.path ?? "/";
  const enPath = localizedPath(ruSeo.path, "en") ?? "/en";

  const metadata = buildPageMetadata({ ...seo, path });

  if (path && !("noindex" in seo && seo.noindex)) {
    const ruUrl = `${SEO_SITE_URL}${ruPath === "/" ? "" : ruPath}`;
    const enUrl = `${SEO_SITE_URL}${enPath}`;
    metadata.alternates = {
      canonical: `${SEO_SITE_URL}${path === "/" ? "" : path}`,
      languages: {
        ru: ruUrl,
        en: enUrl,
        "x-default": ruUrl,
      },
    };
  }

  return metadata;
}

export function buildLocalizedRulesTableMetadata(
  table: BilliardTableType,
  locale: string,
): Metadata {
  const seo = resolveRulesTableSeo(table);
  return buildDetailMetadataWithAlternates(seo, `/rules/${table.slug}`, locale);
}

export function buildLocalizedRulesGameMetadata(
  table: BilliardTableType,
  game: BilliardGame,
  locale: string,
): Metadata {
  const seo = resolveRulesGameSeo(table, game);
  const metadata = buildDetailMetadataWithAlternates(
    seo,
    `/rules/${table.slug}/${game.slug}`,
    locale,
  );
  metadata.openGraph = {
    ...metadata.openGraph,
    type: "article",
  };
  return metadata;
}

function localizedDetailPath(path: string, locale: string): string {
  if (locale === "en") return `/en${path}`;
  return path;
}

export function buildLocalizedTournamentDetailMetadata(
  name: string,
  clubName: string,
  city: string,
  id: string,
  locale: string,
): Metadata {
  const path = `/tournaments/${id}`;
  const seo =
    locale === "en"
      ? {
          title: `${name} — tournament`,
          description: `Tournament “${name}” at ${clubName}, ${city}. Registration, bracket format, and results on billiard.guru.`,
          keywords: [name, "billiards tournament", clubName, city],
        }
      : {
          title: `${name} — турнир`,
          description: `Турнир «${name}» в клубе ${clubName}, ${city}. Регистрация, формат сетки и результаты на billiard.guru.`,
          keywords: [name, "турнир бильярд", clubName, city],
        };
  return buildDetailMetadataWithAlternates(seo, path, locale);
}

export function buildLocalizedClubDetailMetadata(
  name: string,
  city: string,
  id: string,
  locale: string,
): Metadata {
  const path = `/clubs/${id}`;
  const seo =
    locale === "en"
      ? {
          title: `${name} — billiards club`,
          description: `${name}, ${city}: tables, tournaments, and booking on billiard.guru.`,
          keywords: [name, "billiards club", city],
        }
      : {
          title: `${name} — бильярдный клуб`,
          description: `${name}, ${city}: столы, турниры и запись на billiard.guru.`,
          keywords: [name, "бильярдный клуб", city],
        };
  return buildDetailMetadataWithAlternates(seo, path, locale);
}

export function buildLocalizedPlayerDetailMetadata(
  name: string,
  city: string | null,
  id: string,
  locale: string,
): Metadata {
  const path = `/players/${id}`;
  const seo =
    locale === "en"
      ? {
          title: `${name} — player profile`,
          description: `Player profile for ${name}${city ? `, ${city}` : ""}: rating and tournaments on billiard.guru.`,
          keywords: [name, "billiards player", "billiards rating"],
        }
      : {
          title: `${name} — профиль игрока`,
          description: `Профиль игрока ${name}${city ? `, ${city}` : ""}: рейтинг и турниры на billiard.guru.`,
          keywords: [name, "игрок бильярд", "рейтинг бильярд"],
        };
  return buildDetailMetadataWithAlternates(seo, path, locale);
}

export function buildLocalizedCoachDetailMetadata(
  name: string,
  city: string | null,
  id: string,
  locale: string,
): Metadata {
  const path = `/coaches/${id}`;
  const seo =
    locale === "en"
      ? {
          title: `${name} — billiards coach`,
          description: `Coach ${name}${city ? `, ${city}` : ""} — contact and club on billiard.guru.`,
          keywords: [name, "billiards coach", city ?? "billiards"],
        }
      : {
          title: `${name} — тренер бильярда`,
          description: `Тренер ${name}${city ? `, ${city}` : ""} — контакты и клуб на billiard.guru.`,
          keywords: [name, "тренер бильярд", city ?? "бильярд"],
        };
  return buildDetailMetadataWithAlternates(seo, path, locale);
}

export function buildLocalizedTournamentBracketMetadata(
  name: string,
  id: string,
  locale: string,
): Metadata {
  const path = `/tournaments/${id}/bracket`;
  const seo =
    locale === "en"
      ? {
          title: `Bracket — ${name}`,
          description: `Interactive tournament bracket for “${name}”: matches, scores, and standings on billiard.guru.`,
          keywords: ["tournament bracket", name, "billiards bracket"],
        }
      : {
          title: `Сетка — ${name}`,
          description: `Интерактивная турнирная сетка «${name}»: встречи, счёт и места участников на billiard.guru.`,
          keywords: ["сетка турнира", name, "турнирная таблица бильярд"],
        };
  return buildDetailMetadataWithAlternates(seo, path, locale);
}

export function buildLocalizedSiteNewsMetadata(
  title: string,
  excerpt: string,
  id: string,
  locale: string,
): Metadata {
  const path = `/news/${id}`;
  const seo =
    locale === "en"
      ? {
          title,
          description: excerpt.slice(0, 160),
          keywords: ["billiard guru news", title],
        }
      : {
          title,
          description: excerpt.slice(0, 160),
          keywords: ["новости billiard guru", title],
        };
  const metadata = buildDetailMetadataWithAlternates(seo, path, locale);
  metadata.openGraph = {
    ...metadata.openGraph,
    type: "article",
  };
  return metadata;
}

export function buildLocalizedPokatatDetailMetadata(
  title: string,
  city: string,
  id: string,
  locale: string,
): Metadata {
  const path = `/pokatat/${id}`;
  const seo =
    locale === "en"
      ? {
          title: `${title} — play a match`,
          description: `Listing “${title}” in ${city}: find a billiards partner on billiard.guru.`,
          keywords: ["billiards partner", city, title],
        }
      : {
          title: `${title} — покатать`,
          description: `Объявление «${title}» в ${city}: найти партнёра для игры в бильярд на billiard.guru.`,
          keywords: ["покатать бильярд", city, title],
        };
  return buildDetailMetadataWithAlternates(seo, path, locale);
}

export function buildLocalizedBracketFormatMetadata(
  seo: { metaTitle: string; metaDescription: string; keywords: string[]; slug: string },
  locale: string,
): Metadata {
  return buildDetailMetadataWithAlternates(
    {
      title: seo.metaTitle,
      description: seo.metaDescription,
      keywords: seo.keywords,
    },
    `/brackets/${seo.slug}`,
    locale,
  );
}

export function buildLocalizedLegalMetadata(
  doc: { title: string; description: string; keywords: string[] },
  slug: string,
  locale: string,
): Metadata {
  return buildDetailMetadataWithAlternates(
    {
      title: doc.title,
      description: doc.description,
      keywords: doc.keywords,
    },
    `/legal/${slug}`,
    locale,
  );
}

function buildDetailMetadataWithAlternates(
  seo: { title: string; description: string; keywords: string[] },
  path: string,
  locale: string,
): Metadata {
  const metadata = buildPageMetadata({ ...seo, path: localizedDetailPath(path, locale) });
  const ruPath = path;
  const enPath = localizedDetailPath(path, "en");
  metadata.alternates = {
    canonical: `${SEO_SITE_URL}${locale === "en" ? enPath : ruPath}`,
    languages: {
      ru: `${SEO_SITE_URL}${ruPath}`,
      en: `${SEO_SITE_URL}${enPath}`,
      "x-default": `${SEO_SITE_URL}${ruPath}`,
    },
  };
  return metadata;
}
