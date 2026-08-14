/**
 * Цепочка рейтинга игрока по формуле (как прогон / превью) + журнал RatingChange.
 */
import { getRatingAutoConfig } from "@/lib/rating-auto-config-server";
import {
  RATING_PREVIEW_FORMULA_OPTIONS,
  type RatingAutoConfig,
} from "@/lib/rating-auto-config";
import { prisma } from "@/lib/prisma";
import {
  MAX_PLAYER_RATING,
  MIN_PLAYER_RATING,
  roundToPreviewGrid,
} from "@/lib/rating";
import {
  ratingChangeForFormula,
  type RatingPreviewFormula,
  type RatingPreviewMatchStep,
} from "@/lib/rating-preview";

export type PlayerRatingTraceStep = RatingPreviewMatchStep;

export type PlayerRatingJournalStep = {
  matchId: string | null;
  at: string;
  won: boolean;
  oldRating: number;
  newRating: number;
  delta: number;
  opponentName: string | null;
  isPair: boolean | null;
};

export type PlayerRatingTrace = {
  playerId: string;
  playerName: string;
  formula: RatingPreviewFormula;
  formulaLabel: string;
  seedMode: "ratingBase" | "current";
  seedLabel: string | null;
  seedRating: number;
  simulatedRating: number;
  currentRating: number;
  ratingBase: number;
  steps: PlayerRatingTraceStep[];
  journal: PlayerRatingJournalStep[];
  note: string;
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

function avg(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

function formulaLabel(formula: RatingPreviewFormula): string {
  return (
    RATING_PREVIEW_FORMULA_OPTIONS.find((o) => o.value === formula)?.short ??
    formula
  );
}

function playerDisplayName(p: {
  lastName: string;
  firstName: string;
  middleName: string | null;
}): string {
  return [p.lastName, p.firstName, p.middleName].filter(Boolean).join(" ");
}

async function loadFinishedMatches() {
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
          player1: {
            select: { id: true, lastName: true, firstName: true, middleName: true },
          },
          player2: {
            select: { id: true, lastName: true, firstName: true, middleName: true },
          },
        },
      },
      team2: {
        select: {
          player1Id: true,
          player2Id: true,
          player1: {
            select: { id: true, lastName: true, firstName: true, middleName: true },
          },
          player2: {
            select: { id: true, lastName: true, firstName: true, middleName: true },
          },
        },
      },
    },
    orderBy: [{ finishedAt: "asc" }, { createdAt: "asc" }],
  });

  type Side = {
    playerIds: string[];
    names: Map<string, string>;
    isPair: boolean;
  };

  const out: {
    id: string;
    finishedAt: Date | null;
    createdAt: Date;
    winners: Side;
    losers: Side;
  }[] = [];

  for (const m of matches) {
    if (!m.team1 || !m.team2 || !m.winnerTeamId) continue;
    const side = (t: NonNullable<typeof m.team1>): Side => {
      const names = new Map<string, string>();
      const ids = [t.player1Id];
      names.set(t.player1Id, playerDisplayName(t.player1));
      if (t.player2Id && t.player2) {
        ids.push(t.player2Id);
        names.set(t.player2Id, playerDisplayName(t.player2));
      }
      return { playerIds: ids, names, isPair: Boolean(t.player2Id) };
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

async function loadSeedRatings(): Promise<{
  seedMode: "ratingBase" | "current";
  seedLabel: string | null;
  ratings: Map<string, number>;
}> {
  const players = await prisma.player.findMany({
    select: { id: true, rating: true, ratingBase: true },
  });
  const fromBase = new Map(players.map((p) => [p.id, p.ratingBase]));
  return {
    seedMode: "ratingBase",
    seedLabel: "ratingBase (база игрока)",
    ratings: fromBase,
  };
}

async function loadJournal(playerId: string): Promise<PlayerRatingJournalStep[]> {
  const changes = await prisma.ratingChange.findMany({
    where: { playerId, matchId: { not: null } },
    orderBy: { createdAt: "asc" },
    select: {
      matchId: true,
      oldRating: true,
      newRating: true,
      delta: true,
      reason: true,
      createdAt: true,
    },
  });
  if (changes.length === 0) return [];

  const matchIds = [
    ...new Set(changes.map((c) => c.matchId).filter(Boolean) as string[]),
  ];
  const matches = await prisma.tournamentMatch.findMany({
    where: { id: { in: matchIds } },
    select: {
      id: true,
      finishedAt: true,
      createdAt: true,
      winnerTeamId: true,
      team1Id: true,
      team2Id: true,
      team1: {
        select: {
          id: true,
          player1Id: true,
          player2Id: true,
          player1: {
            select: { lastName: true, firstName: true, middleName: true },
          },
          player2: {
            select: { lastName: true, firstName: true, middleName: true },
          },
        },
      },
      team2: {
        select: {
          id: true,
          player1Id: true,
          player2Id: true,
          player1: {
            select: { lastName: true, firstName: true, middleName: true },
          },
          player2: {
            select: { lastName: true, firstName: true, middleName: true },
          },
        },
      },
    },
  });
  const byId = new Map(matches.map((m) => [m.id, m]));

  function sideLabel(
    team: {
      player1Id: string;
      player2Id: string | null;
      player1: {
        lastName: string;
        firstName: string;
        middleName: string | null;
      };
      player2: {
        lastName: string;
        firstName: string;
        middleName: string | null;
      } | null;
    } | null,
  ): { name: string; isPair: boolean } {
    if (!team) return { name: "?", isPair: false };
    const a = playerDisplayName(team.player1);
    if (team.player2Id && team.player2) {
      const b = playerDisplayName(team.player2);
      return { name: `${a} / ${b}`, isPair: true };
    }
    return { name: a, isPair: false };
  }

  return changes.map((c) => {
    const m = c.matchId ? byId.get(c.matchId) : null;
    let opponentName: string | null = null;
    let isPair: boolean | null = null;
    const won = c.reason === "match_win";
    if (m?.team1 && m.team2) {
      const winnerIs1 = m.winnerTeamId === m.team1Id;
      const opp = won
        ? sideLabel(winnerIs1 ? m.team2 : m.team1)
        : sideLabel(winnerIs1 ? m.team1 : m.team2);
      opponentName = opp.name;
      isPair = opp.isPair;
    }
    return {
      matchId: c.matchId,
      at: (m?.finishedAt ?? m?.createdAt ?? c.createdAt).toISOString(),
      won,
      oldRating: c.oldRating,
      newRating: c.newRating,
      delta: c.delta,
      opponentName,
      isPair,
    };
  });
}

export async function buildPlayerRatingTrace(
  playerId: string,
  formulaOverride?: RatingPreviewFormula,
): Promise<PlayerRatingTrace> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      lastName: true,
      firstName: true,
      middleName: true,
      rating: true,
      ratingBase: true,
    },
  });
  if (!player) {
    throw new Error("Игрок не найден");
  }

  const config: RatingAutoConfig = await getRatingAutoConfig();
  const formula = formulaOverride ?? config.formula;
  const { seedMode, seedLabel, ratings: seedRatings } = await loadSeedRatings();
  const ratings = new Map(seedRatings);
  const matches = await loadFinishedMatches();
  const names = new Map<string, string>();
  for (const m of matches) {
    for (const [id, name] of m.winners.names) names.set(id, name);
    for (const [id, name] of m.losers.names) names.set(id, name);
  }

  const steps: PlayerRatingTraceStep[] = [];
  const seedRating = seedRatings.get(playerId) ?? player.ratingBase;

  for (const m of matches) {
    const wRatings = m.winners.playerIds.map((id) => ratings.get(id) ?? 0);
    const lRatings = m.losers.playerIds.map((id) => ratings.get(id) ?? 0);
    if (wRatings.length === 0 || lRatings.length === 0) continue;
    if (wRatings.length !== lRatings.length) continue;

    const change = ratingChangeForFormula(
      formula,
      avg(wRatings),
      avg(lRatings),
    );
    const at = (m.finishedAt ?? m.createdAt).toISOString();
    const oppW = m.losers.playerIds
      .map((id) => names.get(id) ?? id)
      .join(" / ");
    const oppL = m.winners.playerIds
      .map((id) => names.get(id) ?? id)
      .join(" / ");

    for (const id of m.winners.playerIds) {
      const before = ratings.get(id) ?? 0;
      const after = applyFloor(before + change.winnerDelta, before >= 1);
      const delta = roundToPreviewGrid(after - before);
      ratings.set(id, after);
      if (id === playerId) {
        steps.push({
          matchId: m.id,
          tournamentId: "",
          at,
          opponentId: m.losers.playerIds[0]!,
          opponentIds: [...m.losers.playerIds],
          opponentName: oppW,
          won: true,
          isPair: m.winners.isPair,
          ratingBefore: before,
          ratingAfter: after,
          delta,
          opponentRatingBefore: avg(lRatings),
        });
      }
    }
    for (const id of m.losers.playerIds) {
      const before = ratings.get(id) ?? 0;
      const after = applyFloor(before + change.loserDelta, before >= 1);
      const delta = roundToPreviewGrid(after - before);
      ratings.set(id, after);
      if (id === playerId) {
        steps.push({
          matchId: m.id,
          tournamentId: "",
          at,
          opponentId: m.winners.playerIds[0]!,
          opponentIds: [...m.winners.playerIds],
          opponentName: oppL,
          won: false,
          isPair: m.losers.isPair,
          ratingBefore: before,
          ratingAfter: after,
          delta,
          opponentRatingBefore: avg(wRatings),
        });
      }
    }
  }

  const journal = await loadJournal(playerId);
  const simulatedRating = ratings.get(playerId) ?? seedRating;

  const note =
    "Старт симуляции и прогона — поле «База рейтинга» (ratingBase). Прогон/авто его не меняют. Снимки на /admin/handicap — только для отката текущего rating после эксперимента.";

  return {
    playerId,
    playerName: playerDisplayName(player),
    formula,
    formulaLabel: formulaLabel(formula),
    seedMode,
    seedLabel,
    seedRating,
    simulatedRating,
    currentRating: player.rating,
    ratingBase: player.ratingBase,
    steps,
    journal,
    note,
  };
}
