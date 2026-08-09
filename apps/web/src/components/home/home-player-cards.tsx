import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedGeoName } from "@/lib/geo-display";
import type { HomePlayerCardItem } from "@/lib/home-data";
import { localizedPlayerName } from "@/lib/latin-names";
import type { AppLocale } from "@/i18n/routing";
import { formatRating } from "@/lib/rating";

const RANK_CARD_CLASS = [
  "home-player-card--rank-1",
  "home-player-card--rank-2",
  "home-player-card--rank-3",
] as const;

const RANK_AVATAR_CLASS = [
  "home-player-avatar--rank-1",
  "home-player-avatar--rank-2",
  "home-player-avatar--rank-3",
] as const;

const RANK_BADGE_CLASS = [
  "home-player-rank-badge--1",
  "home-player-rank-badge--2",
  "home-player-rank-badge--3",
] as const;

function formatWinRate(winRate: number | null | undefined): string {
  return winRate == null ? "—" : `${Math.round(winRate * 100)}%`;
}

function PlayerCard({
  player,
  index,
  metric,
  metricLabel,
  locale,
}: {
  player: HomePlayerCardItem;
  index: number;
  metric: "rating" | "winRate";
  metricLabel: string;
  locale: AppLocale;
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      className={`home-player-card home-content-card-solid group w-[210px] shrink-0 overflow-hidden rounded-2xl ${
        index < 3 ? RANK_CARD_CLASS[index] : ""
      }`}
    >
      <div className="home-player-header relative h-32">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition group-hover:bg-emerald-500/20" />
        <div
          className={`home-player-avatar absolute bottom-3 left-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-inset)] text-xl font-bold ${
            index < 3
              ? RANK_AVATAR_CLASS[index]
              : "border-2 border-[var(--border-subtle)] text-emerald-600"
          }`}
        >
          {player.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.photoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            player.firstName[0]
          )}
        </div>
        <span
          className={`home-player-rank-badge absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            index < 3
              ? RANK_BADGE_CLASS[index]
              : "home-player-rank-badge--default"
          }`}
        >
          {index + 1}
        </span>
      </div>
      <div className="p-4">
        <p className="home-card-title truncate font-semibold group-hover:text-emerald-600">
          {localizedPlayerName(locale, player)}
        </p>
        <p className="home-card-muted mt-1 truncate text-xs">
          {localizedGeoName(player.city.nameRu, locale, player.city.nameEn)}
        </p>
        <p className="mt-3 font-mono text-lg text-emerald-600">
          {metric === "winRate"
            ? formatWinRate(player.winRate)
            : formatRating(player.rating)}
        </p>
        <p className="home-card-muted mt-0.5 text-[10px] font-medium uppercase tracking-wide">
          {metricLabel}
        </p>
      </div>
    </Link>
  );
}

export async function HomePlayerCards({
  players,
  metric = "rating",
  emptyKey = "home.players.empty",
  metricLabel,
}: {
  players: HomePlayerCardItem[];
  metric?: "rating" | "winRate";
  emptyKey?: string;
  metricLabel: string;
}) {
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;

  if (players.length === 0) {
    return (
      <p className="home-content-card rounded-2xl px-6 py-12 text-center home-card-muted">
        {t(emptyKey)}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {players.map((player, index) => (
        <PlayerCard
          key={player.id}
          player={player}
          index={index}
          metric={metric}
          metricLabel={metricLabel}
          locale={locale}
        />
      ))}
    </div>
  );
}
