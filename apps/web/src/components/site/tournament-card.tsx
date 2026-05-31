import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
import { SiteCard } from "@/components/site/site-card";
import {
  formatStartsAt,
  isPairFormat,
} from "@/lib/public-display";
import {
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/validators";

type TournamentListItem = {
  id: string;
  name: string;
  description?: string | null;
  format: string;
  status: string;
  startsAt: Date | null;
  club: {
    name: string;
    city: { nameRu: string; country?: { nameRu: string } };
  };
  _count: { registrations: number; teams: number };
};

export function TournamentCard({
  tournament: t,
  href,
  compact,
}: {
  tournament: TournamentListItem;
  href: string;
  compact?: boolean;
}) {
  const participants = isPairFormat(t.format) ? t._count.teams : t._count.registrations;
  const location = t.club.city.country
    ? `${t.club.city.nameRu}, ${t.club.city.country.nameRu}`
    : t.club.city.nameRu;

  return (
    <SiteCard href={href}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={compact ? "font-semibold" : "text-lg font-semibold"}>{t.name}</h3>
        <StatusBadge
          status={t.status}
          label={TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}
        />
      </div>
      <p className="mt-2 text-sm text-zinc-400">
        {TOURNAMENT_FORMAT_LABELS[t.format] ?? t.format}
        {" · "}
        {t.club.name}
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        {formatStartsAt(t.startsAt)}
        {participants > 0 && ` · ${participants} участников`}
      </p>
      <p className="mt-1 text-xs text-emerald-700/80">{location}</p>
        {!compact && t.description && (
        <p className="home-card-body mt-3 line-clamp-3 text-sm">{t.description}</p>
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
