import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatGeoLocation, localizedGeoName } from "@/lib/geo-display";
import type { AppLocale } from "@/i18n/routing";
import { resolveLocalizedField } from "@/lib/localized-db-text";
import { formatStartsAt, isPairFormat } from "@/lib/public-display";
import { tournamentFormatDisplayLabel } from "@/lib/tournament-format-display";

type FeaturedTournament = {
  id: string;
  name: string;
  nameEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  format: string;
  formatLabel?: string | null;
  status: string;
  startsAt: Date | null;
  club: {
    name: string;
    city: {
      nameRu: string;
      nameEn?: string | null;
      country?: { nameRu: string; nameEn?: string | null };
    };
  };
  _count: { registrations: number; teams: number };
};

const PUBLIC_STATUSES = ["OPEN", "ACTIVE", "FINISHED"] as const;

export async function HomeFeaturedTournament({
  tournament,
}: {
  tournament: FeaturedTournament;
}) {
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;
  const participants = isPairFormat(tournament.format)
    ? tournament._count.teams
    : tournament._count.registrations;
  const location = formatGeoLocation(
    tournament.club.city.nameRu,
    tournament.club.city.country?.nameRu,
    locale,
    tournament.club.city.nameEn,
    tournament.club.city.country?.nameEn,
  );
  const displayName = resolveLocalizedField(locale, tournament.name, tournament.nameEn);
  const displayDescription = resolveLocalizedField(
    locale,
    tournament.description ?? "",
    tournament.descriptionEn,
  );
  const statusKey = PUBLIC_STATUSES.find((s) => s === tournament.status);
  const statusLabel = statusKey
    ? t(`tournamentStatus.${statusKey}`)
    : tournament.status;

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="home-featured-card home-card-glow group mb-8 block overflow-hidden rounded-3xl p-6 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600">
            {t("home.featuredTournament.eyebrow")}
          </p>
          <h3 className="home-card-title mt-2 text-2xl font-bold group-hover:text-emerald-700 md:text-3xl">
            {displayName}
          </h3>
        </div>
        <StatusBadge status={tournament.status} label={statusLabel} />
      </div>
      <p className="home-card-body mt-4">
        {tournamentFormatDisplayLabel(tournament)} · {localizedGeoName(tournament.club.name, locale)}
      </p>
      <p className="home-card-muted mt-1 text-sm">
        {formatStartsAt(tournament.startsAt, locale)} ·{" "}
        {t("home.featuredTournament.participants", { count: participants })} · {location}
      </p>
      {displayDescription && (
        <p className="home-card-muted mt-4 line-clamp-2 max-w-2xl text-sm">
          {displayDescription}
        </p>
      )}
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 transition-all group-hover:gap-3">
        {t("home.featuredTournament.details")}
        <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
