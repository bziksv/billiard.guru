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
  type PlayerTournamentPlaceInfo,
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
        "flex shrink-0 flex-col items-center justify-center rounded-xl px-2.5 py-1.5 text-center min-w-[4.75rem]",
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
        <span className="text-base leading-none" aria-hidden>
          {placeMedal(place)}
        </span>
      )}
      <span className="font-mono text-base font-semibold tabular-nums leading-tight">
        {place}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-80 leading-none">
        {placeSuffix}
      </span>
      {participants > 0 && (
        <span className="mt-0.5 text-[10px] tabular-nums opacity-70 leading-none">
          {placeOf}
        </span>
      )}
    </div>
  );
}

function GavePlaceBadge({ label }: { label: string }) {
  return (
    <div
      className="flex max-w-[11rem] shrink-0 flex-col items-center justify-center rounded-xl bg-amber-500/10 px-3 py-2 text-center ring-1 ring-amber-500/30 text-amber-900 dark:text-amber-100"
      title={label}
    >
      <span className="text-[11px] font-medium leading-snug">{label}</span>
    </div>
  );
}

export async function PlayerTournamentHistory({
  items,
  places,
}: {
  items: PlayerTournamentHistoryItem[];
  places: Map<string, PlayerTournamentPlaceInfo>;
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
        const info = places.get(r.tournament.id);
        const place = info?.place;
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
        const gavePlaceLabel = info?.gavePlaceTo
          ? t("detail.player.gavePlaceTo", { name: info.gavePlaceTo })
          : null;

        return (
          <li key={r.id} className="site-card player-tournament-row">
            <div className="player-tournament-row__body">
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

              <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2.5 py-1 font-medium text-[var(--text)]">
                  {when}
                </span>
                {participants > 0 && (
                  <span className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2.5 py-1 font-medium tabular-nums text-[var(--text)]">
                    {t("tournamentCard.participants", { count: participants })}
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-zinc-500">
                {localizedClubName(
                  locale,
                  r.tournament.club.name,
                  r.tournament.club.nameLatin,
                )}{" "}
                · {tournamentStatusLabel(r.tournament.status)}
              </p>
              <div className="mt-1">
                <StatusBadge
                  status={r.status}
                  label={registrationStatusLabel(r.status)}
                />
              </div>
            </div>
            <div className="player-tournament-row__side">
              {place && (
                <PlaceBadge
                  place={place}
                  participants={participants}
                  placeSuffix={t("detail.player.placeSuffix")}
                  placeOf={placeOf}
                />
              )}
              {gavePlaceLabel && <GavePlaceBadge label={gavePlaceLabel} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
