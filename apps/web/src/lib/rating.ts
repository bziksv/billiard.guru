/** Рейтинг с шагом 0,5. После матча пересчитывается для обоих игроков. */

export const RATING_STEP = 0.5;
export const MIN_PLAYER_RATING = 0;
/** Верхняя граница рейтинга в формах и лимите турнира (шаг 0,5). */
export const MAX_PLAYER_RATING = 20;

const STEP = RATING_STEP;
const MIN_RATING = MIN_PLAYER_RATING;

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export interface RatingChangeResult {
  winnerDelta: number;
  loserDelta: number;
  winnerNew: number;
  loserNew: number;
}

/**
 * Победа над равным или более сильным — +0,5 победителю, −0,5 проигравшему.
 * Победа фаворита (разница ≥ 0,5) — проигравший −0,5, победитель без изменений.
 */
export function calculateRatingChange(
  winnerRating: number,
  loserRating: number,
): RatingChangeResult {
  const diff = winnerRating - loserRating;
  let winnerDelta = 0;
  let loserDelta = 0;

  if (diff <= 0) {
    winnerDelta = STEP;
    loserDelta = -STEP;
  } else if (diff < STEP) {
    winnerDelta = STEP;
    loserDelta = -STEP;
  } else {
    winnerDelta = 0;
    loserDelta = -STEP;
  }

  return {
    winnerDelta,
    loserDelta,
    winnerNew: roundToHalf(Math.max(MIN_RATING, winnerRating + winnerDelta)),
    loserNew: roundToHalf(Math.max(MIN_RATING, loserRating + loserDelta)),
  };
}

export function formatRating(rating: number): string {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}
