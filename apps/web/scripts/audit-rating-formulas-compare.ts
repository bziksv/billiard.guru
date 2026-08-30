/**
 * Сравнение всех формул рейтинга на полной истории (без записи в БД).
 *
 *   cd apps/web && npx tsx scripts/audit-rating-formulas-compare.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";
import { RATING_PREVIEW_FORMULA_OPTIONS } from "../src/lib/rating-auto-config";
import { ratingChangeForFormula } from "../src/lib/rating-preview";
import {
  MAX_PLAYER_RATING,
  MIN_PLAYER_RATING,
  roundToPreviewGrid,
} from "../src/lib/rating";

const MIN_MATCHES = 8;
const EQUAL = 0.5;
const FOCUS_IDS = [
  "cmq3p1drx001d2g9wojhhkara", // Файницкий
  "cmq3p30nb001h2g9w1vu6z49x", // Галустов
];

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = avg(xs);
  return Math.sqrt(avg(xs.map((x) => (x - m) ** 2)));
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function percentile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))));
  return s[i]!;
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = avg(xs);
  const my = avg(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i]! - mx;
    const b = ys[i]! - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (!dx || !dy) return null;
  return num / Math.sqrt(dx * dy);
}

function ranks(v: number[]): number[] {
  const idx = v.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const out = new Array<number>(v.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j < idx.length && idx[j]!.x === idx[i]!.x) j++;
    const ar = (i + j - 1) / 2 + 1;
    for (let k = i; k < j; k++) out[idx[k]!.i] = ar;
    i = j;
  }
  return out;
}

function spearman(xs: number[], ys: number[]): number | null {
  return pearson(ranks(xs), ranks(ys));
}

function applyFloor(raw: number, unlocked: boolean): number {
  let after = roundToPreviewGrid(
    Math.min(MAX_PLAYER_RATING, Math.max(MIN_PLAYER_RATING, raw)),
  );
  if (unlocked || after >= 1) after = Math.max(1, after);
  return after;
}

function scale(values: number[], higherBetter: boolean): number[] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (hi === lo) return values.map(() => 50);
  return values.map((v) => {
    const t = (v - lo) / (hi - lo);
    return Math.round((higherBetter ? t : 1 - t) * 100);
  });
}

type Stat = {
  rating: number;
  wins: number;
  losses: number;
  zeroWins: number;
  abs: number;
  dd: number;
  peak: number;
};

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
  const byId = new Map(players.map((p) => [p.id, p]));

  const matches = await prisma.tournamentMatch.findMany({
    where: {
      status: "FINISHED",
      winnerTeamId: { not: null },
      team1Id: { not: null },
      team2Id: { not: null },
    },
    select: {
      finishedAt: true,
      createdAt: true,
      winnerTeamId: true,
      team1Id: true,
      team2Id: true,
      team1: {
        select: {
          player1: { select: { id: true } },
          player2: { select: { id: true } },
        },
      },
      team2: {
        select: {
          player1: { select: { id: true } },
          player2: { select: { id: true } },
        },
      },
    },
    orderBy: [{ finishedAt: "asc" }, { createdAt: "asc" }],
  });
  const real = matches.filter((m) => m.team1 && m.team2 && m.winnerTeamId);

  type Row = {
    formula: string;
    short: string;
    spearman: number | null;
    paradox: number;
    paradoxPairs: string;
    topMinusBot: number;
    grindMean: number;
    grindMed: number;
    vol: number;
    dd: number;
    zeroPct: number;
    favZ: number;
    favP: number;
    ups: number;
    eq: number;
    mean: number;
    stdv: number;
    spread: number;
    focus: { name: string; r: number; wr: number; net: number }[];
    scores: {
      skill: number;
      paradoxFree: number;
      grinder: number;
      stability: number;
      separation: number;
      overall: number;
    };
  };

  const rows: Row[] = [];

  for (const opt of RATING_PREVIEW_FORMULA_OPTIONS) {
    const formula = opt.value;
    const ratings = new Map(players.map((p) => [p.id, p.ratingBase ?? 0]));
    const stats = new Map<string, Stat>();
    for (const p of players) {
      const r = p.ratingBase ?? 0;
      stats.set(p.id, {
        rating: r,
        wins: 0,
        losses: 0,
        zeroWins: 0,
        abs: 0,
        dd: 0,
        peak: r,
      });
    }

    let favZ = 0;
    let favP = 0;
    let ups = 0;
    let eq = 0;

    for (const m of real) {
      const wIs1 = m.winnerTeamId === m.team1Id;
      const wT = wIs1 ? m.team1! : m.team2!;
      const lT = wIs1 ? m.team2! : m.team1!;
      const winners = [wT.player1.id, wT.player2?.id].filter(
        Boolean,
      ) as string[];
      const losers = [lT.player1.id, lT.player2?.id].filter(
        Boolean,
      ) as string[];
      if (!winners.length || winners.length !== losers.length) continue;

      const wAvg = avg(winners.map((id) => ratings.get(id)!));
      const lAvg = avg(losers.map((id) => ratings.get(id)!));
      const ch = ratingChangeForFormula(formula, wAvg, lAvg);
      const diff = wAvg - lAvg;

      if (diff >= EQUAL) {
        if (ch.winnerDelta === 0) favZ++;
        else favP++;
      } else if (diff <= -EQUAL) {
        ups++;
      } else {
        eq++;
      }

      for (const id of winners) {
        const before = ratings.get(id)!;
        const after = applyFloor(before + ch.winnerDelta, before >= 1);
        const delta = roundToPreviewGrid(after - before);
        ratings.set(id, after);
        const st = stats.get(id)!;
        st.wins++;
        st.rating = after;
        st.abs += Math.abs(delta);
        if (delta === 0) st.zeroWins++;
        if (after > st.peak) st.peak = after;
        st.dd = Math.max(st.dd, roundToPreviewGrid(st.peak - after));
      }
      for (const id of losers) {
        const before = ratings.get(id)!;
        const after = applyFloor(before + ch.loserDelta, before >= 1);
        const delta = roundToPreviewGrid(after - before);
        ratings.set(id, after);
        const st = stats.get(id)!;
        st.losses++;
        st.rating = after;
        st.abs += Math.abs(delta);
        if (after > st.peak) st.peak = after;
        st.dd = Math.max(st.dd, roundToPreviewGrid(st.peak - after));
      }
    }

    const el = [...stats.entries()].filter(
      ([, s]) => s.wins + s.losses >= MIN_MATCHES,
    );
    const wr = el.map(([, s]) => s.wins / (s.wins + s.losses));
    const rt = el.map(([, s]) => s.rating);

    let pp = 0;
    let cp = 0;
    for (let i = 0; i < el.length; i++) {
      for (let j = i + 1; j < el.length; j++) {
        const a = el[i]![1];
        const b = el[j]![1];
        const wra = a.wins / (a.wins + a.losses);
        const wrb = b.wins / (b.wins + b.losses);
        if (Math.abs(wra - wrb) < 0.05) continue;
        cp++;
        const hi = wra > wrb ? a : b;
        const lo = wra > wrb ? b : a;
        if (hi.rating + 1e-9 < lo.rating) pp++;
      }
    }

    const byWr = [...el].sort((a, b) => {
      const wa = a[1].wins / (a[1].wins + a[1].losses);
      const wb = b[1].wins / (b[1].wins + b[1].losses);
      return wb - wa;
    });
    const q = Math.max(1, Math.floor(el.length / 4));
    const top = avg(byWr.slice(0, q).map(([, s]) => s.rating));
    const bot = avg(byWr.slice(-q).map(([, s]) => s.rating));

    const grind = el.filter(
      ([, s]) => s.wins / (s.wins + s.losses) >= 0.6,
    );
    const gNet = grind.map(
      ([id, s]) => s.rating - (byId.get(id)!.ratingBase ?? 0),
    );
    const winsT = el.reduce((a, [, s]) => a + s.wins, 0);
    const zeroT = el.reduce((a, [, s]) => a + s.zeroWins, 0);

    rows.push({
      formula: opt.value,
      short: opt.short,
      spearman: spearman(wr, rt),
      paradox: cp ? pp / cp : 0,
      paradoxPairs: `${pp}/${cp}`,
      topMinusBot: roundToPreviewGrid(top - bot),
      grindMean: roundToPreviewGrid(avg(gNet)),
      grindMed: roundToPreviewGrid(median(gNet)),
      vol: roundToPreviewGrid(
        avg(el.map(([, s]) => s.abs / (s.wins + s.losses))),
      ),
      dd: roundToPreviewGrid(avg(el.map(([, s]) => s.dd))),
      zeroPct: winsT ? zeroT / winsT : 0,
      favZ,
      favP,
      ups,
      eq,
      mean: roundToPreviewGrid(avg(rt)),
      stdv: roundToPreviewGrid(std(rt)),
      spread: roundToPreviewGrid(percentile(rt, 0.9) - percentile(rt, 0.1)),
      focus: FOCUS_IDS.map((id) => {
        const p = byId.get(id);
        const s = stats.get(id);
        if (!p || !s) {
          return { name: id.slice(0, 8), r: 0, wr: 0, net: 0 };
        }
        const n = s.wins + s.losses;
        return {
          name: p.lastName,
          r: s.rating,
          wr: n ? s.wins / n : 0,
          net: roundToPreviewGrid(s.rating - (p.ratingBase ?? 0)),
        };
      }),
      scores: {
        skill: 0,
        paradoxFree: 0,
        grinder: 0,
        stability: 0,
        separation: 0,
        overall: 0,
      },
    });
  }

  const skill = scale(
    rows.map((r) => r.spearman ?? 0),
    true,
  );
  const paradoxf = scale(
    rows.map((r) => r.paradox),
    false,
  );
  const grindf = scale(
    rows.map((r) => r.grindMean),
    true,
  );
  const stab = scale(
    rows.map((r) => r.vol + r.dd * 0.5),
    false,
  );
  const sep = scale(
    rows.map((r) => r.topMinusBot),
    true,
  );

  for (let i = 0; i < rows.length; i++) {
    const s = rows[i]!.scores;
    s.skill = skill[i]!;
    s.paradoxFree = paradoxf[i]!;
    s.grinder = grindf[i]!;
    s.stability = stab[i]!;
    s.separation = sep[i]!;
    s.overall = Math.round(
      s.skill * 0.3 +
        s.paradoxFree * 0.25 +
        s.grinder * 0.2 +
        s.separation * 0.15 +
        s.stability * 0.1,
    );
  }

  rows.sort((a, b) => b.scores.overall - a.scores.overall);

  console.log(
    JSON.stringify(
      {
        meta: {
          matches: real.length,
          players: players.length,
          minMatches: MIN_MATCHES,
          scoring:
            "0.30 skill(Spearman WR↔R) + 0.25 paradoxFree + 0.20 grinderNet + 0.15 top−bot sep + 0.10 stability",
        },
        ranking: rows.map((r, i) => ({
          rank: i + 1,
          formula: r.formula,
          short: r.short,
          overall: r.scores.overall,
          scores: r.scores,
          spearmanWR: r.spearman == null ? null : +r.spearman.toFixed(3),
          paradoxPct: +(r.paradox * 100).toFixed(1),
          paradoxPairs: r.paradoxPairs,
          topMinusBot: r.topMinusBot,
          grindersMeanNet: r.grindMean,
          grindersMedianNet: r.grindMed,
          volPerMatch: r.vol,
          avgMaxDrawdown: r.dd,
          zeroWinPct: +(r.zeroPct * 100).toFixed(1),
          favWinZero: r.favZ,
          favWinPaid: r.favP,
          upsetPunish: r.ups,
          equalMoves: r.eq,
          ratingMean: r.mean,
          ratingStd: r.stdv,
          spreadP90P10: r.spread,
          focus: r.focus,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
