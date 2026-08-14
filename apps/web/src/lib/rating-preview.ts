/**
 * Превью пересчёта рейтинга по истории матчей (без записи в БД).
 *
 * Соло и пары. Для пар сила стороны = средний рейтинг двоих на старт турнира;
 * дельта применяется каждому игроку стороны.
 */
import {
  MAX_PLAYER_RATING,
  calculateRatingChangeMildAll,
  calculateRatingChangeSoft,
  calculateRatingChangeTinyEqual,
  calculateRatingChangeUpsetMild,
  calculateRatingChangeUpsetOnly,
  roundToPreviewGrid,
  type RatingChangeResult,
} from "@/lib/rating";
import type { TournamentRatingSource } from "@/lib/tournament-rating-display";

/**
 * soft — ±0,25/±0,1;
 * upset_only — равные/апсет ±0,25, фаворит → 0;
 * upset_mild — равные ±0,1, апсет ±0,15, фаворит → 0;
 * mild_all — равные ±0,1, апсет ±0,15, фаворит ±0,1;
 * tiny_equal — равные ±0,05, апсет ±0,15, фаворит ±0,1.
 */
export type RatingPreviewFormula =
  | "soft"
  | "upset_only"
  | "upset_mild"
  | "mild_all"
  | "tiny_equal";

export const DEFAULT_MIN_TOURNAMENTS = 3;
export const DEFAULT_MIN_H2H_MATCHES = 5;
/** Доля побед одной стороны для «перекоса» (при достаточном числе встреч). */
export const DEFAULT_H2H_SKEW_WINRATE = 0.7;
/** Старт симуляции, если на дату матча рейтинга ещё не было. */
export const PREVIEW_START_RATING = 0;
/**
 * Как только игрок дорос до 1 — ниже уже не падает.
 * Пока был 0 и не выигрывал — остаётся 0.
 */
export const PREVIEW_UNLOCKED_FLOOR = 1;

export type RatingPreviewSidePlayer = {
  playerId: string;
  /** Личный рейтинг на старт турнира. */
  ratingAtMatch: number;
};

export type RatingPreviewMatchInput = {
  id: string;
  tournamentId: string;
  finishedAt: Date | null;
  createdAt: Date;
  isPair: boolean;
  winners: RatingPreviewSidePlayer[];
  losers: RatingPreviewSidePlayer[];
};

export type RatingPreviewPlayerSeed = {
  id: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  currentRating: number;
  tournamentIds: Set<string>;
};

export type RatingPreviewMatchStep = {
  matchId: string;
  tournamentId: string;
  at: string;
  opponentId: string;
  opponentName: string;
  won: boolean;
  isPair: boolean;
  /** Личный рейтинг игрока в клубе на дату встречи. */
  ratingBefore: number;
  /** Рейтинг в превью после применения дельты (накопительно). */
  ratingAfter: number;
  delta: number;
  /** Для соло — рейтинг соперника; для пары — средний рейтинг пары напротив. */
  opponentRatingBefore: number;
};

export type RatingPreviewPlayerRow = {
  playerId: string;
  name: string;
  currentRating: number;
  proposedRating: number;
  delta: number;
  tournaments: number;
  matchesSimulated: number;
  wins: number;
  losses: number;
  /** Доля побед в учтённых матчах превью, 0..1 */
  winRate: number | null;
  steps: RatingPreviewMatchStep[];
};

export type RatingPreviewH2hRow = {
  playerAId: string;
  playerAName: string;
  playerBId: string;
  playerBName: string;
  played: number;
  winsA: number;
  winsB: number;
  winRateA: number;
  currentRatingA: number;
  currentRatingB: number;
  proposedRatingA: number;
  proposedRatingB: number;
};

export type RatingPreviewResult = {
  formula: RatingPreviewFormula;
  ratingSource: TournamentRatingSource;
  clubId: string | null;
  minTournaments: number;
  minH2hMatches: number;
  matchesLoaded: number;
  matchesSimulated: number;
  matchesPairSimulated: number;
  matchesSkippedIneligible: number;
  matchesSkippedUnrated: number;
  /** true — рейтинги на бой восстановлены из аудита клуба */
  usedHistoricalRatings: boolean;
  players: RatingPreviewPlayerRow[];
  h2hSkew: RatingPreviewH2hRow[];
  /** Краткий итог запуска (без формулы — она в UI) */
  note: string;
};

export type RatingPreviewBundle = {
  soft: RatingPreviewResult;
  upsetOnly: RatingPreviewResult;
  upsetMild: RatingPreviewResult;
  mildAll: RatingPreviewResult;
  tinyEqual: RatingPreviewResult;
};

export function ratingChangeForFormula(
  formula: RatingPreviewFormula,
  winnerRating: number,
  loserRating: number,
): RatingChangeResult {
  if (formula === "upset_only") {
    return calculateRatingChangeUpsetOnly(winnerRating, loserRating);
  }
  if (formula === "upset_mild") {
    return calculateRatingChangeUpsetMild(winnerRating, loserRating);
  }
  if (formula === "mild_all") {
    return calculateRatingChangeMildAll(winnerRating, loserRating);
  }
  if (formula === "tiny_equal") {
    return calculateRatingChangeTinyEqual(winnerRating, loserRating);
  }
  return calculateRatingChangeSoft(winnerRating, loserRating);
}

function playerName(p: {
  lastName: string;
  firstName: string;
  middleName?: string | null;
}): string {
  return [p.lastName, p.firstName, p.middleName].filter(Boolean).join(" ");
}

function h2hKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function teamAvg(side: RatingPreviewSidePlayer[]): number {
  if (side.length === 0) return 0;
  return side.reduce((s, p) => s + p.ratingAtMatch, 0) / side.length;
}

function sideLabel(
  side: RatingPreviewSidePlayer[],
  names: Map<string, string>,
): string {
  return side
    .map((p) => {
      const full = names.get(p.playerId) ?? p.playerId;
      return full.trim().split(/\s+/)[0] || full;
    })
    .join(" / ");
}

/** Чистая симуляция — для тестов и API. */
export function simulateRatingPreview(input: {
  players: RatingPreviewPlayerSeed[];
  matches: RatingPreviewMatchInput[];
  minTournaments?: number;
  minH2hMatches?: number;
  h2hSkewWinrate?: number;
  ratingSource: TournamentRatingSource;
  clubId?: string | null;
  /** true = рейтинги на матч восстановлены из истории клуба */
  usedHistoricalRatings?: boolean;
  formula?: RatingPreviewFormula;
}): RatingPreviewResult {
  const formula = input.formula ?? "soft";
  const minTournaments = input.minTournaments ?? DEFAULT_MIN_TOURNAMENTS;
  const minH2hMatches = input.minH2hMatches ?? DEFAULT_MIN_H2H_MATCHES;
  const h2hSkewWinrate = input.h2hSkewWinrate ?? DEFAULT_H2H_SKEW_WINRATE;

  const eligible = new Map(
    input.players
      .filter((p) => p.tournamentIds.size >= minTournaments)
      .map((p) => [p.id, p]),
  );

  const allNames = new Map(
    input.players.map((p) => [p.id, playerName(p)]),
  );

  /** Накопительный превью-рейтинг (формула), инициализируется с рейтинга на первый учтённый матч. */
  const ratings = new Map<string, number>();
  /** Пол поднимаем только когда на встрече/в превью уже был ≥1 — не из «сегодняшней» базы. */
  const floors = new Map<string, number>();
  for (const id of eligible.keys()) {
    floors.set(id, 0);
  }

  const stepsByPlayer = new Map<string, RatingPreviewMatchStep[]>();
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  for (const id of eligible.keys()) {
    stepsByPlayer.set(id, []);
    wins.set(id, 0);
    losses.set(id, 0);
  }

  function ensureSim(playerId: string, histBefore: number): number {
    const existing = ratings.get(playerId);
    if (existing !== undefined) return existing;
    if (histBefore >= PREVIEW_UNLOCKED_FLOOR) {
      floors.set(playerId, PREVIEW_UNLOCKED_FLOOR);
    }
    const floor = floors.get(playerId) ?? 0;
    const start = Math.max(floor, histBefore);
    ratings.set(playerId, start);
    return start;
  }

  function applyFloor(playerId: string, raw: number): number {
    const floor = floors.get(playerId) ?? 0;
    let after = roundToPreviewGrid(
      Math.min(MAX_PLAYER_RATING, Math.max(floor, raw)),
    );
    after = Math.max(0, after);
    if (after >= PREVIEW_UNLOCKED_FLOOR) {
      floors.set(playerId, PREVIEW_UNLOCKED_FLOOR);
      after = Math.max(PREVIEW_UNLOCKED_FLOOR, after);
    }
    return after;
  }

  const h2h = new Map<string, { a: string; b: string; winsA: number; winsB: number }>();

  const ordered = [...input.matches].sort((m1, m2) => {
    const t1 = (m1.finishedAt ?? m1.createdAt).getTime();
    const t2 = (m2.finishedAt ?? m2.createdAt).getTime();
    if (t1 !== t2) return t1 - t2;
    return m1.id.localeCompare(m2.id);
  });

  let matchesSimulated = 0;
  let matchesPairSimulated = 0;
  let matchesSkippedIneligible = 0;
  let matchesSkippedUnrated = 0;

  for (const m of ordered) {
    if (m.winners.length === 0 || m.losers.length === 0) {
      matchesSkippedIneligible++;
      continue;
    }

    const eligibleWinners = m.winners.filter((p) => eligible.has(p.playerId));
    const eligibleLosers = m.losers.filter((p) => eligible.has(p.playerId));
    if (eligibleWinners.length === 0 && eligibleLosers.length === 0) {
      matchesSkippedIneligible++;
      continue;
    }
    // Нужен хотя бы один учтённый с каждой стороны, иначе сила боя кривая для пула
    if (eligibleWinners.length === 0 || eligibleLosers.length === 0) {
      matchesSkippedIneligible++;
      continue;
    }

    const wTeam = teamAvg(m.winners);
    const lTeam = teamAvg(m.losers);
    if (input.usedHistoricalRatings && wTeam === 0 && lTeam === 0) {
      matchesSkippedUnrated++;
      continue;
    }

    const change = ratingChangeForFormula(formula, wTeam, lTeam);
    const at = (m.finishedAt ?? m.createdAt).toISOString();
    const oppWLabel = sideLabel(m.losers, allNames);
    const oppLLabel = sideLabel(m.winners, allNames);

    for (const wp of eligibleWinners) {
      const before = ensureSim(wp.playerId, wp.ratingAtMatch);
      const after = applyFloor(wp.playerId, before + change.winnerDelta);
      const delta = roundToPreviewGrid(after - before);
      ratings.set(wp.playerId, after);
      wins.set(wp.playerId, (wins.get(wp.playerId) ?? 0) + 1);
      stepsByPlayer.get(wp.playerId)!.push({
        matchId: m.id,
        tournamentId: m.tournamentId,
        at,
        opponentId: m.losers[0]!.playerId,
        opponentName: oppWLabel,
        won: true,
        isPair: m.isPair,
        ratingBefore: wp.ratingAtMatch,
        ratingAfter: after,
        delta,
        opponentRatingBefore: lTeam,
      });
    }

    for (const lp of eligibleLosers) {
      const before = ensureSim(lp.playerId, lp.ratingAtMatch);
      const after = applyFloor(lp.playerId, before + change.loserDelta);
      const delta = roundToPreviewGrid(after - before);
      ratings.set(lp.playerId, after);
      losses.set(lp.playerId, (losses.get(lp.playerId) ?? 0) + 1);
      stepsByPlayer.get(lp.playerId)!.push({
        matchId: m.id,
        tournamentId: m.tournamentId,
        at,
        opponentId: m.winners[0]!.playerId,
        opponentName: oppLLabel,
        won: false,
        isPair: m.isPair,
        ratingBefore: lp.ratingAtMatch,
        ratingAfter: after,
        delta,
        opponentRatingBefore: wTeam,
      });
    }

    matchesSimulated++;
    if (m.isPair) matchesPairSimulated++;

    // H2H только для соло 1×1
    if (!m.isPair && m.winners.length === 1 && m.losers.length === 1) {
      const w = m.winners[0]!.playerId;
      const l = m.losers[0]!.playerId;
      if (eligible.has(w) && eligible.has(l)) {
        const key = h2hKey(w, l);
        let pair = h2h.get(key);
        if (!pair) {
          const [a, b] = w < l ? [w, l] : [l, w];
          pair = { a, b, winsA: 0, winsB: 0 };
          h2h.set(key, pair);
        }
        if (w === pair.a) pair.winsA++;
        else pair.winsB++;
      }
    }
  }

  const players: RatingPreviewPlayerRow[] = [...eligible.values()]
    .map((p) => {
      const proposed = ratings.get(p.id) ?? p.currentRating;
      const steps = stepsByPlayer.get(p.id) ?? [];
      return {
        playerId: p.id,
        name: playerName(p),
        currentRating: p.currentRating,
        proposedRating: proposed,
        delta: proposed - p.currentRating,
        tournaments: p.tournamentIds.size,
        matchesSimulated: steps.length,
        wins: wins.get(p.id) ?? 0,
        losses: losses.get(p.id) ?? 0,
        winRate:
          steps.length > 0
            ? (wins.get(p.id) ?? 0) / steps.length
            : null,
        steps,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.name.localeCompare(b.name, "ru"));

  const h2hSkew: RatingPreviewH2hRow[] = [];
  for (const pair of h2h.values()) {
    const played = pair.winsA + pair.winsB;
    if (played < minH2hMatches) continue;
    const winRateA = pair.winsA / played;
    const winRateB = pair.winsB / played;
    if (winRateA < h2hSkewWinrate && winRateB < h2hSkewWinrate) continue;

    const a = eligible.get(pair.a)!;
    const b = eligible.get(pair.b)!;
    const rowA = players.find((p) => p.playerId === pair.a)!;
    const rowB = players.find((p) => p.playerId === pair.b)!;
    h2hSkew.push({
      playerAId: pair.a,
      playerAName: playerName(a),
      playerBId: pair.b,
      playerBName: playerName(b),
      played,
      winsA: pair.winsA,
      winsB: pair.winsB,
      winRateA,
      currentRatingA: a.currentRating,
      currentRatingB: b.currentRating,
      proposedRatingA: rowA.proposedRating,
      proposedRatingB: rowB.proposedRating,
    });
  }
  h2hSkew.sort((x, y) => {
    const skewX = Math.max(x.winRateA, 1 - x.winRateA);
    const skewY = Math.max(y.winRateA, 1 - y.winRateA);
    return skewY - skewX || y.played - x.played;
  });

  const usedHistoricalRatings = Boolean(input.usedHistoricalRatings);

  return {
    formula,
    ratingSource: input.ratingSource,
    clubId: input.clubId ?? null,
    minTournaments,
    minH2hMatches,
    matchesLoaded: input.matches.length,
    matchesSimulated,
    matchesPairSimulated,
    matchesSkippedIneligible,
    matchesSkippedUnrated,
    usedHistoricalRatings,
    players,
    h2hSkew,
    note: usedHistoricalRatings
      ? "Рейтинги на бой взяты из истории клуба на старт каждого турнира."
      : "Истории клубного рейтинга нет — на каждый матч подставлен текущий рейтинг из базы.",
  };
}

/** Превью: до сотых (0,25 / 0,1), без ложного toFixed(1) → 0,3. */
export function formatPreviewRating(rating: number): string {
  const n = roundToPreviewGrid(rating);
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toFixed(2)));
}

export function formatPreviewDelta(delta: number): string {
  if (delta === 0) return "0";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatPreviewRating(delta)}`;
}
