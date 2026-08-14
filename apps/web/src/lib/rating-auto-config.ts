import type { RatingPreviewFormula } from "@/lib/rating-preview";
import {
  DEFAULT_MIN_H2H_MATCHES,
  DEFAULT_MIN_TOURNAMENTS,
} from "@/lib/rating-preview";

export type RatingAutoConfig = {
  enabled: boolean;
  formula: RatingPreviewFormula;
  minTournaments: number;
  minH2hMatches: number;
};

export const FALLBACK_RATING_AUTO_CONFIG: RatingAutoConfig = {
  enabled: false,
  formula: "tiny_equal",
  minTournaments: DEFAULT_MIN_TOURNAMENTS,
  minH2hMatches: DEFAULT_MIN_H2H_MATCHES,
};

export const RATING_PREVIEW_FORMULA_OPTIONS: {
  value: RatingPreviewFormula;
  label: string;
  short: string;
}[] = [
  {
    value: "soft",
    label: "1. С форой — равные ±0,25; фаворит ±0,1; апсет ±0,25",
    short: "С форой (±0,25 / ±0,1)",
  },
  {
    value: "upset_only",
    label: "2. Только равные и апсет ±0,25; фаворит → 0",
    short: "Равные/апсет ±0,25",
  },
  {
    value: "upset_mild",
    label: "3. Равные ±0,1; апсет ±0,15; фаворит → 0",
    short: "Равные ±0,1 / апсет ±0,15 / фав. 0",
  },
  {
    value: "mild_all",
    label: "4. Равные ±0,1; апсет ±0,15; фаворит ±0,1",
    short: "Равные ±0,1 / апсет ±0,15 / фав. ±0,1",
  },
  {
    value: "tiny_equal",
    label: "5. Равные ±0,05; апсет ±0,15; фаворит ±0,1",
    short: "Равные ±0,05 / апсет ±0,15 / фав. ±0,1",
  },
  {
    value: "elo",
    label: "6. Elo — ожидаемая сила (K=0,2, D=1)",
    short: "Elo (K=0,2)",
  },
  {
    value: "micro_equal",
    label: "7. Равные ±0,025; апсет ±0,15; фаворит ±0,1",
    short: "Равные ±0,025 / апсет ±0,15 / фав. ±0,1",
  },
];

const FORMULA_SET = new Set(
  RATING_PREVIEW_FORMULA_OPTIONS.map((o) => o.value),
);

export function parseRatingPreviewFormula(
  value: string | null | undefined,
): RatingPreviewFormula {
  if (value && FORMULA_SET.has(value as RatingPreviewFormula)) {
    return value as RatingPreviewFormula;
  }
  return FALLBACK_RATING_AUTO_CONFIG.formula;
}
