import { prisma } from "@/lib/prisma";

/** Турнир «завис», если не завершён за 5 суток после даты старта (или публикации). */
export const TOURNAMENT_STALE_AFTER_MS = 5 * 24 * 60 * 60 * 1000;

const STALE_STATUSES = ["OPEN", "ACTIVE"] as const;

let lastCloseAt = 0;
const THROTTLE_MS = 60_000;

/**
 * Закрывает OPEN/ACTIVE турниры старше 5 дней со статусом DID_NOT_TAKE_PLACE.
 * Throttle — не чаще раза в минуту на процесс.
 */
export async function closeStaleTournaments(options?: {
  force?: boolean;
}): Promise<number> {
  const now = Date.now();
  if (!options?.force && now - lastCloseAt < THROTTLE_MS) return 0;
  lastCloseAt = now;

  const cutoff = new Date(now - TOURNAMENT_STALE_AFTER_MS);

  const withStart = await prisma.tournament.updateMany({
    where: {
      status: { in: [...STALE_STATUSES] },
      startsAt: { lt: cutoff },
    },
    data: { status: "DID_NOT_TAKE_PLACE" },
  });

  const withoutStart = await prisma.tournament.updateMany({
    where: {
      status: { in: [...STALE_STATUSES] },
      startsAt: null,
      OR: [
        { publishedAt: { lt: cutoff } },
        { AND: [{ publishedAt: null }, { createdAt: { lt: cutoff } }] },
      ],
    },
    data: { status: "DID_NOT_TAKE_PLACE" },
  });

  return withStart.count + withoutStart.count;
}

export function isPastTournamentStatus(status: string): boolean {
  return status === "FINISHED" || status === "DID_NOT_TAKE_PLACE";
}
