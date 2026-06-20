import { Suspense } from "react";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { EmptyState } from "@/components/site/site-card";
import { TournamentsListSection } from "@/components/site/tournaments-list-section";
import { TournamentsTabBar } from "@/components/site/tournaments-tab-bar";
import { getCurrentPlayer } from "@/lib/auth";
import { getNearbyCityIds, NOTIFY_RADIUS_KM } from "@/lib/geo";
import {
  resolveGeoForPlayer,
} from "@/lib/public-queries";
import { findPublicTournamentsList, type PublicTournamentListItem } from "@/lib/tournament-public-read";
import { getAllBracketFormatLabels } from "@/lib/bracket-formats/settings-server";
import { prisma } from "@/lib/prisma";
import type { GeoSearchParams } from "@/lib/site";
import { t } from "@/lib/site";
import {
  countTournamentsByTab,
  filterTournamentsByTab,
  parseTournamentTab,
  sortTournamentsForTab,
  tournamentTabConfig,
} from "@/lib/tournament-tabs";
import { buildPageMetadata, STATIC_PAGE_SEO } from "@/lib/seo";

export const metadata = buildPageMetadata(STATIC_PAGE_SEO.tournaments);

type TournamentSearchParams = GeoSearchParams & {
  tab?: string;
};

function TournamentsPageBody({
  tab,
  localTournaments,
  nearbyTournaments,
  localSubtitle,
  nearbySubtitle,
  formatLabels,
}: {
  tab: ReturnType<typeof parseTournamentTab>;
  localTournaments: PublicTournamentListItem[];
  nearbyTournaments: PublicTournamentListItem[];
  localSubtitle?: string;
  nearbySubtitle?: string;
  formatLabels: Record<string, string>;
}) {
  const allTournaments = [...localTournaments, ...nearbyTournaments];
  const counts = countTournamentsByTab(allTournaments);
  const localFiltered = sortTournamentsForTab(
    filterTournamentsByTab(localTournaments, tab),
    tab,
  );
  const nearbyFiltered = sortTournamentsForTab(
    filterTournamentsByTab(nearbyTournaments, tab),
    tab,
  );
  const tabTotal = localFiltered.length + nearbyFiltered.length;
  const config = tournamentTabConfig(tab);
  const hasGeoSections = Boolean(localSubtitle || nearbySubtitle);

  return (
    <>
      <TournamentsTabBar activeTab={tab} counts={counts} />

      {tabTotal === 0 ? (
        <EmptyState title={config.emptyTitle} description={config.emptyDescription} />
      ) : hasGeoSections ? (
        <div className="space-y-8">
          <TournamentsListSection
            tournaments={localFiltered}
            tab={tab}
            compactEmpty
            formatLabels={formatLabels}
            subtitle={
              localSubtitle
                ? `${localSubtitle}${localFiltered.length > 0 ? ` · ${localFiltered.length}` : ""}`
                : undefined
            }
          />
          {nearbyFiltered.length > 0 && (
            <TournamentsListSection
              tournaments={nearbyFiltered}
              tab={tab}
              formatLabels={formatLabels}
              subtitle={
                nearbySubtitle ? `${nearbySubtitle} · ${nearbyFiltered.length}` : undefined
              }
            />
          )}
        </div>
      ) : (
        <TournamentsListSection
          tournaments={localFiltered}
          tab={tab}
          formatLabels={formatLabels}
        />
      )}
    </>
  );
}

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<TournamentSearchParams>;
}) {
  const rawParams = await searchParams;
  const tab = parseTournamentTab(rawParams.tab);
  const formatLabels = await getAllBracketFormatLabels();
  const player = await getCurrentPlayer();
  const hasManualGeo = Boolean(rawParams.cityId || rawParams.countryId);
  const usePlayerSections = Boolean(player && !hasManualGeo);

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

    return (
      <>
        <PageHeader
          title={t("nav.tournaments")}
          lead={`Сначала турниры в ${player.city.nameRu}, затем в соседних городах (до ${NOTIFY_RADIUS_KM} км). Выберите вкладку по статусу.`}
        />
        <PageMain className="space-y-6 pt-0">
          <Suspense fallback={<div className="site-skeleton h-24" />}>
            <GeoFilterBar basePath="/tournaments" />
          </Suspense>
          <Suspense fallback={<div className="site-skeleton h-10 w-full max-w-xl" />}>
            <TournamentsPageBody
              tab={tab}
              localTournaments={localTournaments}
              nearbyTournaments={nearbyTournaments}
              formatLabels={formatLabels}
              localSubtitle={`В вашем городе · ${player.city.nameRu}`}
              nearbySubtitle="Рядом · соседние города"
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
        lead="Предстоящие турниры с открытой регистрацией, идущие сейчас и завершённые. Фильтруйте по региону."
      />
      <PageMain className="space-y-6 pt-0">
        <Suspense fallback={<div className="site-skeleton h-24" />}>
          <GeoFilterBar basePath="/tournaments" />
        </Suspense>
        <Suspense fallback={<div className="site-skeleton h-10 w-full max-w-xl" />}>
          <TournamentsPageBody
            tab={tab}
            localTournaments={tournaments}
            nearbyTournaments={[]}
            formatLabels={formatLabels}
          />
        </Suspense>
      </PageMain>
    </>
  );
}
