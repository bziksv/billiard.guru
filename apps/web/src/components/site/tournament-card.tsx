"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { StatusBadge } from "@/components/admin/status-badge";
import { SiteCard } from "@/components/site/site-card";
import { formatGeoLocation, localizedGeoName } from "@/lib/geo-display";
import type { AppLocale } from "@/i18n/routing";
import { resolveLocalizedField } from "@/lib/localized-db-text";
import {
  formatStartsAt,
  isPairFormat,
} from "@/lib/public-display";
import { tournamentFormatDisplayLabel } from "@/lib/tournament-format-display";

type TournamentListItem = {
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

export function TournamentCard({
  tournament: t,
  href,
  compact,
}: {
  tournament: TournamentListItem;
  href: string;
  compact?: boolean;
}) {
  const tr = useTranslations();
  const locale = useLocale() as AppLocale;
  const participants = isPairFormat(t.format) ? t._count.teams : t._count.registrations;
  const location = formatGeoLocation(
    t.club.city.nameRu,
    t.club.city.country?.nameRu,
    locale,
    t.club.city.nameEn,
    t.club.city.country?.nameEn,
  );
  const statusKey = PUBLIC_STATUSES.find((s) => s === t.status);
  const statusLabel = statusKey
    ? tr(`tournamentStatus.${statusKey}`)
    : t.status;

  return (
    <SiteCard href={href}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={compact ? "font-semibold" : "text-lg font-semibold"}>
          {resolveLocalizedField(locale, t.name, t.nameEn)}
        </h3>
        <StatusBadge status={t.status} label={statusLabel} />
      </div>
      <p className="home-card-muted mt-2 text-sm">
        {tournamentFormatDisplayLabel(t)}
        {" · "}
        {localizedGeoName(t.club.name, locale)}
      </p>
      <p className="home-card-muted mt-1 text-sm">
        {formatStartsAt(t.startsAt, locale)}
        {participants > 0 && ` · ${tr("tournamentCard.participants", { count: participants })}`}
      </p>
      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400/90">{location}</p>
      {!compact && (t.description || t.descriptionEn) && (
        <p className="home-card-body mt-3 line-clamp-3 text-sm">
          {resolveLocalizedField(locale, t.description ?? "", t.descriptionEn)}
        </p>
      )}
    </SiteCard>
  );
}

export function SectionLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="text-sm font-medium text-emerald-400 hover:underline">
      {children}
    </Link>
  );
}
