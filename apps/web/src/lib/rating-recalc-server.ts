/**
 * Массовый прогон общего рейтинга (Player.rating) по всем завершённым встречам
 * + снимки для отката и сравнения формул.
 */
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  MAX_PLAYER_RATING,
  MIN_PLAYER_RATING,
  roundToPreviewGrid,
} from "@/lib/rating";
import type { RatingPreviewFormula } from "@/lib/rating-preview";
import { ratingChangeForFormula } from "@/lib/rating-preview";

const SNAPSHOT_RETAIN = 10;
const CHUNK = 200;

export type RatingSnapshotListItem = {
  id: string;
  label: string | null;
  formula: string | null;
  playerCount: number;
  matchCount: number | null;
  createdAt: string;
};

export type RatingBulkRecalcResult = {
  snapshotId: string;
  formula: RatingPreviewFormula;
  matchCount: number;
  skippedMatches: number;
  playersTouched: number;
  changeRows: number;
};

let recalcLock = false;

function applyFloor(raw: number, hadUnlockedFloor: boolean): number {
  let after = roundToPreviewGrid(
    Math.min(MAX_PLAYER_RATING, Math.max(MIN_PLAYER_RATING, raw)),
  );
  if (hadUnlockedFloor || after >= 1) {
    after = Math.max(1, after);
  }
  return after;
}

function avg(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

async function createManyChunked<T extends Record<string, unknown>>(
  rows: T[],
  write: (chunk: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await write(rows.slice(i, i + CHUNK));
  }
}

export async function listRatingSnapshots(
  limit = 10,
): Promise<RatingSnapshotListItem[]> {
  const rows = await prisma.playerRatingSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      label: true,
      formula: true,
      playerCount: true,
      matchCount: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    formula: r.formula,
    playerCount: r.playerCount,
    matchCount: r.matchCount,
    createdAt: r.createdAt.toISOString(),
  }));
}

async function pruneOldSnapshots(): Promise<void> {
  const keep = await prisma.playerRatingSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: SNAPSHOT_RETAIN,
    select: { id: true },
  });
  const keepIds = keep.map((k) => k.id);
  if (keepIds.length === 0) return;
  await prisma.playerRatingSnapshot.deleteMany({
    where: { id: { notIn: keepIds } },
  });
}

async function snapshotAllRatings(options: {
  label: string;
  formula: RatingPreviewFormula | null;
  createdById: string | null;
  matchCount?: number | null;
}): Promise<string> {
  const players = await prisma.player.findMany({
    select: { id: true, rating: true },
  });

  const snapshot = await prisma.playerRatingSnapshot.create({
    data: {
      label: options.label,
      formula: options.formula,
      playerCount: players.length,
      matchCount: options.matchCount ?? null,
      createdById: options.createdById,
    },
  });

  await createManyChunked(
    players.map((p) => ({
      snapshotId: snapshot.id,
      playerId: p.id,
      rating: p.rating,
    })),
    (chunk) => prisma.playerRatingSnapshotRow.createMany({ data: chunk }),
  );

  await pruneOldSnapshots();
  return snapshot.id;
}

type MatchSide = { playerIds: string[] };

type FinishedMatch = {
  id: string;
  finishedAt: Date | null;
  createdAt: Date;
  winners: MatchSide;
  losers: MatchSide;
};

async function loadFinishedMatchesForRecalc(): Promise<FinishedMatch[]> {
  const matches = await prisma.tournamentMatch.findMany({
    where: {
      status: "FINISHED",
      winnerTeamId: { not: null },
      team1Id: { not: null },
      team2Id: { not: null },
    },
    select: {
      id: true,
      finishedAt: true,
      createdAt: true,
      winnerTeamId: true,
      team1Id: true,
      team2Id: true,
      team1: {
        select: {
          player1Id: true,
          player2Id: true,
        },
      },
      team2: {
        select: {
          player1Id: true,
          player2Id: true,
        },
      },
    },
    orderBy: [{ finishedAt: "asc" }, { createdAt: "asc" }],
  });

  const out: FinishedMatch[] = [];
  for (const m of matches) {
    if (!m.team1 || !m.team2 || !m.winnerTeamId) continue;
    const side = (t: { player1Id: string; player2Id: string | null }) => {
      const ids = [t.player1Id];
      if (t.player2Id) ids.push(t.player2Id);
      return { playerIds: ids };
    };
    const t1 = side(m.team1);
    const t2 = side(m.team2);
    if (t1.playerIds.length === 0 || t2.playerIds.length === 0) continue;
    if (t1.playerIds.length !== t2.playerIds.length) continue;
    const winnerIsTeam1 = m.winnerTeamId === m.team1Id;
    const winners = winnerIsTeam1 ? t1 : t2;
    const losers = winnerIsTeam1 ? t2 : t1;
    if (winners.playerIds.some((id) => losers.playerIds.includes(id))) continue;
    out.push({
      id: m.id,
      finishedAt: m.finishedAt,
      createdAt: m.createdAt,
      winners,
      losers,
    });
  }

  out.sort((a, b) => {
    const ta = (a.finishedAt ?? a.createdAt).getTime();
    const tb = (b.finishedAt ?? b.createdAt).getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });

  return out;
}

/**
 * Перед прогоном сохраняет снимок текущих рейтингов, затем прогоняет все
 * завершённые встречи от ratingBase (фиксированная база), не от текущего rating.
 */
export async function bulkRecalcSystemRating(options: {
  formula: RatingPreviewFormula;
  createdById: string | null;
}): Promise<RatingBulkRecalcResult> {
  if (recalcLock) {
    throw new Error("Прогон уже выполняется — дождитесь окончания");
  }
  recalcLock = true;
  try {
    const matches = await loadFinishedMatchesForRecalc();
    const players = await prisma.player.findMany({
      select: { id: true, rating: true, ratingBase: true },
    });

    const snapshotId = await snapshotAllRatings({
      label: `Перед прогоном (${options.formula})`,
      formula: options.formula,
      createdById: options.createdById,
      matchCount: matches.length,
    });

    // Старт = ratingBase (идемпотентно при повторном прогоне)
    const ratings = new Map(players.map((p) => [p.id, p.ratingBase]));
    const changeRows: {
      playerId: string;
      oldRating: number;
      newRating: number;
      delta: number;
      reason: string;
      matchId: string;
    }[] = [];

    let skippedMatches = 0;
    const touched = new Set<string>();

    for (const m of matches) {
      const wRatings = m.winners.playerIds.map((id) => ratings.get(id) ?? 0);
      const lRatings = m.losers.playerIds.map((id) => ratings.get(id) ?? 0);
      if (wRatings.length === 0 || lRatings.length === 0) {
        skippedMatches += 1;
        continue;
      }
      if (wRatings.length !== lRatings.length) {
        skippedMatches += 1;
        continue;
      }

      const change = ratingChangeForFormula(
        options.formula,
        avg(wRatings),
        avg(lRatings),
      );

      for (const id of m.winners.playerIds) {
        const before = ratings.get(id) ?? 0;
        const unlocked = before >= 1;
        const after = applyFloor(before + change.winnerDelta, unlocked);
        const delta = roundToPreviewGrid(after - before);
        ratings.set(id, after);
        touched.add(id);
        changeRows.push({
          playerId: id,
          oldRating: before,
          newRating: after,
          delta,
          reason: "match_win",
          matchId: m.id,
        });
      }
      for (const id of m.losers.playerIds) {
        const before = ratings.get(id) ?? 0;
        const unlocked = before >= 1;
        const after = applyFloor(before + change.loserDelta, unlocked);
        const delta = roundToPreviewGrid(after - before);
        ratings.set(id, after);
        touched.add(id);
        changeRows.push({
          playerId: id,
          oldRating: before,
          newRating: after,
          delta,
          reason: "match_loss",
          matchId: m.id,
        });
      }
    }

    await prisma.ratingChange.deleteMany({
      where: { matchId: { not: null } },
    });

    const finalRows = [...ratings.entries()].map(([id, rating]) => ({
      id,
      rating,
    }));
    for (let i = 0; i < finalRows.length; i += CHUNK) {
      const chunk = finalRows.slice(i, i + CHUNK);
      await prisma.$transaction(
        chunk.map((row) =>
          prisma.player.updateMany({
            where: { id: row.id },
            data: { rating: row.rating },
          }),
        ),
      );
    }

    await createManyChunked(changeRows, (chunk) =>
      prisma.ratingChange.createMany({ data: chunk }),
    );

    await writeAuditLog({
      actorType: options.createdById ? "player" : "system",
      actorId: options.createdById ?? undefined,
      action: "rating.bulk_recalc",
      entityType: "rating_snapshot",
      entityId: snapshotId,
      summary: `Прогон от ratingBase (${options.formula}): ${matches.length} встреч`,
      payload: {
        formula: options.formula,
        snapshotId,
        matchCount: matches.length,
        skippedMatches,
        playersTouched: touched.size,
        changeRows: changeRows.length,
        seed: "ratingBase",
      },
    });

    return {
      snapshotId,
      formula: options.formula,
      matchCount: matches.length,
      skippedMatches,
      playersTouched: touched.size,
      changeRows: changeRows.length,
    };
  } finally {
    recalcLock = false;
  }
}

/** Восстановить Player.rating из снимка; очистить match RatingChange. */
export async function restoreRatingSnapshot(options: {
  snapshotId: string;
  createdById: string | null;
}): Promise<{ playerCount: number }> {
  if (recalcLock) {
    throw new Error("Идёт прогон — восстановление недоступно");
  }

  const snapshot = await prisma.playerRatingSnapshot.findUnique({
    where: { id: options.snapshotId },
    select: { id: true, playerCount: true },
  });
  if (!snapshot) {
    throw new Error("Снимок не найден");
  }

  const rows = await prisma.playerRatingSnapshotRow.findMany({
    where: { snapshotId: options.snapshotId },
    select: { playerId: true, rating: true },
  });

  await prisma.ratingChange.deleteMany({
    where: { matchId: { not: null } },
  });

  // Сначала обнуляем всех (игроки, появившиеся после снимка, не останутся с новым рейтингом)
  await prisma.player.updateMany({ data: { rating: 0 } });

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await prisma.$transaction(
      chunk.map((r) =>
        prisma.player.updateMany({
          where: { id: r.playerId },
          data: { rating: r.rating },
        }),
      ),
    );
  }

  await writeAuditLog({
    actorType: options.createdById ? "player" : "system",
    actorId: options.createdById ?? undefined,
    action: "rating.snapshot_restore",
    entityType: "rating_snapshot",
    entityId: options.snapshotId,
    summary: `Восстановление общего рейтинга из снимка (${rows.length} игроков)`,
    payload: { snapshotId: options.snapshotId, playerCount: rows.length },
  });

  return { playerCount: rows.length };
}
