import assert from "node:assert/strict";
import { applyLateArrivalSeeding } from "../src/lib/late-arrival-seeding";
import { buildOlympicBracket } from "../src/lib/pair-tournament";

function team(id: string, isLate = false) {
  return { id, isLate };
}

function ids(teams: { id: string }[]) {
  return teams.map((t) => t.id);
}

// 0 late — порядок как есть
{
  const input = Array.from({ length: 8 }, (_, i) => team(`t${i + 1}`));
  const out = applyLateArrivalSeeding(input);
  assert.deepEqual(ids(out), ids(input), "0 late → unchanged order");
}

// 1 late из 16 → слабый посев (seed 16)
{
  const input = Array.from({ length: 16 }, (_, i) =>
    team(`t${i + 1}`, i === 4),
  );
  const out = applyLateArrivalSeeding(input);
  assert.equal(out[15]!.id, "t5", "1 late → seed N");
  assert.equal(out[15]!.isLate, true);
  assert.deepEqual(
    ids(out.slice(0, 15)),
    ["t1", "t2", "t3", "t4", "t6", "t7", "t8", "t9", "t10", "t11", "t12", "t13", "t14", "t15", "t16"],
    "on-time fill seeds 1..15 in rating order",
  );

  const bracket = buildOlympicBracket(ids(out));
  const r1WithLate = bracket.filter(
    (m) =>
      m.round === 1 &&
      (m.team1Id === "t5" || m.team2Id === "t5"),
  );
  assert.equal(r1WithLate.length, 1);
  const opp = r1WithLate[0]!.team1Id === "t5" ? r1WithLate[0]!.team2Id : r1WithLate[0]!.team1Id;
  assert.equal(opp, "t1", "1 late plays #1");
}

// 2 late из 16 → одна встреча R1 только из них
{
  const input = Array.from({ length: 16 }, (_, i) =>
    team(`t${i + 1}`, i === 2 || i === 9),
  );
  const out = applyLateArrivalSeeding(input);
  const lateIds = new Set(["t3", "t10"]);
  const lateSeeds = out
    .map((t, i) => (lateIds.has(t.id) ? i + 1 : null))
    .filter((s): s is number => s !== null);
  assert.equal(lateSeeds.length, 2);
  // complementary: s + other === 17
  assert.equal(
    lateSeeds[0]! + lateSeeds[1]!,
    17,
    "2 late on complementary seeds",
  );

  const bracket = buildOlympicBracket(ids(out));
  const lateMatch = bracket.find(
    (m) =>
      m.round === 1 &&
      m.team1Id != null &&
      m.team2Id != null &&
      lateIds.has(m.team1Id) &&
      lateIds.has(m.team2Id),
  );
  assert.ok(lateMatch, "2 late share one R1 slot");

  // stronger late (t3, earlier in rating) gets lower seed number
  const seedOf = (id: string) => out.findIndex((t) => t.id === id) + 1;
  assert.ok(seedOf("t3") < seedOf("t10"), "higher rating late → lower seed");
}

// 3 late: пара + один на слабый посев
{
  const input = Array.from({ length: 8 }, (_, i) =>
    team(`t${i + 1}`, i === 1 || i === 3 || i === 6),
  );
  const out = applyLateArrivalSeeding(input);
  assert.equal(out[7]!.id, "t7", "leftover late → seed 8");
  assert.equal(out[7]!.isLate, true);

  const pairLates = new Set(["t2", "t4"]);
  const pairSeeds = out
    .map((t, i) => (pairLates.has(t.id) ? i + 1 : null))
    .filter((s): s is number => s !== null);
  assert.equal(pairSeeds[0]! + pairSeeds[1]!, 9, "late pair complementary for size 8");

  const bracket = buildOlympicBracket(ids(out));
  const lateOnly = bracket.find(
    (m) =>
      m.round === 1 &&
      m.team1Id != null &&
      m.team2Id != null &&
      pairLates.has(m.team1Id) &&
      pairLates.has(m.team2Id),
  );
  assert.ok(lateOnly, "late pair in own R1 match");
}

console.log("late-arrival-seeding: ok");
