export type TournamentDefaults = {
  handicapHalfStep: boolean;
  limitByRating: boolean;
  ratingMax: number | null;
};

export const FALLBACK_TOURNAMENT_DEFAULTS: TournamentDefaults = {
  handicapHalfStep: true,
  limitByRating: true,
  ratingMax: 8,
};
