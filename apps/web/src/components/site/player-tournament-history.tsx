import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/admin/status-badge";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { localizedClubName } from "@/lib/latin-names";
import { resolveLocalizedField } from "@/lib/localized-db-text";
import {
  formatStartsAt,
  isPairFormat,
} from "@/lib/public-display";
import {
  placeMedal,
} from "@/lib/player-tournament-places-server";

const PUBLIC_STATUSES = ["OPEN", "ACTIVE", "FINISHED", "DID_NOT_TAKE_PLACE"] as const;
const REG_STATUSES = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"] as const;

export type PlayerTournamentHistoryItem = {
  id: string;
  status: string;
  tournament: {
    id: string;
    name: string;
    nameEn: string | null;
    format: string;
    status: string;
    startsAt: Date | null;
    club: { name: string; nameLatin: string | null };
    _count: { registrations: number; teams: number };
  };
};

function PlaceBadge({
  place,
  participants,
  placeSuffix,
  placeOf,
}: {
  place: string;
  participants: number;
  placeSuffix: string;
  placeOf: string;
}) {
  const top = place === "1" ? 1 : place === "2" ? 2 : place === "3" ? 3 : 0;
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2 text-center min-w-[5rem]",
        top === 1 &&
          "bg-amber-500/15 ring-1 ring-amber-500/35 text-amber-800 dark:text-amber-200",
        top === 2 &&
          "bg-zinc-400/15 ring-1 ring-zinc-400/40 text-zinc-700 dark:text-zinc-200",
        top === 3 &&
          "bg-orange-700/10 ring-1 ring-orange-700/30 text-orange-900 dark:text-orange-200",
        top === 0 &&
          "bg-emerald-500/10 ring-1 ring-emerald-500/25 text-emerald-800 dark:text-emerald-300",
      )}
      title={`${place} ${placeSuffix}${participants > 0 ? ` ${placeOf}` : ""}`}
    >
      {top > 0 && (
        <span className="text-lg leading-none" aria-hidden>
          {placeMedal(place)}
        </span>
      )}
      <span className="font-mono text-lg font-semibold tabular-nums leading-tight">
        {place}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
        {placeSuffix}
      </span>
      {participants > 0 && (
        <span className="mt-0.5 text-[10px] tabular-nums opacity-70">
          {placeOf}
        </span>
      )}
    </div>
  );
}

export async function PlayerTournamentHistory({
  items,
  places,
}: {
  items: PlayerTournamentHistoryItem[];
  places: Map<string, string>;
}) {
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;

  function tournamentStatusLabel(status: string) {
    const key = PUBLIC_STATUSES.find((s) => s === status);
    return key ? t(`tournamentStatus.${key}`) : status;
  }

  function registrationStatusLabel(status: string) {
    const key = REG_STATUSES.find((s) => s === status);
    return key ? t(`registrationStatus.${key}`) : status;
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500">{t("detail.player.noTournaments")}</p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((r) => {
        const place = places.get(r.tournament.id);
        const participants = isPairFormat(r.tournament.format)
          ? r.tournament._count.teams
          : r.tournament._count.registrations;
        const when = r.tournament.startsAt
          ? formatStartsAt(r.tournament.startsAt, locale)
          : t("detail.player.dateTbd");
        const placeOf =
          participants > 0
            ? t("detail.player.placeOf", { count: participants })
            : "";

        return (
          <li
            key={r.id}
            className="site-card flex items-stretch gap-4 px-4 py-3.5 text-sm"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={`/tournaments/${r.tournament.id}`}
                className="font-medium hover:text-emerald-400"
              >
                {resolveLocalizedField(
                  locale,
                  r.tournament.name,
                  r.tournament.nameEn,
                )}
              </Link>

              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2.5 py-1 font-medium text-[var(--text)]">
                  {when}
                </span>
                {participants > 0 && (
                  <span className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2.5 py-1 font-medium tabular-nums text-[var(--text)]">
                    {t("tournamentCard.participants", { count: participants })}
                  </span>
                )}
              </div>

              <p className="mt-2 text-zinc-500">
                {localizedClubName(
                  locale,
                  r.tournament.club.name,
                  r.tournament.club.nameLatin,
                )}{" "}
                · {tournamentStatusLabel(r.tournament.status)}
              </p>
              <div className="mt-1.5">
                <StatusBadge
                  status={r.status}
                  label={registrationStatusLabel(r.status)}
                />
              </div>
            </div>
            {place && (
              <PlaceBadge
                place={place}
                participants={participants}
                placeSuffix={t("detail.player.placeSuffix")}
                placeOf={placeOf}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
