import { Suspense } from "react";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { EmptyState } from "@/components/site/site-card";
import { TournamentCard } from "@/components/site/tournament-card";
import { HomeAnnouncements } from "@/components/home/home-announcements";
import { HomeClubShowcase } from "@/components/home/home-club-showcase";
import { HomeCta, HomeMission } from "@/components/home/home-mission";
import { HomeFeaturedTournament } from "@/components/home/home-featured-tournament";
import { HomeGuideLinks } from "@/components/home/home-guide-links";
import { HomeHero } from "@/components/home/home-hero";
import { HomeNewsGrid } from "@/components/home/home-news-grid";
import { HomePlayerCards } from "@/components/home/home-player-cards";
import { HomeReveal } from "@/components/home/home-reveal";
import { HomeSection } from "@/components/home/home-section";
import { HomeStickyNav } from "@/components/home/home-sticky-nav";
import { HomeTicker } from "@/components/home/home-ticker";
import { getCurrentPlayer } from "@/lib/auth";
import {
  HOME_DEMO_CLUB_ADS,
  HOME_DEMO_NEWS,
  HOME_DEMO_PLAYER_ADS,
  type HomeAnnouncement,
} from "@/lib/home-content";
import {
  formatPlayListingSchedule,
  PLAY_LISTING_KIND_LABELS,
  PLAY_LISTING_SCHEDULE_LABELS,
} from "@/lib/play-listing-display";
import {
  clubGeoWhere,
  clubListInclude,
  playListingGeoWhere,
  playListingListInclude,
  playerGeoWhere,
  tournamentGeoWhere,
  tournamentListInclude,
} from "@/lib/public-queries";
import { prisma } from "@/lib/prisma";
import { GeoSearchParams, hrefWithGeo, t } from "@/lib/site";

function resolveGeo(
  params: GeoSearchParams,
  playerCityId?: string,
  playerCountryId?: string,
): GeoSearchParams {
  if (params.cityId || params.countryId) return params;
  if (playerCityId) {
    return { cityId: playerCityId, countryId: playerCountryId };
  }
  return {};
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<GeoSearchParams>;
}) {
  const rawParams = await searchParams;
  const player = await getCurrentPlayer();
  const geo = resolveGeo(
    rawParams,
    player?.cityId,
    player?.city.countryId,
  );

  const [localTournaments, clubs, topPlayers, stats, playListings] = await Promise.all([
    prisma.tournament.findMany({
      where: tournamentGeoWhere(geo),
      include: tournamentListInclude,
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      take: 4,
    }),
    prisma.club.findMany({
      where: { ...clubGeoWhere(geo), isVerified: true },
      include: clubListInclude,
      orderBy: { name: "asc" },
      take: 4,
    }),
    prisma.player.findMany({
      where: playerGeoWhere(geo),
      include: { city: true },
      orderBy: [{ rating: "desc" }, { lastName: "asc" }],
      take: 8,
    }),
    Promise.all([
      prisma.tournament.count({ where: tournamentGeoWhere({}) }),
      prisma.club.count({ where: { isVerified: true } }),
      prisma.player.count({ where: { isVerified: true } }),
    ]),
    prisma.playListing.findMany({
      where: playListingGeoWhere(geo),
      include: playListingListInclude,
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const [tournamentsTotal, clubsTotal, playersTotal] = stats;
  const hasGeo = Boolean(geo.cityId || geo.countryId);
  const featured = localTournaments[0];
  const restTournaments = localTournaments.slice(1);

  const playerAds: HomeAnnouncement[] =
    playListings.length > 0
      ? playListings.map((listing) => ({
          id: listing.id,
          kind: "player" as const,
          title: listing.title,
          body: listing.body ?? formatPlayListingSchedule(listing),
          meta: [
            PLAY_LISTING_KIND_LABELS[listing.kind],
            PLAY_LISTING_SCHEDULE_LABELS[listing.scheduleType],
            listing.city.nameRu,
          ]
            .filter(Boolean)
            .join(" · "),
          href: `/pokatat/${listing.id}`,
        }))
      : HOME_DEMO_PLAYER_ADS;

  return (
    <>
      <HomeHero
        stats={{
          tournaments: tournamentsTotal,
          clubs: clubsTotal,
          players: playersTotal,
        }}
      />

      <HomeTicker />

      <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-panel-muted)]">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <Suspense fallback={<div className="h-20 rounded-2xl bg-[var(--bg-muted)]" />}>
            <GeoFilterBar basePath="/" />
          </Suspense>
        </div>
      </div>

      <HomeStickyNav />

      <HomeSection
        id="news"
        eyebrow="Лента"
        title="Новости сообщества"
        lead="Клубы и игроки публикуют анонсы — скоро через личный кабинет с модерацией."
      >
        <HomeReveal>
          <HomeNewsGrid items={HOME_DEMO_NEWS} />
        </HomeReveal>
      </HomeSection>

      <HomeSection
        id="tournaments"
        eyebrow="Соревнования"
        title={hasGeo ? t("home.local") : t("home.upcoming")}
        lead="Регистрация, сетки и результаты — всё на странице турнира."
        action={{ href: hrefWithGeo("/tournaments", geo), label: "Все турниры" }}
        className="home-section-alt"
      >
        <HomeReveal>
          {localTournaments.length === 0 ? (
            <EmptyState
              title={t("empty.tournaments")}
              description="Попробуйте другой регион или загляните позже."
            />
          ) : (
            <>
              {featured && <HomeFeaturedTournament tournament={featured} />}
              {restTournaments.length > 0 && (
                <ul className="grid gap-4 md:grid-cols-2">
                  {restTournaments.map((tournament, i) => (
                    <li key={tournament.id}>
                      <HomeReveal delay={i * 80}>
                        <TournamentCard
                          tournament={tournament}
                          href={`/tournaments/${tournament.id}`}
                          compact
                        />
                      </HomeReveal>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </HomeReveal>
      </HomeSection>

      <HomeSection
        id="players"
        eyebrow="Рейтинг"
        title="Игроки"
        lead="Топ игроков вашего региона — профиль, рейтинг и история турниров."
        action={{ href: hrefWithGeo("/players", geo), label: "Весь рейтинг" }}
      >
        <HomeReveal>
          <HomePlayerCards players={topPlayers} />
        </HomeReveal>
      </HomeSection>

      <HomeSection
        id="announcements"
        eyebrow="Доска"
        title="Объявления"
        lead="Спарринг, напарники, столы и акции — от игроков и клубов."
        action={{ href: hrefWithGeo("/pokatat", geo), label: "Покатать" }}
        className="home-section-alt"
      >
        <HomeReveal>
          <HomeAnnouncements
            playerAds={playerAds}
            clubAds={HOME_DEMO_CLUB_ADS}
            pokatatHref={hrefWithGeo("/pokatat", geo)}
          />
        </HomeReveal>
      </HomeSection>

      <HomeSection
        id="clubs"
        eyebrow="Площадки"
        title="Клубы"
        lead="Фото, цены, отзывы игроков — рейтинг клубов в разработке."
        action={{ href: hrefWithGeo("/clubs", geo), label: "Все клубы" }}
      >
        <HomeReveal>
          <HomeClubShowcase clubs={clubs} />
        </HomeReveal>
      </HomeSection>

      <HomeReveal>
        <HomeMission />
      </HomeReveal>
      <HomeReveal delay={80}>
        <HomeGuideLinks />
      </HomeReveal>
      <HomeReveal delay={100}>
        <HomeCta />
      </HomeReveal>
    </>
  );
}
