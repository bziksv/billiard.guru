import {
  formatTournamentRatingRulesSummary,
  tournamentRatingSourceHint,
  type TournamentRatingSource,
} from "@/lib/tournament-rating-display";

export function TournamentRatingRulesSummary({
  tournament,
  className = "text-sm text-zinc-500",
}: {
  tournament: {
    ratingMax?: number | null;
    handicapHalfStep?: boolean;
    ratingSource?: TournamentRatingSource;
  };
  className?: string;
}) {
  const source = tournament.ratingSource ?? "CLUB";
  return (
    <p className={className}>
      <span className="text-zinc-400">Условия: </span>
      {formatTournamentRatingRulesSummary(tournament)}
      {tournament.ratingMax != null && (
        <span className="text-zinc-600"> ({tournamentRatingSourceHint(source)})</span>
      )}
    </p>
  );
}
