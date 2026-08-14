import { prisma } from "@/lib/prisma";
import {
  buildClubRatingTimelines,
  ratingAtTime,
} from "@/lib/rating-history";
import {
  simulateRatingPreview,
  type RatingPreviewBundle,
  type RatingPreviewMatchInput,
  type RatingPreviewPlayerSeed,
  type RatingPreviewSidePlayer,
} from "@/lib/rating-preview";
import type { TournamentRatingSource } from "@/lib/tournament-rating-display";
import { effectiveTournamentPlayerRating } from "@/lib/tournament-rating-display";

type PlayerSelect = {
  id: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  rating: number;
};

type TeamSelect = {
  id: string;
  player1Id: string;
  player2Id: string | null;
  player1: PlayerSelect;
  player2: PlayerSelect | null;
};

function teamPlayers(team: TeamSelect): PlayerSelect[] {
  const list = [team.player1];
  if (team.player2Id && team.player2) list.push(team.player2);
  return list;
}

export async function buildRatingPreview(options: {
  ratingSource: TournamentRatingSource;
  clubId?: string | null;
  minTournaments?: number;
  minH2hMatches?: number;
}): Promise<RatingPreviewBundle> {
  const ratingSource = options.ratingSource;
  const clubId = options.clubId?.trim() || null;

  if (ratingSource === "CLUB" && !clubId) {
    throw new Error("Для клубного рейтинга укажите clubId");
  }

  const matchWhere = {
    status: "FINISHED" as const,
    winnerTeamId: { not: null },
    team1Id: { not: null },
    team2Id: { not: null },
    ...(clubId ? { tournament: { clubId } } : {}),
  };

  const playerSelect = {
    id: true,
    lastName: true,
    firstName: true,
    middleName: true,
    rating: true,
  } as const;

  const matches = await prisma.tournamentMatch.findMany({
    where: matchWhere,
    select: {
      id: true,
      tournamentId: true,
      finishedAt: true,
      createdAt: true,
      winnerTeamId: true,
      team1Id: true,
      team2Id: true,
      tournament: {
        select: {
          id: true,
          startsAt: true,
          createdAt: true,
        },
      },
      team1: {
        select: {
          id: true,
          player1Id: true,
          player2Id: true,
          player1: { select: playerSelect },
          player2: { select: playerSelect },
        },
      },
      team2: {
        select: {
          id: true,
          player1Id: true,
          player2Id: true,
          player1: { select: playerSelect },
          player2: { select: playerSelect },
        },
      },
    },
    orderBy: [{ finishedAt: "asc" }, { createdAt: "asc" }],
  });

  const playerMeta = new Map<
    string,
    {
      id: string;
      lastName: string;
      firstName: string;
      middleName: string | null;
      systemRating: number;
      tournamentIds: Set<string>;
    }
  >();

  type Draft = {
    id: string;
    tournamentId: string;
    finishedAt: Date | null;
    createdAt: Date;
    isPair: boolean;
    winnerIds: string[];
    loserIds: string[];
    ratingAsOf: Date;
  };

  const drafts: Draft[] = [];

  for (const m of matches) {
    const t1 = m.team1 as TeamSelect | null;
    const t2 = m.team2 as TeamSelect | null;
    if (!t1 || !t2 || !m.winnerTeamId) continue;

    const winnerIsTeam1 = m.winnerTeamId === m.team1Id;
    const winnerTeam = winnerIsTeam1 ? t1 : t2;
    const loserTeam = winnerIsTeam1 ? t2 : t1;
    const winners = teamPlayers(winnerTeam);
    const losers = teamPlayers(loserTeam);
    if (winners.length === 0 || losers.length === 0) continue;

    const winnerIds = winners.map((p) => p.id);
    const loserIds = losers.map((p) => p.id);
    // Защита от битых данных: пересечение составов
    if (winnerIds.some((id) => loserIds.includes(id))) continue;

    const isPair = Boolean(t1.player2Id || t2.player2Id);
    // Односторонний «полупарный» матч не берём
    if (Boolean(t1.player2Id) !== Boolean(t2.player2Id)) continue;

    for (const p of [...winners, ...losers]) {
      let meta = playerMeta.get(p.id);
      if (!meta) {
        meta = {
          id: p.id,
          lastName: p.lastName,
          firstName: p.firstName,
          middleName: p.middleName,
          systemRating: p.rating,
          tournamentIds: new Set(),
        };
        playerMeta.set(p.id, meta);
      }
      meta.tournamentIds.add(m.tournamentId);
    }

    drafts.push({
      id: m.id,
      tournamentId: m.tournamentId,
      finishedAt: m.finishedAt,
      createdAt: m.createdAt,
      isPair,
      winnerIds,
      loserIds,
      ratingAsOf: m.tournament.startsAt ?? m.tournament.createdAt,
    });
  }

  let clubRatings = new Map<string, number>();
  let timelines = new Map<string, { at: number; rating: number }[]>();
  let usedHistoricalRatings = false;

  if (ratingSource === "CLUB" && clubId) {
    const rows = await prisma.clubPlayerRating.findMany({
      where: { clubId },
      select: {
        id: true,
        playerId: true,
        rating: true,
        updatedAt: true,
      },
    });
    clubRatings = new Map(
      rows
        .filter((r) => playerMeta.has(r.playerId))
        .map((r) => [r.playerId, r.rating]),
    );

    const audits = await prisma.auditLog.findMany({
      where: {
        clubId,
        action: {
          in: [
            "club.player_rating.set",
            "club.player_rating.update",
            "club.player_rating.remove",
          ],
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        action: true,
        createdAt: true,
        entityId: true,
        payload: true,
      },
    });

    timelines = buildClubRatingTimelines({
      audits,
      currentRows: rows,
      playerIds: new Set(playerMeta.keys()),
    });
    usedHistoricalRatings = audits.length > 0 || rows.length > 0;
  }

  const seeds: RatingPreviewPlayerSeed[] = [...playerMeta.values()].map((p) => ({
    id: p.id,
    lastName: p.lastName,
    firstName: p.firstName,
    middleName: p.middleName,
    currentRating: effectiveTournamentPlayerRating(
      p.systemRating,
      clubRatings.get(p.id),
      ratingSource,
    ),
    tournamentIds: p.tournamentIds,
  }));

  const currentById = new Map(seeds.map((s) => [s.id, s.currentRating]));

  function sideOf(ids: string[], ratingAsOf: Date): RatingPreviewSidePlayer[] {
    return ids.map((playerId) => {
      const fallback = currentById.get(playerId) ?? 0;
      return {
        playerId,
        ratingAtMatch: usedHistoricalRatings
          ? ratingAtTime(timelines.get(playerId), ratingAsOf, fallback)
          : fallback,
      };
    });
  }

  const matchInputs: RatingPreviewMatchInput[] = drafts.map((d) => ({
    id: d.id,
    tournamentId: d.tournamentId,
    finishedAt: d.finishedAt,
    createdAt: d.createdAt,
    isPair: d.isPair,
    winners: sideOf(d.winnerIds, d.ratingAsOf),
    losers: sideOf(d.loserIds, d.ratingAsOf),
  }));

  const common = {
    players: seeds,
    matches: matchInputs,
    minTournaments: options.minTournaments,
    minH2hMatches: options.minH2hMatches,
    ratingSource,
    clubId,
    usedHistoricalRatings,
  } as const;

  return {
    soft: simulateRatingPreview({ ...common, formula: "soft" }),
    upsetOnly: simulateRatingPreview({ ...common, formula: "upset_only" }),
    upsetMild: simulateRatingPreview({ ...common, formula: "upset_mild" }),
    mildAll: simulateRatingPreview({ ...common, formula: "mild_all" }),
    tinyEqual: simulateRatingPreview({ ...common, formula: "tiny_equal" }),
    elo: simulateRatingPreview({ ...common, formula: "elo" }),
    microEqual: simulateRatingPreview({ ...common, formula: "micro_equal" }),
  };
}
