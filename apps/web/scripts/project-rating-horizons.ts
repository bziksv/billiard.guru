/**
 * Проекция рейтинга по tiny_upset_only на 20/30/40/50/60 турниров (Монте-Карло).
 *
 *   cd apps/web && npx tsx scripts/project-rating-horizons.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";
import { ratingChangeForFormula } from "../src/lib/rating-preview";
import {
  MAX_PLAYER_RATING,
  MIN_PLAYER_RATING,
  roundToPreviewGrid,
} from "../src/lib/rating";

const FORMULA = "tiny_upset_only" as const;
const HORIZONS = [20, 30, 40, 50, 60] as const;
const LAST_H = HORIZONS[HORIZONS.length - 1]!;
const MC_RUNS = 300;
const FIELD_SIZE = 18;
const MATCHES_PER_TOUR = 31;
const ELO_D = 1;

function avg(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function quantile(xs: number[], q: number) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return s[lo]!;
  return s[lo]! * (hi - i) + s[hi]! * (i - lo);
}
function applyFloor(raw: number, unlocked: boolean) {
  let a = roundToPreviewGrid(
    Math.min(MAX_PLAYER_RATING, Math.max(MIN_PLAYER_RATING, raw)),
  );
  if (unlocked || a >= 1) a = Math.max(1, a);
  return a;
}
function pWin(ra: number, rb: number) {
  return 1 / (1 + 10 ** ((rb - ra) / ELO_D));
}
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const players = await prisma.player.findMany({
    select: {
      id: true,
      lastName: true,
      firstName: true,
      rating: true,
      ratingBase: true,
    },
  });

  const focusIds = players
    .filter(
      (p) =>
        p.lastName.includes("Файн") ||
        p.lastName.includes("Галуст") ||
        p.lastName.includes("Файниц") ||
        p.lastName.includes("Галустов"),
    )
    .map((p) => p.id);

  const teams = await prisma.tournamentTeam.findMany({
    select: {
      player1Id: true,
      player2Id: true,
      tournament: { select: { status: true } },
    },
  });
  const tourCount = new Map<string, number>();
  for (const p of players) tourCount.set(p.id, 0);
  for (const t of teams) {
    if (t.tournament.status !== "FINISHED") continue;
    tourCount.set(t.player1Id, (tourCount.get(t.player1Id) ?? 0) + 1);
    if (t.player2Id) {
      tourCount.set(t.player2Id, (tourCount.get(t.player2Id) ?? 0) + 1);
    }
  }

  const active = players.filter((p) => (tourCount.get(p.id) ?? 0) >= 1);
  const weights = active.map((p) => Math.max(1, tourCount.get(p.id) ?? 1));

  function pickField(rng: () => number) {
    const pool = active.map((p, i) => ({ id: p.id, w: weights[i]! }));
    const field: string[] = [];
    const n = Math.min(FIELD_SIZE, pool.length);
    for (let k = 0; k < n; k++) {
      const total = pool.reduce((a, x) => a + x.w, 0);
      let r = rng() * total;
      let idx = pool.length - 1;
      for (let i = 0; i < pool.length; i++) {
        r -= pool[i]!.w;
        if (r <= 0) {
          idx = i;
          break;
        }
      }
      field.push(pool[idx]!.id);
      pool.splice(idx, 1);
    }
    return field;
  }

  function simulateTournament(
    rng: () => number,
    ratings: Map<string, number>,
  ) {
    const field = pickField(rng);
    if (field.length < 2) return;
    for (let m = 0; m < MATCHES_PER_TOUR; m++) {
      let i = Math.floor(rng() * field.length);
      let j = Math.floor(rng() * field.length);
      if (i === j) j = (j + 1) % field.length;
      const a = field[i]!;
      const b = field[j]!;
      const ra = ratings.get(a)!;
      const rb = ratings.get(b)!;
      const aWins = rng() < pWin(ra, rb);
      const wId = aWins ? a : b;
      const lId = aWins ? b : a;
      const wR = ratings.get(wId)!;
      const lR = ratings.get(lId)!;
      const ch = ratingChangeForFormula(FORMULA, wR, lR);
      ratings.set(wId, applyFloor(wR + ch.winnerDelta, wR >= 1));
      ratings.set(lId, applyFloor(lR + ch.loserDelta, lR >= 1));
    }
  }

  type HorizonStat = {
    mean: number;
    p10: number;
    p50: number;
    p90: number;
    meanDelta: number;
  };

  const store = new Map<
    string,
    { start: number; horizons: Record<number, number[]> }
  >();
  for (const p of active) {
    const horizons: Record<number, number[]> = {};
    for (const H of HORIZONS) horizons[H] = [];
    store.set(p.id, { start: p.rating, horizons });
  }

  for (let run = 0; run < MC_RUNS; run++) {
    const rng = mulberry32(1000 + run * 9973);
    const ratings = new Map(players.map((p) => [p.id, p.rating]));
    let done = 0;
    for (const H of HORIZONS) {
      while (done < H) {
        simulateTournament(rng, ratings);
        done++;
      }
      for (const p of active) {
        store.get(p.id)!.horizons[H]!.push(ratings.get(p.id)!);
      }
    }
  }

  function summarize(id: string): Record<string, HorizonStat> {
    const row = store.get(id)!;
    const out: Record<string, HorizonStat> = {};
    for (const H of HORIZONS) {
      const xs = row.horizons[H]!;
      const mean = avg(xs);
      out[String(H)] = {
        mean: roundToPreviewGrid(mean),
        p10: roundToPreviewGrid(quantile(xs, 0.1)),
        p50: roundToPreviewGrid(quantile(xs, 0.5)),
        p90: roundToPreviewGrid(quantile(xs, 0.9)),
        meanDelta: roundToPreviewGrid(mean - row.start),
      };
    }
    return out;
  }

  const focus = focusIds.map((id) => {
    const p = players.find((x) => x.id === id)!;
    return {
      id,
      name: `${p.lastName} ${p.firstName}`,
      now: p.rating,
      base: p.ratingBase,
      toursPlayed: tourCount.get(id) ?? 0,
      proj: store.has(id) ? summarize(id) : null,
    };
  });

  const ranked = active
    .map((p) => {
      const s = summarize(p.id);
      const row: Record<string, string | number | boolean> = {
        name: `${p.lastName} ${p.firstName}`,
        id: p.id,
        now: p.rating,
        base: p.ratingBase,
        toursPlayed: tourCount.get(p.id) ?? 0,
        focus: focusIds.includes(p.id),
      };
      for (const H of HORIZONS) {
        const st = s[String(H)]!;
        row[`d${H}`] = st.meanDelta;
        row[`mean${H}`] = st.mean;
        row[`p10_${H}`] = st.p10;
        row[`p50_${H}`] = st.p50;
        row[`p90_${H}`] = st.p90;
      }
      return row;
    })
    .sort(
      (a, b) => Number(b[`d${LAST_H}`]) - Number(a[`d${LAST_H}`]),
    );

  const pool = HORIZONS.map((H) => ({
    tournaments: H,
    meanRating: roundToPreviewGrid(
      avg(active.map((p) => avg(store.get(p.id)!.horizons[H]!))),
    ),
    nowMean: roundToPreviewGrid(avg(active.map((p) => p.rating))),
  }));

  function bandOf(r: number) {
    if (r < 1.5) return "0–1.4";
    if (r < 2.5) return "1.5–2.4";
    if (r < 3.5) return "2.5–3.4";
    if (r < 4.5) return "3.5–4.4";
    return "4.5+";
  }
  const bandNames = ["0–1.4", "1.5–2.4", "2.5–3.4", "3.5–4.4", "4.5+"];
  const byBand = bandNames.map((b) => {
    const group = active.filter((p) => bandOf(p.rating) === b);
    const row: Record<string, unknown> = { band: b, n: group.length };
    if (!group.length) return row;
    for (const H of HORIZONS) {
      const deltas = group.map(
        (p) => avg(store.get(p.id)!.horizons[H]!) - p.rating,
      );
      row[`d${H}`] = roundToPreviewGrid(avg(deltas));
      row[`mean${H}`] = roundToPreviewGrid(
        avg(group.map((p) => avg(store.get(p.id)!.horizons[H]!))),
      );
    }
    return row;
  });

  const report = {
    meta: {
      formula: FORMULA,
      mcRuns: MC_RUNS,
      horizons: [...HORIZONS],
      fieldSize: FIELD_SIZE,
      matchesPerTournament: MATCHES_PER_TOUR,
      winModel: `P=1/(1+10^((Ropp-R)/${ELO_D}))`,
      activePlayers: active.length,
      note: `Не повтор исторических 10 турниров. Каждый из ${MC_RUNS} прогонов строит ${LAST_H} НОВЫХ турниров: состав ~${FIELD_SIZE} игроков выбирается случайно (чаще берут тех, кто чаще играл раньше), пары матчей случайные (~${MATCHES_PER_TOUR} на турнир), победитель — по логистике от текущего рейтинга, апдейт tiny_upset_only.`,
    },
    pool,
    byBand,
    focus,
    topGain: ranked.slice(0, 15),
    topLoss: [...ranked].reverse().slice(0, 15),
    players: ranked,
  };

  const outPath = resolve(
    __dirname,
    "../public/rating-projection-tiny-upset.json",
  );
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        meta: report.meta,
        pool: report.pool,
        byBand: report.byBand,
        focus: report.focus,
      },
      null,
      2,
    ),
  );
  console.error("wrote", outPath);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
