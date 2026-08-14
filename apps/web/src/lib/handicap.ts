/** Фора: при halfStep — шаг рейтинга 0,5 (полный шар в каждой партии, половинный — +1 в чётных). */

import type { AppLocale } from "@/i18n/routing";

export interface HandicapBreakdown {
  ballsEveryGame: number;
  /** +1 шар в чётных партиях (2, 4, 6…) при дробной разнице рейтинга. */
  extraBallOnEvenGames: boolean;
  ratingDiff: number;
}

export type HandicapOptions = {
  /** Учитывать дробную часть рейтинга (0,5). По умолчанию true. */
  halfStep?: boolean;
  locale?: AppLocale;
};

function resolveLocale(options?: HandicapOptions): AppLocale {
  return options?.locale ?? "ru";
}

function noHandicapLabel(locale: AppLocale): string {
  return locale === "en" ? "No handicap" : "Без форы";
}

function shortPerGameLabel(balls: number, locale: AppLocale): string {
  if (locale === "en") {
    return balls === 1 ? "1 per frame" : `${balls} per frame`;
  }
  return `${balls} в каждой партии`;
}

function shortEvenGameLabel(locale: AppLocale): string {
  return locale === "en" ? "+1 in even frames" : "+1 в чётных";
}

function fullPerGameLabel(balls: number, locale: AppLocale): string {
  if (locale === "en") {
    return balls === 1 ? "1 ball per frame" : `${balls} balls per frame`;
  }
  return `${balls} шар(а) в каждой партии`;
}

function fullEvenGameLabel(locale: AppLocale): string {
  return locale === "en" ? "1 ball in even frames" : "1 шар в чётных партиях";
}

export function isNoHandicapLabel(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === "Без форы" || trimmed === "No handicap";
}

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
      extraBallOnEvenGames: hasHalfStep,
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
    extraBallOnEvenGames: false,
  };
}

/** Сколько шаров форы сильнейший отдаёт в партии gameNumber (1-based). */
export function getHandicapForGame(
  higherRating: number,
  lowerRating: number,
  gameNumber: number,
  options?: HandicapOptions,
): number {
  const { ballsEveryGame, extraBallOnEvenGames } = calculateHandicap(
    higherRating,
    lowerRating,
    options,
  );
  let balls = ballsEveryGame;
  if (extraBallOnEvenGames && gameNumber % 2 === 0) {
    balls += 1;
  }
  return balls;
}

export function describeHandicap(
  higherRating: number,
  lowerRating: number,
  options?: HandicapOptions,
): string {
  const locale = resolveLocale(options);
  const h = calculateHandicap(higherRating, lowerRating, options);
  if (h.ratingDiff === 0) return noHandicapLabel(locale);
  const parts: string[] = [];
  if (h.ballsEveryGame > 0) {
    parts.push(fullPerGameLabel(h.ballsEveryGame, locale));
  }
  if (h.extraBallOnEvenGames) {
    parts.push(fullEvenGameLabel(locale));
  }
  return parts.join(", ");
}

/** Короткая подпись форы для карточки сетки. */
export function describeHandicapShort(
  higherRating: number,
  lowerRating: number,
  options?: HandicapOptions,
): string {
  const locale = resolveLocale(options);
  const h = calculateHandicap(higherRating, lowerRating, options);
  if (h.ratingDiff === 0) return noHandicapLabel(locale);
  const parts: string[] = [];
  if (h.ballsEveryGame > 0) {
    parts.push(shortPerGameLabel(h.ballsEveryGame, locale));
  }
  if (h.extraBallOnEvenGames) {
    parts.push(shortEvenGameLabel(locale));
  }
  return parts.join(", ");
}
