/**
 * Применение / откат общего рейтинга (Player.rating) после результата матча.
 */
import { writeAuditLog } from "@/lib/audit";
import { getRatingAutoConfig } from "@/lib/rating-auto-config-server";
import { prisma } from "@/lib/prisma";
import {
  MAX_PLAYER_RATING,
  MIN_PLAYER_RATING,
  roundToPreviewGrid,
} from "@/lib/rating";
import { ratingChangeForFormula } from "@/lib/rating-preview";

export type MatchRatingApplyRow = {
  playerId: string;
  name: string;
  oldRating: number;
  newRating: number;
  delta: number;
  won: boolean;
};

function applyFloor(raw: number, hadUnlockedFloor: boolean): number {
  let after = roundToPreviewGrid(
    Math.min(MAX_PLAYER_RATING, Math.max(MIN_PLAYER_RATING, raw)),
  );
  if (hadUnlockedFloor || after >= 1) {
    after = Math.max(1, after);
  }
  return after;
}

function teamPlayers(team: {
  player1Id: string;
  player2Id: string | null;
  player1: { id: string; lastName: string; firstName: string; rating: number };
  player2: { id: string; lastName: string; firstName: string; rating: number } | null;
}): { id: string; name: string; rating: number }[] {
  const list = [
    {
      id: team.player1.id,
      name: [team.player1.lastName, team.player1.firstName].filter(Boolean).join(" "),
      rating: team.player1.rating,
    },
  ];
  if (team.player2Id && team.player2) {
    list.push({
      id: team.player2.id,
      name: [team.player2.lastName, team.player2.firstName].filter(Boolean).join(" "),
      rating: team.player2.rating,
    });
  }
  return list;
}

function avg(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

/** Применить рейтинг после первой фиксации победителя (идемпотентно по matchId). */
export async function applyAutoRatingForMatch(
  matchId: string,
): Promise<MatchRatingApplyRow[] | null> {
  const config = await getRatingAutoConfig();
  if (!config.enabled) return null;

  const existing = await prisma.ratingChange.count({ where: { matchId } });
  if (existing > 0) return null;

  const match = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    include: {
      team1: {
        include: {
          player1: { select: { id: true, lastName: true, firstName: true, rating: true } },
          player2: { select: { id: true, lastName: true, firstName: true, rating: true } },
        },
      },
      team2: {
        include: {
          player1: { select: { id: true, lastName: true, firstName: true, rating: true } },
          player2: { select: { id: true, lastName: true, firstName: true, rating: true } },
        },
      },
    },
  });
  if (!match?.winnerTeamId || !match.team1 || !match.team2) return null;
  if (!match.team1Id || !match.team2Id) return null;

  const winnerIsTeam1 = match.winnerTeamId === match.team1Id;
  const winners = teamPlayers(winnerIsTeam1 ? match.team1 : match.team2);
  const losers = teamPlayers(winnerIsTeam1 ? match.team2 : match.team1);
  if (winners.length === 0 || losers.length === 0) return null;
  if (winners.length !== losers.length) return null;

  const wTeam = avg(winners.map((p) => p.rating));
  const lTeam = avg(losers.map((p) => p.rating));
  const change = ratingChangeForFormula(config.formula, wTeam, lTeam);

  const rows: MatchRatingApplyRow[] = [];

  await prisma.$transaction(async (tx) => {
    for (const p of winners) {
      const unlocked = p.rating >= 1;
      const newRating = applyFloor(p.rating + change.winnerDelta, unlocked);
      const delta = roundToPreviewGrid(newRating - p.rating);
      await tx.player.update({
        where: { id: p.id },
        data: { rating: newRating },
      });
      await tx.ratingChange.create({
        data: {
          playerId: p.id,
          oldRating: p.rating,
          newRating,
          delta,
          reason: "match_win",
          matchId,
        },
      });
      rows.push({
        playerId: p.id,
        name: p.name,
        oldRating: p.rating,
        newRating,
        delta,
        won: true,
      });
    }
    for (const p of losers) {
      const unlocked = p.rating >= 1;
      const newRating = applyFloor(p.rating + change.loserDelta, unlocked);
      const delta = roundToPreviewGrid(newRating - p.rating);
      await tx.player.update({
        where: { id: p.id },
        data: { rating: newRating },
      });
      await tx.ratingChange.create({
        data: {
          playerId: p.id,
          oldRating: p.rating,
          newRating,
          delta,
          reason: "match_loss",
          matchId,
        },
      });
      rows.push({
        playerId: p.id,
        name: p.name,
        oldRating: p.rating,
        newRating,
        delta,
        won: false,
      });
    }
  });

  await writeAuditLog({
    actorType: "system",
    action: "rating.auto_match",
    entityType: "match",
    entityId: matchId,
    summary: `Авторейтинг (${config.formula})`,
    payload: {
      formula: config.formula,
      changes: rows.map((r) => ({
        playerId: r.playerId,
        delta: r.delta,
        newRating: r.newRating,
      })),
    },
  });

  return rows;
}

/** Откат рейтинга при отмене результата встречи. */
export async function reverseAutoRatingForMatch(matchId: string): Promise<void> {
  const changes = await prisma.ratingChange.findMany({
    where: { matchId },
    orderBy: { createdAt: "desc" },
  });
  if (changes.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const c of changes) {
      const player = await tx.player.findUnique({
        where: { id: c.playerId },
        select: { rating: true },
      });
      if (!player) continue;
      const current = roundToPreviewGrid(player.rating);
      const expected = roundToPreviewGrid(c.newRating);
      if (current === expected) {
        await tx.player.update({
          where: { id: c.playerId },
          data: { rating: c.oldRating },
        });
      }
      await tx.ratingChange.delete({ where: { id: c.id } });
    }
  });

  await writeAuditLog({
    actorType: "system",
    action: "rating.auto_match_reverse",
    entityType: "match",
    entityId: matchId,
    summary: "Откат авторейтинга после отмены встречи",
    payload: { count: changes.length },
  });
}

/**
 * Откат авторейтинга по всем встречам турнира (перед удалением / сбросом сетки).
 * Порядок: от новых к старым, чтобы цепочка схлопывалась корректно.
 */
export async function reverseAutoRatingForTournament(
  tournamentId: string,
): Promise<number> {
  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    select: { id: true, finishedAt: true, createdAt: true },
    orderBy: [{ finishedAt: "desc" }, { createdAt: "desc" }],
  });
  if (matches.length === 0) return 0;

  let reversed = 0;
  for (const m of matches) {
    const before = await prisma.ratingChange.count({ where: { matchId: m.id } });
    if (before === 0) continue;
    await reverseAutoRatingForMatch(m.id);
    reversed += 1;
  }

  if (reversed > 0) {
    await writeAuditLog({
      actorType: "system",
      action: "rating.auto_tournament_reverse",
      entityType: "tournament",
      entityId: tournamentId,
      summary: `Откат авторейтинга по ${reversed} встречам турнира`,
      payload: { matchCount: reversed },
    });
  }

  return reversed;
}
