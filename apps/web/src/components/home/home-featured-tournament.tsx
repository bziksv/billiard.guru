import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatStartsAt, isPairFormat } from "@/lib/public-display";
import { tournamentFormatDisplayLabel } from "@/lib/tournament-format-display";
import { TOURNAMENT_STATUS_LABELS } from "@/lib/validators";

type FeaturedTournament = {
  id: string;
  name: string;
  description?: string | null;
  format: string;
  formatLabel?: string | null;
  status: string;
  startsAt: Date | null;
  club: {
    name: string;
    city: { nameRu: string; country?: { nameRu: string } };
  };
  _count: { registrations: number; teams: number };
};

export function HomeFeaturedTournament({
  tournament,
}: {
  tournament: FeaturedTournament;
}) {
  const participants = isPairFormat(tournament.format)
    ? tournament._count.teams
    : tournament._count.registrations;
  const location = tournament.club.city.country
    ? `${tournament.club.city.nameRu}, ${tournament.club.city.country.nameRu}`
    : tournament.club.city.nameRu;

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="home-featured-card home-card-glow group mb-8 block overflow-hidden rounded-3xl p-6 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600">
            Ближайший турнир
          </p>
          <h3 className="home-card-title mt-2 text-2xl font-bold group-hover:text-emerald-700 md:text-3xl">
            {tournament.name}
          </h3>
        </div>
        <StatusBadge
          status={tournament.status}
          label={TOURNAMENT_STATUS_LABELS[tournament.status] ?? tournament.status}
        />
      </div>
      <p className="home-card-body mt-4">
        {tournamentFormatDisplayLabel(tournament)} · {tournament.club.name}
      </p>
      <p className="home-card-muted mt-1 text-sm">
        {formatStartsAt(tournament.startsAt)} · {participants} участников · {location}
      </p>
      {tournament.description && (
        <p className="home-card-muted mt-4 line-clamp-2 max-w-2xl text-sm">
          {tournament.description}
        </p>
      )}
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 transition-all group-hover:gap-3">
        Подробности и сетка
        <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
