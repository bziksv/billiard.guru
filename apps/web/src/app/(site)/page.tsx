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
  loadHomeBracketFormats,
  loadHomeNews,
  loadHomePlayAnnouncements,
  loadHomeStats,
} from "@/lib/home-data";
import {
  clubGeoWhere,
  clubListInclude,
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

  const [
    localTournaments,
    clubs,
    topPlayers,
    stats,
    news,
    playAnnouncements,
    bracketFormats,
  ] = await Promise.all([
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
    loadHomeStats(),
    loadHomeNews(geo),
    loadHomePlayAnnouncements(geo),
    loadHomeBracketFormats(),
  ]);

  const hasGeo = Boolean(geo.cityId || geo.countryId);
  const featured = localTournaments[0];
  const restTournaments = localTournaments.slice(1);
  const { playerAds, clubAds } = playAnnouncements;

  return (
    <>
      <HomeHero stats={stats} />

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
        title="Новости клубов"
        lead="Анонсы турниров, акций и событий — клубы публикуют в профиле, здесь показываются свежие записи вашего региона."
      >
        <HomeReveal>
          <HomeNewsGrid items={news} />
        </HomeReveal>
      </HomeSection>

      <HomeSection
        id="tournaments"
        eyebrow="Соревнования"
        title={hasGeo ? t("home.local") : t("home.upcoming")}
        lead="Регистрация, интерактивные сетки и результаты — на странице каждого турнира."
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
        title="Покатать"
        lead="Спарринг, напарники и свободные столы — объявления от игроков и клубов."
        action={{ href: hrefWithGeo("/pokatat", geo), label: "Все объявления" }}
        className="home-section-alt"
      >
        <HomeReveal>
          <HomeAnnouncements
            playerAds={playerAds}
            clubAds={clubAds}
            pokatatHref={hrefWithGeo("/pokatat", geo)}
          />
        </HomeReveal>
      </HomeSection>

      <HomeSection
        id="clubs"
        eyebrow="Площадки"
        title="Клубы"
        lead="Фото, цены, бронь столов и турниры — профиль клуба на billiard.guru."
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
        <HomeGuideLinks bracketFormats={bracketFormats} />
      </HomeReveal>
      <HomeReveal delay={100}>
        <HomeCta />
      </HomeReveal>
    </>
  );
}
