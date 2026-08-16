/** Фора: при halfStep — шаг 0,5 (полный шар в каждой, половинный — +1 в чётных).
 * Без округления вверх: при разнице < 0,5 форы нет.
 */

import type { AppLocale } from "@/i18n/routing";

export interface HandicapBreakdown {
  ballsEveryGame: number;
  /** +1 шар в чётных партиях (2, 4, 6…) при дробной разнице рейтинга ≥ 0,5. */
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

function resolveHalfStep(options?: HandicapOptions): boolean {
  return options?.halfStep !== false;
}

/** Порог форы и «половинки» — ровно 0,5 без округления вверх. */
const HALF = 0.5;
const EPS = 1e-9;

export function calculateHandicap(
  higherRating: number,
  lowerRating: number,
  options?: HandicapOptions,
): HandicapBreakdown {
  const halfStep = resolveHalfStep(options);
  const raw = Math.max(0, higherRating - lowerRating);

  if (halfStep) {
    // 2.35 vs 1.9 → 0.45 → без форы (раньше roundToHalf давал 0.5 и +1 в чётных)
    if (raw + EPS < HALF) {
      return {
        ratingDiff: 0,
        ballsEveryGame: 0,
        extraBallOnEvenGames: false,
      };
    }
    const fullBalls = Math.floor(raw + EPS);
    const frac = raw - fullBalls;
    const hasHalfStep = frac + EPS >= HALF;
    return {
      ratingDiff: raw,
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

function hasHandicap(h: HandicapBreakdown): boolean {
  return h.ballsEveryGame > 0 || h.extraBallOnEvenGames;
}

export function describeHandicap(
  higherRating: number,
  lowerRating: number,
  options?: HandicapOptions,
): string {
  const locale = resolveLocale(options);
  const h = calculateHandicap(higherRating, lowerRating, options);
  if (!hasHandicap(h)) return noHandicapLabel(locale);
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
  if (!hasHandicap(h)) return noHandicapLabel(locale);
  const parts: string[] = [];
  if (h.ballsEveryGame > 0) {
    parts.push(shortPerGameLabel(h.ballsEveryGame, locale));
  }
  if (h.extraBallOnEvenGames) {
    parts.push(shortEvenGameLabel(locale));
  }
  return parts.join(", ");
}
