/** Фора: при halfStep — шаг рейтинга 0,5 (полный шар в каждой партии, половинный — +1 в нечётных). */

export interface HandicapBreakdown {
  ballsEveryGame: number;
  extraBallOnOddGames: boolean;
  ratingDiff: number;
}

export type HandicapOptions = {
  /** Учитывать дробную часть рейтинга (0,5). По умолчанию true. */
  halfStep?: boolean;
};

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function resolveHalfStep(options?: HandicapOptions): boolean {
  return options?.halfStep !== false;
}

export function calculateHandicap(
  higherRating: number,
  lowerRating: number,
  options?: HandicapOptions,
): HandicapBreakdown {
  const halfStep = resolveHalfStep(options);

  if (halfStep) {
    const diff = roundToHalf(Math.max(0, higherRating - lowerRating));
    const fullBalls = Math.floor(diff);
    const hasHalfStep = diff - fullBalls >= 0.25;
    return {
      ratingDiff: diff,
      ballsEveryGame: fullBalls,
      extraBallOnOddGames: hasHalfStep,
    };
  }

  // Без шага 0,5: для форы берём целую часть каждого рейтинга (1,5 → 1, 3,5 → 3).
  const diff = Math.max(
    0,
    Math.floor(higherRating) - Math.floor(lowerRating),
  );
  return {
    ratingDiff: diff,
    ballsEveryGame: diff,
    extraBallOnOddGames: false,
  };
}

/** Сколько шаров форы сильнейший отдаёт в партии gameNumber (1-based). */
export function getHandicapForGame(
  higherRating: number,
  lowerRating: number,
  gameNumber: number,
  options?: HandicapOptions,
): number {
  const { ballsEveryGame, extraBallOnOddGames } = calculateHandicap(
    higherRating,
    lowerRating,
    options,
  );
  let balls = ballsEveryGame;
  if (extraBallOnOddGames && gameNumber % 2 === 1) {
    balls += 1;
  }
  return balls;
}

export function describeHandicap(
  higherRating: number,
  lowerRating: number,
  options?: HandicapOptions,
): string {
  const h = calculateHandicap(higherRating, lowerRating, options);
  if (h.ratingDiff === 0) return "Без форы";
  const parts: string[] = [];
  if (h.ballsEveryGame > 0) {
    parts.push(`${h.ballsEveryGame} шар(а) в каждой партии`);
  }
  if (h.extraBallOnOddGames) {
    parts.push("1 шар в нечётных партиях");
  }
  return parts.join(", ");
}

/** Короткая подпись форы для карточки сетки. */
export function describeHandicapShort(
  higherRating: number,
  lowerRating: number,
  options?: HandicapOptions,
): string {
  const h = calculateHandicap(higherRating, lowerRating, options);
  if (h.ratingDiff === 0) return "Без форы";
  const parts: string[] = [];
  if (h.ballsEveryGame > 0) {
    parts.push(`${h.ballsEveryGame} в каждой партии`);
  }
  if (h.extraBallOnOddGames) {
    parts.push("+1 в нечётных");
  }
  return parts.join(", ");
}
