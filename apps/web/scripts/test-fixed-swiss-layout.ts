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
  fixedSwissEdgeFromY,
  fixedSwissEdgeToY,
  fixedSwissTs28PlacementByMatchNo,
  fixedSwissTs32MatchCol,
  fixedSwissTs32PlacementByMatchNo,
} from "../src/lib/fixed-swiss-layout";
import {
  buildFixedSwissTemplate,
  buildFixedSwissTsBronzeTemplate,
  fixedSwiss168MatchNo,
  fixedSwissMatchNo,
  fixedSwissTsBronzeMatchNo,
  fixedSwissTsMatchNo,
  fixedSwissProtocolPlace,
  inferFixedSwissGridSize,
  isFixedSwiss168LegacyMatchCount,
  isFixedSwiss168MatchCount,
  isFixedSwissTsBronzeMatchCount,
  isFixedSwissTsLegacy29MatchCount,
  isFixedSwissTsMatchCount,
  isFixedSwissTs32MatchCount,
  isFixedSwissTs32BronzeMatchCount,
  isOutdatedFixedSwiss32Bracket,
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
assert.equal(
  buildFixedSwissTemplate(16, "FIXED_SWISS_16_BRONZE").matches.length,
  28,
);
assert.equal(buildFixedSwissTsBronzeTemplate().matches.length, 28);
assert.equal(inferFixedSwissGridSize(27), 16);
assert.equal(inferFixedSwissGridSize(28), 16);
assert.equal(isFixedSwissTsBronzeMatchCount(28), true);
assert.equal(isFixedSwiss168MatchCount(28), true);
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
assert.equal(fixedSwissTsBronzeMatchNo(5, 1), 27);
assert.equal(fixedSwissTsBronzeMatchNo(5, 2), 28);

assert.equal(fixedSwissProtocolPlace(27, "winner", 28), 1);
assert.equal(fixedSwissProtocolPlace(27, "loser", 28), 2);
assert.equal(fixedSwissProtocolPlace(28, "winner", 28), 3);
assert.equal(fixedSwissProtocolPlace(28, "loser", 28), 4);
assert.equal(fixedSwissProtocolPlace(25, "loser", 28), null);
assert.equal(fixedSwissTs28PlacementByMatchNo(28), "матч за 3–4 место");
assert.equal(fixedSwissTs28PlacementByMatchNo(25), "полуфинал");

{
  const bronzeLinks = buildFixedSwissTsBronzeTemplate().links;
  const semi1Loss = bronzeLinks.find(
    (l) =>
      l.fromRound === 4 &&
      l.fromSlot === 1 &&
      l.kind === "loss" &&
      l.toRound === 5 &&
      l.toSlot === 2,
  );
  assert.ok(semi1Loss, "полуфинал #25 loser → #28");
}

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
  const win10 = links.find(
    (l) => l.fromRound === 2 && l.fromSlot === 6 && l.kind === "win",
  );
  const crossWin17 = links.find(
    (l) => l.fromRound === 3 && l.fromSlot === 1 && l.kind === "win",
  );
  assert.equal(win10?.toSlot, 6, "#10 winner → #22");
  assert.equal(win10?.toTeam, 1, "#10 winner → #22 team1");
  assert.equal(crossWin17?.toSlot, 6, "#17 winner → #22");
  assert.equal(crossWin17?.toTeam, 2, "#17 winner → #22 team2");
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

assert.equal(fixedSwissProtocolPlace(27, "winner", 27, 5), 1);
assert.equal(fixedSwissProtocolPlace(27, "loser", 27, 5), 2);
assert.equal(fixedSwissProtocolPlace(25, "loser", 27, 5), 3);
assert.equal(fixedSwissProtocolPlace(26, "loser", 27, 5), 4);
assert.equal(fixedSwissProtocolPlace(21, "loser", 27, 5), 5);
assert.equal(fixedSwissProtocolPlace(17, "loser", 27, 5), 9);
assert.equal(fixedSwissProtocolPlace(13, "loser", 27, 5), 13);
assert.equal(fixedSwissProtocolPlace(12, "loser", 27, 5), null);

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

// --- 32→16 (59 встреч): нижняя тур 3–4, олимпийка с 1/8 в R3 ---
function mkGridTs32(): BracketMatchView[] {
  const template = buildFixedSwissTemplate(32);
  return template.matches.map((m) => mkMatch(m.round, m.slot));
}

assert.equal(buildFixedSwissTemplate(32).matches.length, 59);
assert.equal(inferFixedSwissGridSize(59), 32);
assert.equal(isFixedSwissTs32MatchCount(59), true);
assert.equal(isOutdatedFixedSwiss32Bracket(55), true);
assert.equal(isOutdatedFixedSwiss32Bracket(63), true);
assert.equal(fixedSwissMatchNo(2, 1, 59), 17, "lower tour 1 starts #17");
assert.equal(fixedSwissMatchNo(2, 9, 59), 25, "upper tour 1 starts #25");
assert.equal(fixedSwissMatchNo(3, 1, 59), 40, "lower tour 2 anchor #40");
assert.equal(fixedSwissMatchNo(3, 3, 59), 38);
assert.equal(fixedSwissMatchNo(3, 8, 59), 33);
assert.equal(fixedSwissMatchNo(3, 9, 59), 41, "1/8 starts #41");
assert.equal(fixedSwissMatchNo(3, 12, 59), 44);
assert.equal(fixedSwissMatchNo(3, 13, 59), 52, "lower tour 4 starts #52");
assert.equal(fixedSwissMatchNo(3, 14, 59), 51);
assert.equal(fixedSwissMatchNo(3, 15, 59), 50);
assert.equal(fixedSwissMatchNo(3, 16, 59), 49);
assert.equal(fixedSwissMatchNo(4, 1, 59), 48, "lower tour 3 starts #48");
assert.equal(fixedSwissMatchNo(4, 2, 59), 47);
assert.equal(fixedSwissMatchNo(4, 3, 59), 46);
assert.equal(fixedSwissMatchNo(4, 4, 59), 45);
assert.equal(fixedSwissMatchNo(5, 1, 59), 53, "1/4 starts #53");
assert.equal(fixedSwissMatchNo(6, 1, 59), 57, "semi starts #57");
assert.equal(fixedSwissMatchNo(7, 1, 59), 59, "final #59");
assert.equal(fixedSwissTs32MatchCol(3, 9), 2, "#41 in 1/8 column");
assert.equal(fixedSwissTs32MatchCol(3, 13), -4, "tour 4 column");
assert.equal(fixedSwissTs32MatchCol(4, 1), -3, "tour 3 column");
assert.equal(fixedSwissTs32MatchCol(4, 4), -3, "tour 3 column");
assert.equal(fixedSwissTs32MatchCol(5, 1), 3, "1/4 column");
assert.equal(fixedSwissTs32PlacementByMatchNo(17, false), "место 25–32");
assert.equal(fixedSwissTs32PlacementByMatchNo(41, false), null, "1/8 #41–#44 без места");
assert.equal(fixedSwissTs32PlacementByMatchNo(45, false), "место 13–16");
assert.equal(fixedSwissTs32PlacementByMatchNo(50, false), "место 9–12");
assert.equal(fixedSwissTs32PlacementByMatchNo(51, false), "место 9–12");
assert.equal(fixedSwissTs32PlacementByMatchNo(53, false), "место 5–8");
assert.equal(fixedSwissTs32PlacementByMatchNo(57, false), "место 3–4");

{
  const links32 = buildFixedSwissTemplate(32).links;
  const win41 = links32.find(
    (l) => l.fromRound === 3 && l.fromSlot === 9 && l.kind === "win",
  );
  assert.equal(win41?.toRound, 5, "#41 winner → 1/4");
  assert.equal(win41?.toSlot, 1, "#41 → #53 team1");
  assert.equal(
    links32.find((l) => l.fromRound === 3 && l.fromSlot === 15 && l.kind === "win")
      ?.toSlot,
    1,
    "#50 → #53",
  );
  assert.equal(
    links32.find((l) => l.fromRound === 3 && l.fromSlot === 16 && l.kind === "win")
      ?.toSlot,
    2,
    "#49 → #54",
  );
  assert.equal(
    links32.find((l) => l.fromRound === 3 && l.fromSlot === 13 && l.kind === "win")
      ?.toSlot,
    3,
    "#52 → #55",
  );
  assert.equal(
    links32.find((l) => l.fromRound === 3 && l.fromSlot === 14 && l.kind === "win")
      ?.toSlot,
    4,
    "#51 → #56",
  );
  const win25 = links32.find(
    (l) => l.fromRound === 2 && l.fromSlot === 9 && l.kind === "win",
  );
  const win26 = links32.find(
    (l) => l.fromRound === 2 && l.fromSlot === 10 && l.kind === "win",
  );
  assert.equal(win25?.toSlot, 9, "#25 → #41");
  assert.equal(win25?.toTeam, 1);
  assert.equal(win26?.toSlot, 9, "#26 → #41");
  assert.equal(win26?.toTeam, 2);
  assert.equal(
    links32.find((l) => l.fromRound === 2 && l.fromSlot === 11 && l.kind === "win")
      ?.toSlot,
    10,
    "#27 → #42",
  );
  assert.equal(
    links32.find((l) => l.fromRound === 2 && l.fromSlot === 15 && l.kind === "win")
      ?.toSlot,
    12,
    "#31 → #44",
  );
  const cross1 = links32.find(
    (l) => l.fromRound === 3 && l.fromSlot === 1 && l.kind === "win",
  );
  assert.equal(cross1?.toRound, 4, "cross → lower tour 3");
  assert.equal(cross1?.toSlot, 1);
  assert.equal(
    links32.find((l) => l.fromRound === 4 && l.fromSlot === 1 && l.kind === "win")
      ?.toSlot,
    13,
    "#48 winner → #52",
  );
}

const layout32 = buildFixedSwissBracketLayout(mkGridTs32());
assert.equal(layout32.minCol, -4);
assert.equal(layout32.maxCol, 5);
assert.equal(layout32.matchNumbers.get("r3s1"), 40);
assert.equal(layout32.matchNumbers.get("r3s8"), 33);
assert.equal(layout32.matchNumbers.get("r3s13"), 52);
assert.equal(layout32.matchNumbers.get("r3s16"), 49);
assert.equal(layout32.matchNumbers.get("r4s1"), 48);
assert.equal(layout32.matchNumbers.get("r4s2"), 47);
assert.equal(layout32.matchNumbers.get("r4s3"), 46);
assert.equal(layout32.matchNumbers.get("r4s4"), 45);
assert.equal(layout32.matchNumbers.get("r5s1"), 53);
assert.equal(layout32.matchNumbers.get("r5s4"), 56);
assert.equal(
  layout32.positions.get("r5s1")!.y,
  layout32.positions.get("r3s9")!.y,
  "#53 same Y as #41",
);
assert.equal(
  layout32.positions.get("r5s2")!.y,
  layout32.positions.get("r3s10")!.y,
  "#54 same Y as #42",
);
assert.equal(
  layout32.positions.get("r5s3")!.y,
  layout32.positions.get("r3s11")!.y,
  "#55 same Y as #43",
);
assert.equal(
  layout32.positions.get("r5s4")!.y,
  layout32.positions.get("r3s12")!.y,
  "#56 same Y as #44",
);
assert.equal(layout32.matchNumbers.get("r6s1"), 57);
assert.equal(layout32.matchNumbers.get("r7s1"), 59);
assert.equal(layout32.positions.get("r3s9")!.col, 2, "#41 olympic column");
assert.equal(layout32.positions.get("r4s1")!.col, -3, "#48 lower tour 3");
assert.equal(layout32.positions.get("r4s4")!.col, -3, "#45 lower tour 3");
assert.equal(layout32.positions.get("r3s13")!.col, -4, "#52 lower tour 4");
assert.equal(layout32.positions.get("r3s16")!.col, -4, "#49 lower tour 4");
assert.equal(
  layout32.positions.get("r3s9")!.y,
  (layout32.positions.get("r2s9")!.y + layout32.positions.get("r2s10")!.y) / 2,
  "#41 between #25 and #26",
);

assert.equal(fixedSwissPlacementLabel(3, 15, 7, 16, 59, 50), "место 9–12");

{
  const nums = new Set<number>();
  for (const m of buildFixedSwissTemplate(32).matches) {
    const n = fixedSwissMatchNo(m.round, m.slot, 59);
    assert.ok(!nums.has(n), `duplicate #${n}`);
    nums.add(n);
  }
  assert.equal(nums.size, 59);
  for (let i = 1; i <= 59; i++) {
    assert.ok(nums.has(i), `missing #${i}`);
  }
}

assert.equal(
  layoutTs.positions.get("r2s5")!.y,
  layoutTs.positions.get("r3s5")!.y,
  "#9/#21 same Y for short link",
);
{
  const from9 = layoutTs.positions.get("r2s5")!;
  const to21 = layoutTs.positions.get("r3s5")!;
  const fromTop = from9.y + GRID_PAD + GRID_LABEL_OFFSET;
  const toTop = to21.y + GRID_PAD + GRID_LABEL_OFFSET;
  const pts = gridFixedEdgePoints(from9, to21, 1, 1, "win", layoutTs.minCol);
  assert.equal(pts.from.y, teamDividerY(fromTop));
  assert.equal(pts.to.y, teamDividerY(toTop), "#21 entry at divider when same Y");
}

// --- 32→16 (59): SVG линии ---
assert.equal(
  shouldDrawFixedSwissWinEdge(1, 2, 2, 3, "win", 9, 9, 59),
  true,
  "#25+#26 → #41 fork",
);
assert.equal(isFixedSwissForkEdge(2, 3, 59, 9, 9), true);
assert.equal(
  shouldDrawFixedSwissWinEdge(-1, -2, 2, 3, "win", 1, 1, 59),
  true,
  "lower #17 → cross #33",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-2, -3, 3, 4, "win", 1, 1, 59),
  true,
  "cross #40+#39 → #48 fork",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-3, -4, 4, 3, "win", 1, 13, 59),
  true,
  "#48 → #52 short adjacent",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-3, -4, 4, 3, "win", 2, 14, 59),
  true,
  "#47 → #51 short adjacent",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(2, 3, 3, 5, "win", 9, 1, 59),
  true,
  "#41 → #53 short adjacent",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(2, 3, 3, 5, "win", 10, 2, 59),
  true,
  "#42 → #54 short adjacent",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, -3, 3, 4, "win", 13, 1, 59),
  false,
  "no fake #52→#48 line",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(1, -4, 2, 3, "win", 13, 13, 59),
  false,
  "upper → tour 4: only footer",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, 3, 3, 5, "win", 14, 4, 59),
  false,
  "#51 → #56: only footer",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, 3, 3, 5, "win", 15, 1, 59),
  false,
  "#50 → #53: only footer",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, 3, 3, 5, "win", 16, 2, 59),
  false,
  "#49 → #54: only footer",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, 3, 3, 5, "win", 13, 3, 59),
  false,
  "#52 → #55: only footer",
);
assert.equal(isFixedSwissForkEdge(3, 5, 59), false, "no 1/8→1/4 fork bus on 32");
assert.equal(
  shouldDrawFixedSwissWinEdge(-3, -4, 4, 3, "win", 3, 15, 59),
  false,
  "no #46 → tour4 SVG",
);
assert.equal(
  layout32.positions.get("r4s3")!.y,
  (layout32.positions.get("r3s5")!.y + layout32.positions.get("r3s6")!.y) / 2,
  "lower tour 3 slot 3 between cross #37–#38",
);
assert.equal(
  layout32.positions.get("r3s15")!.col,
  -4,
  "#50 lower tour 4 column",
);
assert.equal(
  layout32.positions.get("r3s15")!.y,
  (layout32.positions.get("r3s5")!.y + layout32.positions.get("r3s6")!.y) / 2,
  "lower tour 4 slot 15 between cross #37–#38",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, 4, 4, 6, "win", 4, 1, 59),
  false,
  "lower → semi: only footer, no SVG bus",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(3, 4, 5, 6, "win", 1, 1, 59),
  true,
  "1/4 → semi",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(4, 5, 6, 7, "win", 1, 1, 59),
  true,
  "semi → final",
);
assert.equal(isFixedSwissForkEdge(6, 7, 59), true);

// --- 32→16 + бронза (60 встреч): #60 под финалом в col «Финал» ---
function mkGridTs32Bronze(): BracketMatchView[] {
  const template = buildFixedSwissTemplate(32, "FIXED_SWISS_32_BRONZE");
  return template.matches.map((m) => mkMatch(m.round, m.slot));
}

assert.equal(buildFixedSwissTemplate(32, "FIXED_SWISS_32_BRONZE").matches.length, 60);
assert.equal(isFixedSwissTs32BronzeMatchCount(60), true);
assert.equal(fixedSwissMatchNo(7, 1, 60), 59, "final #59");
assert.equal(fixedSwissMatchNo(7, 2, 60), 60, "bronze #60");
assert.equal(fixedSwissTs32PlacementByMatchNo(60, true), "матч за 3–4 место");
assert.equal(fixedSwissTs32PlacementByMatchNo(57, true), "полуфинал");
assert.equal(fixedSwissProtocolPlace(60, "winner", 60), 3);
assert.equal(fixedSwissProtocolPlace(60, "loser", 60), 4);
{
  const links60 = buildFixedSwissTemplate(32, "FIXED_SWISS_32_BRONZE").links;
  const semiLoss = links60.find(
    (l) => l.fromRound === 6 && l.fromSlot === 1 && l.kind === "loss",
  );
  assert.equal(semiLoss?.toRound, 7);
  assert.equal(semiLoss?.toSlot, 2, "#57 loser → #60");
}
const layout32Bronze = buildFixedSwissBracketLayout(mkGridTs32Bronze());
{
  const fin = layout32Bronze.positions.get("r7s1")!;
  const bronze = layout32Bronze.positions.get("r7s2")!;
  assert.equal(fin.col, 5, "final in «Финал» column");
  assert.equal(bronze.col, 5, "bronze in same column as final");
  assert.equal(
    bronze.y,
    fin.y + FIXED_SWISS_CARD_H + 12,
    "#60 directly under #59",
  );
}
assert.equal(layout32Bronze.matchNumbers.get("r7s2"), 60);

console.log("fixed swiss layout tests passed");
