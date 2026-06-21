import type { PublicBracketFormat } from "@/lib/bracket-formats/public-formats";
import { getPublicEnabledBracketFormats } from "@/lib/bracket-formats/public-formats";
import { APP_NAME } from "@/lib/brand";
import { localizedGeoName } from "@/lib/geo-display";
import type { AppLocale } from "@/i18n/routing";
import type { HomeAnnouncement, HomeNewsItem } from "@/lib/home-content";
import {
  newsHasEnTranslation,
  resolveLocalizedField,
} from "@/lib/localized-db-text";
import {
  clubGeoWhere,
  playListingGeoWhere,
  playListingListInclude,
} from "@/lib/public-queries";
import { prisma } from "@/lib/prisma";
import type { PublicTournamentListItem } from "@/lib/tournament-public-read";
import { findPublicTournamentsList } from "@/lib/tournament-public-read";
import { pickHomeTournaments } from "@/lib/tournament-tabs";
import type { GeoSearchParams } from "@/lib/site";
import {
  formatPlayListingSchedule,
  PLAY_LISTING_KIND_LABELS,
  PLAY_LISTING_SCHEDULE_LABELS,
} from "@/lib/play-listing-display";

function formatNewsDate(date: Date, locale: AppLocale) {
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function excerpt(text: string, max = 160) {
  const plain = text.replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1).trim()}…`;
}

function clubNewsGeoWhere(geo: GeoSearchParams) {
  const clubFilter = clubGeoWhere(geo);
  return {
    club: {
      isVerified: true,
      ...clubFilter,
    },
  };
}

function mapSiteNewsRow(
  row: {
    id: string;
    title: string;
    body: string;
    titleEn?: string | null;
    bodyEn?: string | null;
    publishedAt: Date | null;
    createdAt: Date;
  },
  locale: AppLocale,
  networkLabel: string,
): HomeNewsItem & { sortAt: number } {
  const title = resolveLocalizedField(locale, row.title, row.titleEn);
  const body = resolveLocalizedField(locale, row.body, row.bodyEn);
  return {
    id: row.id,
    title,
    excerpt: excerpt(body),
    authorType: "service",
    authorName: APP_NAME,
    city: networkLabel,
    date: formatNewsDate(row.publishedAt ?? row.createdAt, locale),
    href: `/news/${row.id}`,
    sortAt: (row.publishedAt ?? row.createdAt).getTime(),
  };
}

function mapClubNewsRow(
  row: {
    id: string;
    title: string;
    body: string;
    titleEn?: string | null;
    bodyEn?: string | null;
    clubId: string;
    publishedAt: Date | null;
    createdAt: Date;
    club: {
      name: string;
      city: { nameRu: string; nameEn?: string | null };
    };
  },
  locale: AppLocale,
): HomeNewsItem & { sortAt: number } {
  const title = resolveLocalizedField(locale, row.title, row.titleEn);
  const body = resolveLocalizedField(locale, row.body, row.bodyEn);
  return {
    id: row.id,
    title,
    excerpt: excerpt(body),
    authorType: "club",
    authorName: row.club.name,
    city: localizedGeoName(row.club.city.nameRu, locale, row.club.city.nameEn),
    date: formatNewsDate(row.publishedAt ?? row.createdAt, locale),
    href: `/clubs/${row.clubId}#club-news`,
    sortAt: (row.publishedAt ?? row.createdAt).getTime(),
  };
}

/** Новости сервиса + клубов. limit — сколько вернуть после сортировки (для главной — 6). */
export async function loadNewsFeed(
  geo: GeoSearchParams,
  options?: { limit?: number; locale?: AppLocale; networkLabel?: string },
): Promise<HomeNewsItem[]> {
  const locale = options?.locale ?? "ru";
  const networkLabel = options?.networkLabel ?? "Вся сеть";
  const fetchCap = options?.limit ? 50 : 100;

  const [siteRows, clubRows] = await Promise.all([
    prisma.siteNews.findMany({
      where: { status: "APPROVED" },
      orderBy: { publishedAt: "desc" },
      take: fetchCap,
    }),
    prisma.clubNews.findMany({
      where: {
        status: "APPROVED",
        ...clubNewsGeoWhere(geo),
      },
      include: {
        club: {
          include: { city: { include: { country: true } } },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: fetchCap,
    }),
  ]);

  const siteFiltered =
    locale === "en" ? siteRows.filter(newsHasEnTranslation) : siteRows;
  const clubFiltered =
    locale === "en" ? clubRows.filter(newsHasEnTranslation) : clubRows;

  const merged = [
    ...siteFiltered.map((row) => mapSiteNewsRow(row, locale, networkLabel)),
    ...clubFiltered.map((row) => mapClubNewsRow(row, locale)),
  ].sort((a, b) => b.sortAt - a.sortAt);

  const slice = options?.limit ? merged.slice(0, options.limit) : merged;
  return slice.map(({ sortAt: _ignored, ...item }) => item);
}

/** Превью на главной — 6 последних */
export async function loadHomeNews(
  geo: GeoSearchParams,
  locale: AppLocale = "ru",
  networkLabel = "Вся сеть",
): Promise<HomeNewsItem[]> {
  return loadNewsFeed(geo, { limit: 6, locale, networkLabel });
}

type PlayListingRow = Awaited<
  ReturnType<
    typeof prisma.playListing.findMany<{ include: typeof playListingListInclude }>
  >
>[number];

function playListingToAnnouncement(listing: PlayListingRow): HomeAnnouncement {
  const authorName = listing.publishedByClub
    ? (listing.club?.name ?? "Клуб")
    : `${listing.author.firstName} ${listing.author.lastName.charAt(0)}.`.trim();

  return {
    id: listing.id,
    kind: listing.publishedByClub ? "club" : "player",
    title: listing.title,
    body: listing.body ?? formatPlayListingSchedule(listing),
    meta: [
      listing.publishedByClub ? "клуб" : PLAY_LISTING_KIND_LABELS[listing.kind],
      PLAY_LISTING_SCHEDULE_LABELS[listing.scheduleType],
      listing.city.nameRu,
      authorName,
    ]
      .filter(Boolean)
      .join(" · "),
    href: `/pokatat/${listing.id}`,
  };
}

/** Объявления «Покатать» — от игроков и клубов */
export async function loadHomePlayAnnouncements(geo: GeoSearchParams): Promise<{
  playerAds: HomeAnnouncement[];
  clubAds: HomeAnnouncement[];
}> {
  const listings = await prisma.playListing.findMany({
    where: playListingGeoWhere(geo),
    include: playListingListInclude,
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const playerAds = listings
    .filter((l) => !l.publishedByClub)
    .slice(0, 4)
    .map(playListingToAnnouncement);

  const clubAds = listings
    .filter((l) => l.publishedByClub)
    .slice(0, 4)
    .map(playListingToAnnouncement);

  return { playerAds, clubAds };
}

/** Включённые форматы сеток для блока справочника */
export async function loadHomeBracketFormats(): Promise<PublicBracketFormat[]> {
  const formats = await getPublicEnabledBracketFormats();
  const priority = (f: PublicBracketFormat) => {
    const badge = f.seo?.participantBadge ?? "";
    if (badge.includes("16")) return 1;
    if (badge.includes("32")) return 2;
    if (badge.includes("64")) return 3;
    if (f.definition.layout === "olympic") return 4;
    if (f.definition.layout === "swiss_dynamic") return 5;
    return 6;
  };
  return [...formats].sort((a, b) => priority(a) - priority(b));
}

export async function loadHomeStats() {
  const [tournaments, clubs, players, playListings] = await Promise.all([
    prisma.tournament.count({
      where: { status: { in: ["OPEN", "ACTIVE", "FINISHED"] } },
    }),
    prisma.club.count({ where: { isVerified: true } }),
    prisma.player.count({ where: { isVerified: true } }),
    prisma.playListing.count({
      where: {
        status: "OPEN",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
  ]);

  return { tournaments, clubs, players, playListings };
}

/** Турниры для блока на главной: город + соседние, приоритет OPEN с ближайшей датой. */
export async function loadHomeTournaments(options: {
  geo: GeoSearchParams;
  playerCityId?: string;
  nearbyCityIds?: string[];
  take?: number;
}): Promise<PublicTournamentListItem[]> {
  const take = options.take ?? 4;
  let pool: PublicTournamentListItem[];

  if (options.playerCityId != null && options.nearbyCityIds != null) {
    const [local, nearby] = await Promise.all([
      findPublicTournamentsList({ geo: { cityId: options.playerCityId } }),
      options.nearbyCityIds.length > 0
        ? findPublicTournamentsList({ cityIds: options.nearbyCityIds })
        : Promise.resolve([]),
    ]);
    pool = [...local, ...nearby];
  } else {
    pool = await findPublicTournamentsList({ geo: options.geo });
  }

  return pickHomeTournaments(pool, take);
}
