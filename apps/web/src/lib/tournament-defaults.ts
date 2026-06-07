import type { TournamentRatingSource } from "@/lib/tournament-rating-display";

export type TournamentDefaults = {
  handicapHalfStep: boolean;
  limitByRating: boolean;
  ratingMax: number | null;
  ratingSource: TournamentRatingSource;
};

export const FALLBACK_TOURNAMENT_DEFAULTS: TournamentDefaults = {
  handicapHalfStep: true,
  limitByRating: true,
  ratingMax: 8,
  ratingSource: "CLUB",
};
