import type { PublicBracketFormat } from "@/lib/bracket-formats/public-formats";
import { getPublicEnabledBracketFormats } from "@/lib/bracket-formats/public-formats";
import type { HomeAnnouncement, HomeNewsItem } from "@/lib/home-content";
import {
  clubGeoWhere,
  playListingGeoWhere,
  playListingListInclude,
} from "@/lib/public-queries";
import { prisma } from "@/lib/prisma";
import type { GeoSearchParams } from "@/lib/site";
import {
  formatPlayListingSchedule,
  PLAY_LISTING_KIND_LABELS,
  PLAY_LISTING_SCHEDULE_LABELS,
} from "@/lib/play-listing-display";

function formatNewsDate(date: Date) {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
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

/** Новости клубов из БД (ClubNews) */
export async function loadHomeNews(geo: GeoSearchParams): Promise<HomeNewsItem[]> {
  const rows = await prisma.clubNews.findMany({
    where: clubNewsGeoWhere(geo),
    include: {
      club: {
        include: { city: { include: { country: true } } },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: 6,
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    excerpt: excerpt(row.body),
    authorType: "club" as const,
    authorName: row.club.name,
    city: row.club.city.nameRu,
    date: formatNewsDate(row.publishedAt),
    href: `/clubs/${row.clubId}#club-news`,
  }));
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
    const badge = f.seo.participantBadge;
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
