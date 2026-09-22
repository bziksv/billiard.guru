import type { TournamentRatingSource } from "@/lib/tournament-rating-display";

export type TournamentDefaults = {
  handicapHalfStep: boolean;
  handicapEvenExtraCancelOnFirstLoss: boolean;
  limitByRating: boolean;
  ratingMax: number | null;
  ratingSource: TournamentRatingSource;
};

export const FALLBACK_TOURNAMENT_DEFAULTS: TournamentDefaults = {
  handicapHalfStep: true,
  handicapEvenExtraCancelOnFirstLoss: false,
  limitByRating: true,
  ratingMax: 8,
  ratingSource: "SYSTEM",
};
