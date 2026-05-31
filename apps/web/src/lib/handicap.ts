/** Фора по системе 0,5: шаг рейтинга = 0,5 шара (полный — в каждой партии, половинный — в нечётных). */

export interface HandicapBreakdown {
  ballsEveryGame: number;
  extraBallOnOddGames: boolean;
  ratingDiff: number;
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function calculateHandicap(
  higherRating: number,
  lowerRating: number,
): HandicapBreakdown {
  const diff = roundToHalf(Math.max(0, higherRating - lowerRating));
  const fullBalls = Math.floor(diff);
  const hasHalfStep = diff - fullBalls >= 0.25;

  return {
    ratingDiff: diff,
    ballsEveryGame: fullBalls,
    extraBallOnOddGames: hasHalfStep,
  };
}

/** Сколько шаров форы сильнейший отдаёт в партии gameNumber (1-based). */
export function getHandicapForGame(
  higherRating: number,
  lowerRating: number,
  gameNumber: number,
): number {
  const { ballsEveryGame, extraBallOnOddGames } = calculateHandicap(
    higherRating,
    lowerRating,
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
): string {
  const h = calculateHandicap(higherRating, lowerRating);
  if (h.ratingDiff === 0) return "Без форы";
  const parts: string[] = [];
  if (h.ballsEveryGame > 0) {
    parts.push(
      `${h.ballsEveryGame} шар(а) в каждой партии`,
    );
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
): string {
  const h = calculateHandicap(higherRating, lowerRating);
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
