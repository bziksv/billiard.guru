"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useRouter } from "@/i18n/navigation";
import {
  TOURNAMENT_TAB_CONFIG,
  type TournamentTab,
} from "@/lib/tournament-tabs";

export function TournamentsTabBar({
  activeTab,
  counts,
}: {
  activeTab: TournamentTab;
  counts: Record<TournamentTab, number>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("pages.tournaments.tabs");

  function setTab(tab: TournamentTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "upcoming") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    router.push(query ? `/tournaments?${query}` : "/tournaments");
  }

  return (
    <div className="home-tab-bar inline-flex max-w-full flex-wrap gap-1 rounded-xl p-1">
      {TOURNAMENT_TAB_CONFIG.map((item) => {
        const active = activeTab === item.id;
        const count = counts[item.id];
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-emerald-600 text-white"
                : "home-card-body hover:text-[var(--text-primary)]",
            )}
            aria-current={active ? "true" : undefined}
          >
            {t(`${item.id}.label`)}
            {count > 0 && (
              <span
                className={cn(
                  "ml-1.5 tabular-nums",
                  active ? "text-emerald-100/90" : "home-card-muted",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
