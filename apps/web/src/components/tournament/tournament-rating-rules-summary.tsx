import { formatTournamentRatingRulesSummary } from "@/lib/tournament-rating-display";

export function TournamentRatingRulesSummary({
  tournament,
  className = "text-sm text-zinc-500",
}: {
  tournament: {
    ratingMax?: number | null;
    handicapHalfStep?: boolean;
  };
  className?: string;
}) {
  return (
    <p className={className}>
      <span className="text-zinc-400">Условия: </span>
      {formatTournamentRatingRulesSummary(tournament)}
      <span className="text-zinc-600">
        {" "}
        (для записи сначала клубный рейтинг, иначе общий)
      </span>
    </p>
  );
}
