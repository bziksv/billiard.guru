/** Клиентские типы цепочки рейтинга (без серверных импортов). */

export type PlayerRatingTraceStepDto = {
  matchId: string;
  at: string;
  opponentName: string;
  won: boolean;
  isPair: boolean;
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  opponentRatingBefore: number;
};

export type PlayerRatingJournalStepDto = {
  matchId: string | null;
  at: string;
  won: boolean;
  oldRating: number;
  newRating: number;
  delta: number;
  opponentName: string | null;
  isPair: boolean | null;
};

export type PlayerRatingTraceDto = {
  playerId: string;
  playerName: string;
  formula: string;
  formulaLabel: string;
  seedMode: "ratingBase" | "current" | "snapshot";
  seedLabel: string | null;
  seedRating: number;
  simulatedRating: number;
  currentRating: number;
  ratingBase: number;
  steps: PlayerRatingTraceStepDto[];
  journal: PlayerRatingJournalStepDto[];
  note: string;
};
