import { EmptyState } from "@/components/site/site-card";
import { TournamentCard } from "@/components/site/tournament-card";
import type { TournamentTab } from "@/lib/tournament-tabs";
import type { PublicTournamentListItem } from "@/lib/tournament-public-read";

type TournamentListItem = PublicTournamentListItem;

function TournamentGrid({
  tournaments,
  formatLabels,
}: {
  tournaments: TournamentListItem[];
  formatLabels: Record<string, string>;
}) {
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {tournaments.map((tournament) => (
        <li key={tournament.id}>
          <TournamentCard
            tournament={{
              ...tournament,
              formatLabel: formatLabels[tournament.format],
            }}
            href={`/tournaments/${tournament.id}`}
          />
        </li>
      ))}
    </ul>
  );
}

export function TournamentsListSection({
  tournaments,
  subtitle,
  compactEmpty,
  formatLabels,
  emptyTitle,
  emptyDescription,
}: {
  tournaments: TournamentListItem[];
  tab: TournamentTab;
  subtitle?: string;
  compactEmpty?: boolean;
  formatLabels: Record<string, string>;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (tournaments.length === 0) {
    if (compactEmpty) {
      return subtitle ? (
        <section className="space-y-3">
          <h2 className="site-page-subtitle">{subtitle}</h2>
          <p className="home-card-muted text-sm">{emptyDescription}</p>
        </section>
      ) : null;
    }
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <section className="space-y-4">
      {subtitle && <h2 className="site-page-subtitle">{subtitle}</h2>}
      <TournamentGrid tournaments={tournaments} formatLabels={formatLabels} />
    </section>
  );
}
