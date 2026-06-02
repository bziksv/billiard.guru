/**
 * Регрессионный тест эталонной сетки 16→8.
 * Регламент: docs/BRACKET_REFERENCE_16_8.md
 */
import assert from "node:assert/strict";
import type { BracketMatchView } from "../src/lib/bracket-view";
import {
  buildFixedSwissBracketLayout,
  fixedSwiss168MatchCol,
  fixedSwissBracketHeight,
  fixedSwissFromTeamSlot,
  fixedSwissMatchCol,
  fixedSwissMatchTop,
  fixedSwissTsMatchCol,
  gridFixedConnectorPath,
  gridFixedCrossToQuarterConnectorPath,
  gridFixedEdgePoints,
  gridFixedForkConnectorPath,
  gridFixedR12ConnectorPath,
  fixedSwissForkTrunkYByTarget,
  fixedSwissR12TrunkYByTarget,
  FIXED_SWISS_BRACKET_UNIT,
  FIXED_SWISS_CARD_H,
  FIXED_SWISS_COL_W,
  shouldDrawFixedSwissLossEdge,
  shouldDrawFixedSwissWinEdge,
  isFixedSwissRound12Edge,
  isFixedSwissRound23Edge,
  isFixedSwissForkEdge,
  fixedSwissPlacementLabel,
} from "../src/lib/fixed-swiss-layout";
import {
  buildFixedSwissTemplate,
  fixedSwiss168MatchNo,
  fixedSwissTsMatchNo,
  inferFixedSwissGridSize,
  isFixedSwiss168LegacyMatchCount,
  isFixedSwiss168MatchCount,
  isFixedSwissTsLegacy29MatchCount,
  isFixedSwissTsMatchCount,
} from "../src/lib/fixed-swiss-grid";
import {
  GRID_LABEL_OFFSET,
  GRID_PAD,
  incomingAutopassPhantomSlot,
  teamDividerY,
  teamRowCenterYBySlot,
} from "../src/lib/swiss-bracket-layout";

function mkMatch(round: number, slot: number): BracketMatchView {
  return {
    id: `r${round}s${slot}`,
    round,
    slot,
    status: "SCHEDULED",
    winnerTeamId: null,
    team1: null,
    team2: null,
  };
}

function mkGridTs(): BracketMatchView[] {
  const template = buildFixedSwissTemplate(16);
  return template.matches.map((m) => mkMatch(m.round, m.slot));
}

function mkGridLegacy168(): BracketMatchView[] {
  const matches: BracketMatchView[] = [];
  const slotsByRound: Record<number, number> = {
    1: 8,
    2: 8,
    3: 8,
    4: 2,
    5: 1,
  };
  for (let round = 1; round <= 5; round++) {
    for (let slot = 1; slot <= slotsByRound[round]!; slot++) {
      matches.push(mkMatch(round, slot));
    }
  }
  return matches;
}

const mpr = 8;
const cardH = FIXED_SWISS_CARD_H;

assert.equal(buildFixedSwissTemplate(16).matches.length, 27);
assert.equal(inferFixedSwissGridSize(27), 16);
assert.equal(isFixedSwissTsMatchCount(27), true);
assert.equal(isFixedSwissTsMatchCount(27, 5), true);
assert.equal(isFixedSwissTsLegacy29MatchCount(29), true);
assert.equal(isFixedSwiss168MatchCount(27), true);
assert.equal(isFixedSwiss168LegacyMatchCount(27, 5), true);

assert.equal(fixedSwissTsMatchNo(1, 1), 1);
assert.equal(fixedSwissTsMatchNo(2, 5), 9);
assert.equal(fixedSwissTsMatchNo(2, 1), 13);
assert.equal(fixedSwissTsMatchNo(3, 1), 17);
assert.equal(fixedSwissTsMatchNo(3, 5), 21);
assert.equal(fixedSwissTsMatchNo(3, 8), 24);
assert.equal(fixedSwissTsMatchNo(4, 1), 25);
assert.equal(fixedSwissTsMatchNo(4, 2), 26);
assert.equal(fixedSwissTsMatchNo(5, 1), 27);

{
  const links = buildFixedSwissTemplate(16).links;
  const loss9 = links.find(
    (l) => l.fromRound === 2 && l.fromSlot === 5 && l.kind === "loss",
  );
  const loss12 = links.find(
    (l) => l.fromRound === 2 && l.fromSlot === 8 && l.kind === "loss",
  );
  const win13 = links.find(
    (l) => l.fromRound === 2 && l.fromSlot === 1 && l.kind === "win",
  );
  assert.equal(loss9?.toSlot, 4, "#9 loser → cross #20");
  assert.equal(loss12?.toSlot, 1, "#12 loser → cross #17");
  assert.equal(loss12?.toTeam, 1, "#12 loser → cross #17 team1");
  assert.equal(win13?.toSlot, 1, "#13 winner → cross #17");
  assert.equal(win13?.toTeam, 2, "#13 winner → cross #17 team2");
}

assert.equal(fixedSwissTsMatchCol(2, 1), -1);
assert.equal(fixedSwissTsMatchCol(2, 5), 1);
assert.equal(fixedSwissTsMatchCol(3, 1), -2);
assert.equal(fixedSwissTsMatchCol(3, 5), 2);
assert.equal(fixedSwissTsMatchCol(3, 8), 2);
assert.equal(fixedSwissTsMatchCol(4, 1), 3);
assert.equal(fixedSwissTsMatchCol(5, 1), 4);

assert.equal(fixedSwissFromTeamSlot(mkMatch(1, 1), "win"), 1);
assert.equal(fixedSwissFromTeamSlot(mkMatch(1, 2), "win"), 2);

const layoutTs = buildFixedSwissBracketLayout(mkGridTs());
assert.equal(layoutTs.minCol, -2);
assert.equal(layoutTs.maxCol, 4);
assert.equal(layoutTs.matchNumbers.get("r1s1"), 1);
assert.equal(layoutTs.matchNumbers.get("r2s5"), 9);
assert.equal(layoutTs.matchNumbers.get("r2s1"), 13);
assert.equal(layoutTs.matchNumbers.get("r3s1"), 17);
assert.equal(layoutTs.matchNumbers.get("r3s5"), 21);
assert.equal(layoutTs.matchNumbers.get("r3s8"), 24);
assert.equal(layoutTs.matchNumbers.get("r4s1"), 25);
assert.equal(layoutTs.matchNumbers.get("r5s1"), 27);
assert.equal(
  fixedSwissPlacementLabel(4, 1, 5, 8, 27),
  "место 3–4",
  "semi #25 by round/slot",
);
assert.equal(
  fixedSwissPlacementLabel(4, 1, 6, 8, 27, 25),
  "место 3–4",
  "card #25 must not map to legacy #23 when maxRound is 6",
);
assert.equal(fixedSwissPlacementLabel(3, 5, 5, 8, 27, 21), "место 5–8");

assert.equal(layoutTs.positions.get("r2s1")!.col, -1);
assert.equal(layoutTs.positions.get("r2s5")!.col, 1);
assert.equal(
  layoutTs.positions.get("r2s1")!.y,
  layoutTs.positions.get("r2s5")!.y,
  "#13 and #9 share Y from R1 pair 1+2",
);

function expectCenterBetween(
  childY: number,
  yA: number,
  yB: number,
  cardH: number,
  label: string,
) {
  const c1 = yA + cardH / 2;
  const c2 = yB + cardH / 2;
  const expected = (c1 + c2) / 2 - cardH / 2;
  assert.ok(
    Math.abs(childY - expected) < 0.01,
    `${label}: expected midpoint ${expected}, got ${childY}`,
  );
}

assert.equal(
  layoutTs.positions.get("r3s5")!.y,
  layoutTs.positions.get("r2s5")!.y,
  "#21 same Y as #9 (TS)",
);
assert.equal(
  layoutTs.positions.get("r3s6")!.y,
  layoutTs.positions.get("r2s6")!.y,
  "#22 same Y as #10",
);
assert.equal(
  layoutTs.positions.get("r3s1")!.y,
  layoutTs.positions.get("r2s1")!.y,
  "cross #17 same Y as lower #13",
);
assert.equal(
  layoutTs.positions.get("r3s2")!.y,
  layoutTs.positions.get("r2s2")!.y,
  "cross #18 same Y as lower #14",
);
assert.equal(
  layoutTs.positions.get("r3s4")!.y,
  layoutTs.positions.get("r2s4")!.y,
  "cross #20 same Y as lower #16",
);

{
  const fromPos = layoutTs.positions.get("r1s1")!;
  const toPos = layoutTs.positions.get("r2s5")!;
  const fromTop = fromPos.y + GRID_PAD + GRID_LABEL_OFFSET;
  const pts = gridFixedEdgePoints(fromPos, toPos, 1, 1, "win", layoutTs.minCol);
  assert.equal(pts.from.y, teamDividerY(fromTop), "line exits at player divider");
  assert.notEqual(
    pts.from.y,
    teamRowCenterYBySlot(fromTop, 1),
    "not from row center",
  );
}

const r1s1Win = layoutTs.edges.find(
  (e) => e.fromId === "r1s1" && e.kind === "win",
);
const r1s1Loss = layoutTs.edges.find(
  (e) => e.fromId === "r1s1" && e.kind === "loss",
);
const loss9edge = layoutTs.edges.find(
  (e) => e.fromId === "r2s5" && e.kind === "loss",
);
assert.equal(r1s1Win?.toId, "r2s5", "R1 win → #9");
assert.equal(r1s1Loss?.toId, "r2s1", "R1 loss → #13");
assert.equal(loss9edge?.toId, "r3s4", "#9 loser → cross #20");

const win13edge = layoutTs.edges.find(
  (e) => e.fromId === "r2s1" && e.kind === "win",
);
assert.equal(win13edge?.toId, "r3s1", "#13 winner → cross #17");

const crossWin = layoutTs.edges.find(
  (e) => e.fromId === "r3s1" && e.kind === "win",
);
assert.equal(crossWin?.toId, "r3s6", "#17 winner → #22 slot 2");

const upperWin = layoutTs.edges.find(
  (e) => e.fromId === "r2s5" && e.kind === "win",
);
assert.equal(upperWin?.toId, "r3s5", "#9 winner → #21");

const multiHop = gridFixedConnectorPath(
  { x: 400, y: 100 },
  { x: 50, y: 250 },
  "win",
  2,
  -2,
  -4,
  248,
);
assert.match(
  multiHop,
  /H [\d.]+ V 250/,
  "multi-hop: gutter then vertical to target Y",
);
assert.match(multiHop, /V 250 H/, "horizontal hops at target Y");

const crossQuarter = gridFixedCrossToQuarterConnectorPath(
  { x: 120, y: 200 },
  { x: 900, y: 350 },
  -2,
  2,
  -4,
  248,
  1,
);
assert.match(
  crossQuarter,
  /^M 120 200(?: H [\d.]+)+ V 350 H 900$/,
  "cross→1/4: horizontal at source Y, then V at target column",
);
assert.ok(
  !crossQuarter.includes(" V 200 "),
  "no vertical at source Y",
);

assert.equal(isFixedSwissRound12Edge(1, 2), true);
assert.equal(isFixedSwissRound23Edge(2, 3), true);
assert.equal(isFixedSwissForkEdge(2, 3), false, "R23 not fork — avoids vertical bus");

assert.equal(shouldDrawFixedSwissWinEdge(0, 1, 1, 2, "win"), true);
assert.equal(shouldDrawFixedSwissWinEdge(0, 1, 1, 2, "bye"), true);
assert.equal(shouldDrawFixedSwissWinEdge(0, 1, 2, 3, "win"), false);
assert.equal(
  shouldDrawFixedSwissWinEdge(1, 2, 2, 3, "win", 5, 5),
  true,
  "#9 → #21",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(1, 2, 2, 3, "win", 6, 6),
  true,
  "#10 → #22",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-1, -2, 2, 3, "win", 1, 1),
  true,
  "#13 → #17",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-1, -2, 2, 3, "win", 2, 2),
  true,
  "#14 → #18",
);
assert.equal(shouldDrawFixedSwissWinEdge(1, 2, 2, 3, "win", 7, 7), true, "#11 → #23");
assert.equal(shouldDrawFixedSwissWinEdge(1, 2, 2, 3, "win", 8, 8), true, "#12 → #24");
assert.equal(shouldDrawFixedSwissWinEdge(-1, -2, 2, 3, "win", 3, 3), true, "#15 → #19");
assert.equal(shouldDrawFixedSwissWinEdge(-1, -2, 2, 3, "win", 4, 4), true, "#16 → #20");
assert.equal(shouldDrawFixedSwissWinEdge(-2, 2, 3, 3, "win"), false);
assert.equal(shouldDrawFixedSwissWinEdge(2, 3, 3, 4, "win", 5, 1), true, "#21 → #25");
assert.equal(shouldDrawFixedSwissWinEdge(2, 3, 3, 4, "win", 6, 1), true, "#22 → #25");
assert.equal(shouldDrawFixedSwissWinEdge(2, 3, 3, 4, "win", 7, 2), true, "#23 → #26");
assert.equal(shouldDrawFixedSwissWinEdge(2, 3, 3, 4, "win", 8, 2), true, "#24 → #26");
assert.equal(isFixedSwissForkEdge(3, 4), true);
assert.equal(shouldDrawFixedSwissWinEdge(3, 4, 4, 5, "win", 1, 1), true, "#25 → #27");
assert.equal(shouldDrawFixedSwissWinEdge(3, 4, 4, 5, "win", 2, 1), true, "#26 → #27");
assert.equal(isFixedSwissForkEdge(4, 5), true);

assert.equal(shouldDrawFixedSwissLossEdge(0, -1, false, 1, 2), true);
assert.equal(shouldDrawFixedSwissLossEdge(0, -1, false, 2, 3), false);
assert.equal(shouldDrawFixedSwissLossEdge(0, -1, true, 1, 2), true);
assert.equal(shouldDrawFixedSwissLossEdge(1, -2, false, 2, 3), false);

assert.equal(
  shouldDrawFixedSwissWinEdge(0, -1, 1, 2, "loss"),
  false,
  "loss must not pass win filter",
);

function forkPath(
  layout: ReturnType<typeof buildFixedSwissBracketLayout>,
  fromId: string,
  kind: "win" | "loss",
  trunkY: Map<string, number>,
): string {
  const edge = layout.edges.find((e) => e.fromId === fromId && e.kind === kind);
  assert.ok(edge?.fromTeamSlot != null && edge.toTeamSlot != null);
  const fromPos = layout.positions.get(edge.fromId)!;
  const toPos = layout.positions.get(edge.toId)!;
  const pts = gridFixedEdgePoints(
    fromPos,
    toPos,
    edge.fromTeamSlot!,
    edge.toTeamSlot!,
    kind,
    layout.minCol,
  );
  return gridFixedForkConnectorPath(
    pts.from,
    pts.to,
    fromPos.col,
    toPos.col,
    layout.minCol,
    layout.colWidth ?? FIXED_SWISS_COL_W,
    trunkY.get(edge.toId) ?? pts.from.y,
  );
}

const matchById = new Map(mkGridTs().map((m) => [m.id, m]));
const getFromY = (
  fromId: string,
  _toId: string,
  fromTeamSlot: 1 | 2,
  _toTeamSlot: 1 | 2,
  kind: "win" | "loss",
) => {
  const fromPos = layoutTs.positions.get(fromId);
  if (!fromPos) return undefined;
  const pts = gridFixedEdgePoints(
    fromPos,
    layoutTs.positions.get(_toId)!,
    fromTeamSlot,
    1,
    kind,
    layoutTs.minCol,
  );
  return pts.from.y;
};
const r12Trunk = fixedSwissR12TrunkYByTarget(
  layoutTs.edges,
  getFromY,
  matchById,
);

const win13 = forkPath(layoutTs, "r1s1", "win", r12Trunk);
const loss13 = forkPath(layoutTs, "r1s1", "loss", r12Trunk);

for (const d of [win13, loss13]) {
  assert.match(d, /^M [\d.]+ [\d.]+ H [\d.]+ V [\d.]+ V [\d.]+ H [\d.]+$/, "R12 stepped path");
}
assert.ok(win13.includes(`V ${r12Trunk.get("r2s5")}`), "win uses shared trunk");

assert.equal(
  layoutTs.edges.find((e) => e.fromId === "r2s5" && e.kind === "win")?.toId,
  "r3s5",
  "#9 win → #21 in graph",
);
assert.equal(shouldDrawFixedSwissWinEdge(1, 2, 2, 3, "win", 11, 11), false);

assert.equal(
  gridFixedR12ConnectorPath(
    { x: 10, y: 20 },
    { x: 200, y: 80 },
    0,
    1,
    -4,
    248,
    55,
  ),
  gridFixedForkConnectorPath(
    { x: 10, y: 20 },
    { x: 200, y: 80 },
    0,
    1,
    -4,
    248,
    55,
  ),
);

const byeMatch: BracketMatchView = {
  ...mkMatch(1, 1),
  team1: {
    id: "t1",
    player1: { id: "p1", firstName: "A", lastName: "B", rating: 5 },
    player2: null,
  },
  team2: null,
  winnerTeamId: "t1",
};
assert.equal(fixedSwissFromTeamSlot(byeMatch, "loss"), 2);

const byeLayout = buildFixedSwissBracketLayout([
  byeMatch,
  ...mkGridTs().slice(1),
]);
const byeById = new Map(
  mkGridTs().map((m) => [m.id, m.id === "r1s1" ? byeMatch : m]),
);
assert.equal(
  incomingAutopassPhantomSlot("r2s1", byeLayout.edges, byeById),
  1,
  "× in #13 for 15-player bye",
);

assert.equal(fixedSwissMatchCol(2, 1, mpr), 1);
assert.equal(fixedSwissMatchCol(2, 5, mpr), -1);

const layoutLegacy = buildFixedSwissBracketLayout(mkGridLegacy168());
assert.equal(layoutLegacy.minCol, -2);
assert.equal(layoutLegacy.maxCol, 4);
assert.equal(fixedSwiss168MatchNo(2, 1), 9);
assert.equal(layoutLegacy.matchNumbers.get("r2s1"), 13);

assert.equal(layoutTs.edges.length, 38, "TS 27 link count");

const byCol = new Map<number, Array<{ id: string; y: number; h: number }>>();
for (const [id, pos] of layoutTs.positions) {
  const list = byCol.get(pos.col) ?? [];
  list.push({ id, y: pos.y, h: cardH });
  byCol.set(pos.col, list);
}
for (const [col, items] of byCol) {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    assert.ok(
      curr.y >= prev.y + prev.h - 0.01,
      `overlap in col ${col}: ${prev.id} vs ${curr.id}`,
    );
  }
}

assert.ok(FIXED_SWISS_BRACKET_UNIT >= cardH);
assert.equal(
  fixedSwissBracketHeight(mpr, cardH),
  mpr * FIXED_SWISS_BRACKET_UNIT - (FIXED_SWISS_BRACKET_UNIT - cardH) / 2,
);

console.log("fixed swiss layout tests passed");
