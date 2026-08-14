import { prisma } from "@/lib/prisma";
import {
  FALLBACK_RATING_AUTO_CONFIG,
  parseRatingPreviewFormula,
  type RatingAutoConfig,
} from "@/lib/rating-auto-config";

const GLOBAL_ID = "default";

export async function getRatingAutoConfig(): Promise<RatingAutoConfig> {
  const row = await prisma.ratingAutoConfig.findUnique({
    where: { id: GLOBAL_ID },
  });
  if (!row) return { ...FALLBACK_RATING_AUTO_CONFIG };
  return {
    enabled: row.enabled,
    formula: parseRatingPreviewFormula(row.formula),
    minTournaments: row.minTournaments,
    minH2hMatches: row.minH2hMatches,
  };
}

export async function saveRatingAutoConfig(
  data: RatingAutoConfig,
): Promise<RatingAutoConfig> {
  const formula = parseRatingPreviewFormula(data.formula);
  const minTournaments = Math.min(50, Math.max(1, Math.floor(data.minTournaments)));
  const minH2hMatches = Math.min(100, Math.max(2, Math.floor(data.minH2hMatches)));
  const row = await prisma.ratingAutoConfig.upsert({
    where: { id: GLOBAL_ID },
    create: {
      id: GLOBAL_ID,
      enabled: data.enabled,
      formula,
      minTournaments,
      minH2hMatches,
    },
    update: {
      enabled: data.enabled,
      formula,
      minTournaments,
      minH2hMatches,
    },
  });
  return {
    enabled: row.enabled,
    formula: parseRatingPreviewFormula(row.formula),
    minTournaments: row.minTournaments,
    minH2hMatches: row.minH2hMatches,
  };
}
