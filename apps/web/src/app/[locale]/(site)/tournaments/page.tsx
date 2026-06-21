import { Suspense } from "react";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { TournamentsPagePanel } from "@/components/site/tournaments-page-panel";
import { getCurrentPlayer } from "@/lib/auth";
import { getNearbyCityIds, NOTIFY_RADIUS_KM } from "@/lib/geo";
import { localizedGeoName } from "@/lib/geo-display";
import {
  resolveGeoForPlayer,
} from "@/lib/public-queries";
import { findPublicTournamentsList } from "@/lib/tournament-public-read";
import { getLocalizedBracketFormatLabels } from "@/lib/bracket-formats/settings-server";
import { prisma } from "@/lib/prisma";
import type { GeoSearchParams } from "@/lib/site";
import { getLocale, getTranslations } from "next-intl/server";
import {
  parseTournamentTab,
} from "@/lib/tournament-tabs";
import { buildLocalizedStaticMetadata } from "@/lib/seo-locale";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedStaticMetadata("tournaments", locale);
}

type TournamentSearchParams = GeoSearchParams & {
  tab?: string;
  q?: string;
};

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<TournamentSearchParams>;
}) {
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;
  const rawParams = await searchParams;
  const tab = parseTournamentTab(rawParams.tab);
  const formatLabels = await getLocalizedBracketFormatLabels(locale);
  const player = await getCurrentPlayer();
  const hasManualGeo = Boolean(rawParams.cityId || rawParams.countryId);
  const usePlayerSections = Boolean(player && !hasManualGeo);
  const emptyTitle = t(`pages.tournaments.tabs.${tab}.emptyTitle`);
  const emptyDescription = t(`pages.tournaments.tabs.${tab}.emptyDescription`);

  if (usePlayerSections && player) {
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

    const [localTournaments, nearbyTournaments] = await Promise.all([
      findPublicTournamentsList({ geo: { cityId: player.cityId } }),
      nearbyCityIds.length > 0
        ? findPublicTournamentsList({ cityIds: nearbyCityIds })
        : Promise.resolve([]),
    ]);

    const cityName = localizedGeoName(player.city.nameRu, locale);

    return (
      <>
        <PageHeader
          title={t("nav.tournaments")}
          lead={t("pages.tournaments.leadGeo", {
            city: cityName,
            radius: NOTIFY_RADIUS_KM,
          })}
        />
        <PageMain className="space-y-6 pt-0">
          <Suspense fallback={<div className="site-skeleton h-24" />}>
            <GeoFilterBar basePath="/tournaments" />
          </Suspense>
          <Suspense fallback={<div className="site-skeleton h-10 w-full max-w-xl" />}>
            <TournamentsPagePanel
              tab={tab}
              localTournaments={localTournaments}
              nearbyTournaments={nearbyTournaments}
              formatLabels={formatLabels}
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
              localSubtitle={t("pages.tournaments.localSubtitle", {
                city: cityName,
              })}
              nearbySubtitle={t("pages.tournaments.nearbySubtitle")}
            />
          </Suspense>
        </PageMain>
      </>
    );
  }

  const geo = resolveGeoForPlayer(
    rawParams,
    player?.cityId,
    player?.city.countryId,
  );
  const tournaments = await findPublicTournamentsList({ geo });

  return (
    <>
      <PageHeader
        title={t("nav.tournaments")}
        lead={t("pages.tournaments.leadDefault")}
      />
      <PageMain className="space-y-6 pt-0">
        <Suspense fallback={<div className="site-skeleton h-24" />}>
          <GeoFilterBar basePath="/tournaments" />
        </Suspense>
        <Suspense fallback={<div className="site-skeleton h-10 w-full max-w-xl" />}>
          <TournamentsPagePanel
            tab={tab}
            localTournaments={tournaments}
            nearbyTournaments={[]}
            formatLabels={formatLabels}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </Suspense>
      </PageMain>
    </>
  );
}
