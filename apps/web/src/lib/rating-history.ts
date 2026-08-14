/**
 * Восстановление клубного рейтинга на момент времени по audit_logs
 * (club.player_rating.set/update/remove) + текущий ClubPlayerRating.
 */

export type RatingTimelinePoint = {
  at: number;
  rating: number;
};

export function ratingAtTime(
  timeline: RatingTimelinePoint[] | undefined,
  at: Date,
  fallback: number,
): number {
  if (!timeline?.length) return fallback;
  const t = at.getTime();
  let best: number | null = null;
  for (const p of timeline) {
    if (p.at <= t) best = p.rating;
    else break;
  }
  // Событий до даты ещё не было — в клубе рейтинга не было
  if (best === null) return 0;
  return best;
}

type AuditLike = {
  action: string;
  createdAt: Date;
  entityId: string | null;
  payload: unknown;
};

type ClubRatingRow = {
  id: string;
  playerId: string;
  rating: number;
  updatedAt: Date;
};

/** Собирает timeline playerId → точки по возрастанию времени. */
export function buildClubRatingTimelines(input: {
  audits: AuditLike[];
  currentRows: ClubRatingRow[];
  playerIds?: Set<string>;
}): Map<string, RatingTimelinePoint[]> {
  const entityToPlayer = new Map<string, string>();
  for (const row of input.currentRows) {
    entityToPlayer.set(row.id, row.playerId);
  }

  const timelines = new Map<string, RatingTimelinePoint[]>();

  const push = (playerId: string, at: number, rating: number) => {
    if (input.playerIds && !input.playerIds.has(playerId)) return;
    if (!Number.isFinite(rating)) return;
    const list = timelines.get(playerId) ?? [];
    const last = list[list.length - 1];
    if (last && last.at === at && last.rating === rating) return;
    list.push({ at, rating });
    timelines.set(playerId, list);
  };

  for (const a of input.audits) {
    const payload =
      a.payload && typeof a.payload === "object"
        ? (a.payload as Record<string, unknown>)
        : null;

    if (
      a.action === "club.player_rating.set" &&
      a.entityId &&
      typeof payload?.playerId === "string"
    ) {
      entityToPlayer.set(a.entityId, payload.playerId);
    }

    let playerId =
      typeof payload?.playerId === "string" ? payload.playerId : undefined;
    if (!playerId && a.entityId) {
      playerId = entityToPlayer.get(a.entityId);
    }
    if (!playerId) continue;

    if (a.action === "club.player_rating.remove") {
      push(playerId, a.createdAt.getTime(), 0);
      continue;
    }

    const rating = Number(payload?.rating);
    if (!Number.isFinite(rating)) continue;
    push(playerId, a.createdAt.getTime(), rating);
  }

  // Хвост = актуальный рейтинг в БД (если расходится с последним аудитом)
  for (const row of input.currentRows) {
    if (input.playerIds && !input.playerIds.has(row.playerId)) continue;
    const list = timelines.get(row.playerId) ?? [];
    const last = list[list.length - 1];
    if (last && last.rating === row.rating) continue;
    const tipAt = Math.max(
      row.updatedAt.getTime(),
      (last?.at ?? 0) + 1,
    );
    push(row.playerId, tipAt, row.rating);
  }

  return timelines;
}
