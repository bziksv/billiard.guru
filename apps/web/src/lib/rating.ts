/** Рейтинг с шагом 0,5. После матча пересчитывается для обоих игроков. */

/** Шаг форы / лимита «макс. рейтинг» (шары за каждые 0,5). */
export const RATING_STEP = 0.5;
/**
 * Шаг ручного ввода рейтинга (общий, клубный, override в турнире).
 * Автоформулы могут давать 0,025 — при ручном сохранении привязываем к 0,05.
 */
export const RATING_EDIT_STEP = 0.05;
export const MIN_PLAYER_RATING = 0;
/** Верхняя граница рейтинга в формах и лимите турнира. */
export const MAX_PLAYER_RATING = 20;

const STEP = RATING_STEP;
const MIN_RATING = MIN_PLAYER_RATING;

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/** Привязка к шагу ручного ввода (0,05). */
export function snapToRatingEditStep(value: number): number {
  const g = 1 / RATING_EDIT_STEP;
  return Math.max(MIN_PLAYER_RATING, Math.round(value * g) / g);
}

export function isOnRatingEditStep(value: number): boolean {
  return Math.abs(value - snapToRatingEditStep(value)) < 1e-9;
}

export interface RatingChangeResult {
  winnerDelta: number;
  loserDelta: number;
  winnerNew: number;
  loserNew: number;
}

/**
 * Жёсткий вариант (legacy /api/rating):
 * победа над равным/сильнее — +0,5/−0,5; победа фаворита — 0/−0,5.
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

/** Шаг превью: равный уровень. */
export const PREVIEW_STEP_EQUAL = 0.25;
/** Шаг превью: соперник слабее (разница ≥ порога). */
export const PREVIEW_STEP_WEAKER = 0.1;
/** Формула 3–4: шаг за равных. */
export const PREVIEW_STEP_EQUAL_MILD = 0.1;
/** Формула 5: шаг за равных. */
export const PREVIEW_STEP_EQUAL_TINY = 0.05;
/** Формула 7: шаг за равных. */
export const PREVIEW_STEP_EQUAL_MICRO = 0.025;
/** Формула 3–5: шаг за апсет. */
export const PREVIEW_STEP_UPSET_MILD = 0.15;
/** Формула 4–5: шаг за победу фаворита над слабее. */
export const PREVIEW_STEP_FAVORITE_MILD = 0.1;
/** |Δ рейтинга| меньше этого — считаем «тот же уровень» (формулы 1–2). */
export const PREVIEW_EQUAL_BAND = 0.5;
/** Сетка превью (0,025 — чтобы жили 0,025 / 0,05 / 0,1 / 0,15 / 0,25). */
export const PREVIEW_RATING_GRID = 0.025;

export function roundToPreviewGrid(value: number): number {
  const g = 1 / PREVIEW_RATING_GRID;
  return Math.round(value * g) / g;
}

function previewChangeResult(
  winnerRating: number,
  loserRating: number,
  winnerDelta: number,
  loserDelta: number,
): RatingChangeResult {
  return {
    winnerDelta,
    loserDelta,
    winnerNew: roundToPreviewGrid(
      Math.min(MAX_PLAYER_RATING, Math.max(MIN_RATING, winnerRating + winnerDelta)),
    ),
    loserNew: roundToPreviewGrid(
      Math.max(MIN_RATING, loserRating + loserDelta),
    ),
  };
}

/**
 * Превью с учётом форы и силы соперника:
 * — тот же уровень (|Δ| < 0,5) → ±0,25;
 * — победа над слабее (Δ ≥ 0,5) → ±0,1;
 * — апсет (слабый выиграл у сильнее) → ±0,25.
 */
export function calculateRatingChangeSoft(
  winnerRating: number,
  loserRating: number,
): RatingChangeResult {
  const diff = winnerRating - loserRating;
  let step: number;
  if (Math.abs(diff) < PREVIEW_EQUAL_BAND) {
    step = PREVIEW_STEP_EQUAL;
  } else if (diff >= PREVIEW_EQUAL_BAND) {
    step = PREVIEW_STEP_WEAKER;
  } else {
    step = PREVIEW_STEP_EQUAL;
  }
  return previewChangeResult(winnerRating, loserRating, step, -step);
}

/**
 * Превью «только за сильных»: очки за равных и за апсет; победа фаворита над слабее — нули.
 * — равные (|Δ| < 0,5) → ±0,25;
 * — сильнее обыграл слабее → 0 / 0;
 * — слабее обыграл сильнее → ±0,25.
 */
export function calculateRatingChangeUpsetOnly(
  winnerRating: number,
  loserRating: number,
): RatingChangeResult {
  const diff = winnerRating - loserRating;
  if (diff >= PREVIEW_EQUAL_BAND) {
    return previewChangeResult(winnerRating, loserRating, 0, 0);
  }
  return previewChangeResult(
    winnerRating,
    loserRating,
    PREVIEW_STEP_EQUAL,
    -PREVIEW_STEP_EQUAL,
  );
}

/**
 * Формула 3 — только равные и апсет, мелкий шаг:
 * — равные (|Δ| ≤ 0,5) → ±0,1;
 * — слабее обыграл сильнее → ±0,15;
 * — сильнее обыграл слабее → 0 / 0.
 */
export function calculateRatingChangeUpsetMild(
  winnerRating: number,
  loserRating: number,
): RatingChangeResult {
  const diff = winnerRating - loserRating;
  if (Math.abs(diff) <= PREVIEW_EQUAL_BAND) {
    return previewChangeResult(
      winnerRating,
      loserRating,
      PREVIEW_STEP_EQUAL_MILD,
      -PREVIEW_STEP_EQUAL_MILD,
    );
  }
  if (diff > PREVIEW_EQUAL_BAND) {
    return previewChangeResult(winnerRating, loserRating, 0, 0);
  }
  return previewChangeResult(
    winnerRating,
    loserRating,
    PREVIEW_STEP_UPSET_MILD,
    -PREVIEW_STEP_UPSET_MILD,
  );
}

/**
 * Формула 4 — равные / апсет / фаворит, мелкий шаг:
 * — равные (|Δ| ≤ 0,5) → ±0,1;
 * — слабее обыграл сильнее → ±0,15;
 * — сильнее обыграл слабее → ±0,1.
 */
export function calculateRatingChangeMildAll(
  winnerRating: number,
  loserRating: number,
): RatingChangeResult {
  const diff = winnerRating - loserRating;
  if (Math.abs(diff) <= PREVIEW_EQUAL_BAND) {
    return previewChangeResult(
      winnerRating,
      loserRating,
      PREVIEW_STEP_EQUAL_MILD,
      -PREVIEW_STEP_EQUAL_MILD,
    );
  }
  if (diff > PREVIEW_EQUAL_BAND) {
    return previewChangeResult(
      winnerRating,
      loserRating,
      PREVIEW_STEP_FAVORITE_MILD,
      -PREVIEW_STEP_FAVORITE_MILD,
    );
  }
  return previewChangeResult(
    winnerRating,
    loserRating,
    PREVIEW_STEP_UPSET_MILD,
    -PREVIEW_STEP_UPSET_MILD,
  );
}

/**
 * Формула 5 — как 4, но равные ещё мельче:
 * — равные (|Δ| ≤ 0,5) → ±0,05;
 * — слабее обыграл сильнее → ±0,15;
 * — сильнее обыграл слабее → ±0,1.
 */
export function calculateRatingChangeTinyEqual(
  winnerRating: number,
  loserRating: number,
): RatingChangeResult {
  const diff = winnerRating - loserRating;
  if (Math.abs(diff) <= PREVIEW_EQUAL_BAND) {
    return previewChangeResult(
      winnerRating,
      loserRating,
      PREVIEW_STEP_EQUAL_TINY,
      -PREVIEW_STEP_EQUAL_TINY,
    );
  }
  if (diff > PREVIEW_EQUAL_BAND) {
    return previewChangeResult(
      winnerRating,
      loserRating,
      PREVIEW_STEP_FAVORITE_MILD,
      -PREVIEW_STEP_FAVORITE_MILD,
    );
  }
  return previewChangeResult(
    winnerRating,
    loserRating,
    PREVIEW_STEP_UPSET_MILD,
    -PREVIEW_STEP_UPSET_MILD,
  );
}

/**
 * Формула 7 — как 5, но равные ещё мельче:
 * — равные (|Δ| ≤ 0,5) → ±0,025;
 * — слабее обыграл сильнее → ±0,15;
 * — сильнее обыграл слабее → ±0,1.
 */
export function calculateRatingChangeMicroEqual(
  winnerRating: number,
  loserRating: number,
): RatingChangeResult {
  const diff = winnerRating - loserRating;
  if (Math.abs(diff) <= PREVIEW_EQUAL_BAND) {
    return previewChangeResult(
      winnerRating,
      loserRating,
      PREVIEW_STEP_EQUAL_MICRO,
      -PREVIEW_STEP_EQUAL_MICRO,
    );
  }
  if (diff > PREVIEW_EQUAL_BAND) {
    return previewChangeResult(
      winnerRating,
      loserRating,
      PREVIEW_STEP_FAVORITE_MILD,
      -PREVIEW_STEP_FAVORITE_MILD,
    );
  }
  return previewChangeResult(
    winnerRating,
    loserRating,
    PREVIEW_STEP_UPSET_MILD,
    -PREVIEW_STEP_UPSET_MILD,
  );
}

/**
 * Формула 6 — Elo на шкале billiard.guru (0…20).
 *
 * Ожидаемая вероятность победы:
 *   E = 1 / (1 + 10^((R_loser − R_winner) / D)), D = {@link ELO_SCALE}
 * Дельта: K · (1 − E), K = {@link ELO_K}; проигравший −дельта (zero-sum).
 * Округление на сетку 0,05.
 *
 * При D=1 и K=0,2: равные ≈ ±0,1; фаворит +0,5 ≈ ±0,05; апсет −0,5 ≈ ±0,15.
 */
export const ELO_SCALE = 1;
export const ELO_K = 0.2;

export function calculateRatingChangeElo(
  winnerRating: number,
  loserRating: number,
): RatingChangeResult {
  const expected =
    1 / (1 + 10 ** ((loserRating - winnerRating) / ELO_SCALE));
  const winnerDelta = roundToPreviewGrid(ELO_K * (1 - expected));
  const loserDelta = -winnerDelta;
  return previewChangeResult(
    winnerRating,
    loserRating,
    winnerDelta,
    loserDelta,
  );
}

export function formatRating(rating: number): string {
  const n = Number(rating);
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return String(n);
  // Сетка до 0,025: не режем toFixed(1)/toFixed(2) вслепую
  const rounded = roundToPreviewGrid(n);
  if (Number.isInteger(rounded)) return String(rounded);
  return String(Number(rounded.toFixed(3)));
}
