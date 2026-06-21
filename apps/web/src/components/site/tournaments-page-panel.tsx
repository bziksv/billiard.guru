"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { filterTournamentsByQuery } from "@/lib/tournament-list-filter";
import type { PublicTournamentListItem } from "@/lib/tournament-public-read";
import {
  countTournamentsByTab,
  filterTournamentsByTab,
  sortTournamentsForTab,
  type TournamentTab,
} from "@/lib/tournament-tabs";
import { TournamentsListSection } from "@/components/site/tournaments-list-section";
import { TournamentsSearchBar } from "@/components/site/tournaments-search-bar";
import { TournamentsTabBar } from "@/components/site/tournaments-tab-bar";
import { EmptyState } from "@/components/site/site-card";

export function TournamentsPagePanel({
  tab,
  localTournaments,
  nearbyTournaments,
  localSubtitle,
  nearbySubtitle,
  formatLabels,
  emptyTitle,
  emptyDescription,
}: {
  tab: TournamentTab;
  localTournaments: PublicTournamentListItem[];
  nearbyTournaments: PublicTournamentListItem[];
  localSubtitle?: string;
  nearbySubtitle?: string;
  formatLabels: Record<string, string>;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("pages.tournaments");
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const filteredLocal = filterTournamentsByQuery(
    localTournaments,
    query,
    formatLabels,
    locale,
  );
  const filteredNearby = filterTournamentsByQuery(
    nearbyTournaments,
    query,
    formatLabels,
    locale,
  );

  const allTournaments = [...localTournaments, ...nearbyTournaments];
  const counts = countTournamentsByTab(
    query.trim()
      ? filterTournamentsByQuery(allTournaments, query, formatLabels, locale)
      : allTournaments,
  );

  const localFiltered = sortTournamentsForTab(
    filterTournamentsByTab(filteredLocal, tab),
    tab,
  );
  const nearbyFiltered = sortTournamentsForTab(
    filterTournamentsByTab(filteredNearby, tab),
    tab,
  );
  const tabTotal = localFiltered.length + nearbyFiltered.length;
  const hasGeoSections = Boolean(localSubtitle || nearbySubtitle);
  const searchActive = query.trim().length > 0;

  return (
    <div className="space-y-4">
      <TournamentsSearchBar />
      <TournamentsTabBar activeTab={tab} counts={counts} />

      {tabTotal === 0 ? (
        <EmptyState
          title={searchActive ? t("searchEmptyTitle") : emptyTitle}
          description={searchActive ? t("searchEmptyDescription") : emptyDescription}
        />
      ) : hasGeoSections ? (
        <div className="space-y-8">
          <TournamentsListSection
            tournaments={localFiltered}
            tab={tab}
            compactEmpty
            formatLabels={formatLabels}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
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
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
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
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      )}
    </div>
  );
}
