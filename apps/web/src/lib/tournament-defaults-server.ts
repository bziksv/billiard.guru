import { prisma } from "@/lib/prisma";
import {
  FALLBACK_TOURNAMENT_DEFAULTS,
  type TournamentDefaults,
} from "@/lib/tournament-defaults";

export type { TournamentDefaults } from "@/lib/tournament-defaults";
export { FALLBACK_TOURNAMENT_DEFAULTS } from "@/lib/tournament-defaults";

const GLOBAL_ID = "default";

export async function getTournamentDefaults(): Promise<TournamentDefaults> {
  const row = await prisma.tournamentDefaultsConfig.findUnique({
    where: { id: GLOBAL_ID },
  });
  if (!row) return { ...FALLBACK_TOURNAMENT_DEFAULTS };
  return {
    handicapHalfStep: row.handicapHalfStep,
    limitByRating: row.limitByRating,
    ratingMax: row.limitByRating ? row.ratingMax : null,
  };
}

export async function saveTournamentDefaults(
  data: TournamentDefaults,
): Promise<void> {
  const ratingMax = data.limitByRating ? data.ratingMax : null;
  await prisma.tournamentDefaultsConfig.upsert({
    where: { id: GLOBAL_ID },
    create: {
      id: GLOBAL_ID,
      handicapHalfStep: data.handicapHalfStep,
      limitByRating: data.limitByRating,
      ratingMax,
    },
    update: {
      handicapHalfStep: data.handicapHalfStep,
      limitByRating: data.limitByRating,
      ratingMax,
    },
  });
}
