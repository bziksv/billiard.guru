import { EmptyState } from "@/components/site/site-card";
import { buildLocalizedStaticMetadata } from "@/lib/seo-locale";
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
  loadHomeTournaments,
} from "@/lib/home-data";
import { getNearbyCityIds, NOTIFY_RADIUS_KM } from "@/lib/geo";
import {
  clubGeoWhere,
  clubListInclude,
  playerGeoWhere,
} from "@/lib/public-queries";
import { getLocalizedBracketFormatLabels } from "@/lib/bracket-formats/settings-server";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { GeoSearchParams, hrefWithGeo } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedStaticMetadata("home", locale);
}

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
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations();
  const rawParams = await searchParams;
  const player = await getCurrentPlayer();
  const geo = resolveGeo(
    rawParams,
    player?.cityId,
    player?.city.countryId,
  );

  const hasManualGeo = Boolean(rawParams.cityId || rawParams.countryId);
  const usePlayerRegion = Boolean(player && !hasManualGeo);

  async function loadTournamentsForHome() {
    if (usePlayerRegion && player) {
      const allCities = await prisma.city.findMany({
        select: { id: true, latitude: true, longitude: true },
      });
      const nearbyCityIds = getNearbyCityIds(
        {
          id: player.city.id,
          latitude: player.city.latitude,
          longitude: player.city.longitude,
        },
        allCities,
        NOTIFY_RADIUS_KM,
      ).filter((id) => id !== player.cityId);
      return loadHomeTournaments({
        geo,
        playerCityId: player.cityId,
        nearbyCityIds,
      });
    }
    return loadHomeTournaments({ geo });
  }

  const [localTournaments, clubs, topPlayers, playAnnouncements] = await Promise.all([
    loadTournamentsForHome(),
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
    loadHomePlayAnnouncements(geo),
  ]);

  const [stats, news, bracketFormats, formatLabels] = await Promise.all([
    loadHomeStats(),
    loadHomeNews(geo, locale, t("home.news.network")),
    loadHomeBracketFormats(),
    getLocalizedBracketFormatLabels(locale),
  ]);

  const hasGeo = Boolean(geo.cityId || geo.countryId);
  const featured = localTournaments[0];
  const restTournaments = localTournaments.slice(1);
  const { playerAds, clubAds } = playAnnouncements;

  return (
    <>
      <HomeHero stats={stats} />

      <HomeTicker />

      <HomeStickyNav
        initialCountryId={geo.countryId}
        initialCityId={geo.cityId}
      />

      <HomeSection
        id="news"
        eyebrow={t("home.sections.news.eyebrow")}
        title={t("home.sections.news.title")}
        lead={t("home.sections.news.lead")}
        action={{ href: hrefWithGeo("/news", geo), label: t("home.sections.news.action") }}
      >
        <HomeReveal>
          <HomeNewsGrid items={news} />
        </HomeReveal>
      </HomeSection>

      <HomeSection
        id="tournaments"
        eyebrow={t("home.sections.tournaments.eyebrow")}
        title={hasGeo ? t("home.local") : t("home.upcoming")}
        lead={t("home.sections.tournaments.lead")}
        action={{
          href: hrefWithGeo("/tournaments", geo),
          label: t("home.sections.tournaments.action"),
        }}
        className="home-section-alt"
      >
        <HomeReveal>
          {localTournaments.length === 0 ? (
            <EmptyState
              title={t("empty.tournaments")}
              description={t("home.sections.tournaments.emptyDescription")}
            />
          ) : (
            <>
              {featured && (
                <HomeFeaturedTournament
                  tournament={{
                    ...featured,
                    formatLabel: formatLabels[featured.format],
                  }}
                />
              )}
              {restTournaments.length > 0 && (
                <ul className="grid gap-4 md:grid-cols-2">
                  {restTournaments.map((tournament, i) => (
                    <li key={tournament.id}>
                      <HomeReveal delay={i * 80}>
                        <TournamentCard
                          tournament={{
                            ...tournament,
                            formatLabel: formatLabels[tournament.format],
                          }}
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
        eyebrow={t("home.sections.players.eyebrow")}
        title={t("home.sections.players.title")}
        lead={t("home.sections.players.lead")}
        action={{ href: hrefWithGeo("/players", geo), label: t("home.sections.players.action") }}
      >
        <HomeReveal>
          <HomePlayerCards players={topPlayers} />
        </HomeReveal>
      </HomeSection>

      <HomeSection
        id="announcements"
        eyebrow={t("home.sections.announcements.eyebrow")}
        title={t("home.sections.announcements.title")}
        lead={t("home.sections.announcements.lead")}
        action={{
          href: hrefWithGeo("/pokatat", geo),
          label: t("home.sections.announcements.action"),
        }}
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
        eyebrow={t("home.sections.clubs.eyebrow")}
        title={t("home.sections.clubs.title")}
        lead={t("home.sections.clubs.lead")}
        action={{ href: hrefWithGeo("/clubs", geo), label: t("home.sections.clubs.action") }}
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
