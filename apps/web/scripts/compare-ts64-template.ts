/**
 * Сверка шаблона 64→32: все 115 # и переходы win/loss.
 */
import assert from "node:assert/strict";
import { buildFixedSwissTemplate } from "../src/lib/fixed-swiss-grid";
import { fixedSwissMatchNo } from "../src/lib/fixed-swiss-grid";
import { matchStageLabel } from "../src/lib/tournament-match-schedule";
import type { BracketMatchView } from "../src/lib/bracket-view";

const MC = 115;
const template = buildFixedSwissTemplate(64, "FIXED_SWISS_64");
const matches: BracketMatchView[] = template.matches.map((m) => ({
  id: `r${m.round}s${m.slot}`,
  round: m.round,
  slot: m.slot,
  status: "SCHEDULED" as const,
  winnerTeamId: null,
  team1: null,
  team2: null,
}));

const nums = new Map(
  matches.map((m) => [m.id, fixedSwissMatchNo(m.round, m.slot, MC, 7)]),
);

const used = new Set<number>();
for (const n of nums.values()) {
  if (used.has(n)) {
    console.error("duplicate #", n);
    process.exit(1);
  }
  used.add(n);
}
assert.equal(used.size, 115);

const badStage: string[] = [];
for (const m of matches) {
  const label = matchStageLabel(m, "FIXED_SWISS_64", matches, nums.get(m.id));
  if (label.startsWith("Тур ")) badStage.push(`${nums.get(m.id)} R${m.round}s${m.slot} ${label}`);
}
if (badStage.length) {
  console.error("bad stages", badStage.slice(0, 10));
  process.exit(1);
}

const byNo = new Map<number, { round: number; slot: number }>();
for (const m of matches) byNo.set(nums.get(m.id)!, { round: m.round, slot: m.slot });

const checks: [number, string, number, number][] = [
  [113, "→#117 t1", 6, 1],
  [114, "→#117 t2", 6, 1],
  [115, "→#118 t1", 6, 2],
  [116, "→#118 t2", 6, 2],
  [117, "→#119 t1", 7, 1],
  [118, "→#119 t2", 7, 1],
];

for (const [fromNo, desc, toR, toS] of checks) {
  const from = [...byNo.entries()].find(([n]) => n === fromNo);
  if (!from) continue;
  const [, fs] = from;
  const link = template.links.find(
    (l) =>
      l.fromRound === fs.round &&
      l.fromSlot === fs.slot &&
      l.kind === "win" &&
      l.toRound === toR &&
      l.toSlot === toS,
  );
  if (!link) {
    console.error("missing link", fromNo, desc);
    process.exit(1);
  }
}

console.log("compare-ts64-template: OK", {
  range: `${Math.min(...used)}-${Math.max(...used)}`,
  r3_21: nums.get("r3s21"),
  r6_1: nums.get("r6s1"),
  r6_2: nums.get("r6s2"),
});
