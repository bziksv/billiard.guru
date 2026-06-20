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
  fixedSwissColumnGutter,
  fixedSwissR12TrunkYByTarget,
  FIXED_SWISS_BRACKET_UNIT,
  FIXED_SWISS_CARD_H,
  FIXED_SWISS_COL_W,
  fixedSwissMatchCardHeight,
  fixedSwissFooterDestLabel,
  shouldDrawFixedSwissLossEdge,
  shouldDrawFixedSwissWinEdge,
  shouldAutoAdvanceFixedSwissLink,
  isFixedSwissWinLinkFooterOnly,
  isFixedSwissCrossAtSourceYEdge,
  isFixedSwissQuarterSemiWinEdge,
  isFixedSwissRound12Edge,
  isFixedSwissRound23Edge,
  isFixedSwissForkEdge,
  isFixedSwissSemiFinalForkEdge,
  fixedSwissPlacementLabel,
  fixedSwissEdgeFromY,
  fixedSwissEdgeToY,
  fixedSwissTs28PlacementByMatchNo,
  fixedSwissTs32MatchCol,
  fixedSwissTs32PlacementByMatchNo,
  fixedSwissTs32R8ElimPlacementByMatchNo,
  fixedSwissTs64MatchCol,
  fixedSwissTs64ColumnLabel,
  fixedSwissTs64PlacementByMatchNo,
  fixedSwissMatchColForCount,
  fixedSwissColumnLabel,
  fixedSwissTs128R8MatchCol,
  fixedSwissTs128R8ElimPlacementByMatchNo,
  fixedSwissTs128MatchCol,
  isFixedSwissTs128R8LowerTour6FooterWinEdge,
} from "../src/lib/fixed-swiss-layout";
import {
  buildFixedSwissTemplate,
  buildFixedSwissTsBronzeTemplate,
  fixedSwiss168MatchNo,
  fixedSwissMatchNo,
  fixedSwissTsBronzeMatchNo,
  fixedSwissTsMatchNo,
  fixedSwissProtocolPlace,
  getFixedSwissLinksForMatchCount,
  inferFixedSwissGridSize,
  isFixedSwiss168LegacyMatchCount,
  isFixedSwiss168MatchCount,
  isFixedSwissTsBronzeMatchCount,
  isFixedSwissTsLegacy29MatchCount,
  isFixedSwissTsMatchCount,
  isFixedSwissTs32MatchCount,
  isFixedSwissTs32BronzeMatchCount,
  isFixedSwissTs64MatchCount,
  isFixedSwissTs64BronzeMatchCount,
  isOutdatedFixedSwiss32Bracket,
} from "../src/lib/fixed-swiss-grid";
import {
  fixedSwissTs64StageByMatchNo,
  fixedSwissTs128R8EighthDisplaySlot,
  fixedSwissTs128R8LowerTour4DisplaySlot,
  fixedSwissTs128R8LowerTour5FromMatchNo,
} from "../src/lib/fixed-swiss-ts-grid";
import {
  assertFixedSwissTs256R1Routing,
  assertFixedSwissTs256Tour1Routing,
  assertFixedSwissTs256Tour2Routing,
  assertFixedSwissTs256Tour3Routing,
  assertFixedSwissTs256Tour4Routing,
  assertFixedSwissTs256Tour5Routing,
  FIXED_SWISS_TS256R16_MATCH_COUNT,
  fixedSwissTs256LowerTour4WinMatchNo,
  fixedSwissTs256LowerTour6MatchNo,
  fixedSwissTs256UpperTour2WinMatchNo,
  fixedSwissTs256UpperTour1LossMatchNo,
  fixedSwissTs256UpperTour2LossMatchNo,
  fixedSwissTs256UpperTour3LossMatchNo,
  fixedSwissTs256LowerTour6WinTarget,
  fixedSwissTs256LowerTour2LossMatchNo,
  fixedSwissTs256LowerTour3LossMatchNo,
  fixedSwissTs256R16PlacementByMatchNo,
} from "../src/lib/fixed-swiss-ts-256r8-grid";
import {
  isVoidFixedSwissCrossMatch,
  isRoundOneByeSlot,
} from "../src/lib/fixed-swiss-cross-bye";
import {
  GRID_LABEL_OFFSET,
  GRID_PAD,
  GRID_ROW_H,
  incomingAutopassPhantomSlot,
  isIncomingAutopassPhantomForTeam,
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
assert.equal(
  buildFixedSwissTemplate(16, "FIXED_SWISS_16R4_1_3_mesto").matches.length,
  28,
  "FIXED_SWISS_16R4_1_3_mesto: та же сетка 28",
);
assert.equal(
  buildFixedSwissTemplate(16, "FIXED_SWISS_16R4_2_3_mesta").matches.length,
  27,
  "FIXED_SWISS_16R4_2_3_mesta: та же сетка 27",
);
assert.equal(
  buildFixedSwissTemplate(8, "FIXED_SWISS_8R4_1_3_mesto").matches.length,
  14,
  "FIXED_SWISS_8R4_1_3_mesto: 14 встреч",
);
assert.equal(inferFixedSwissGridSize(14), 8);
assert.equal(inferFixedSwissGridSize(13), 8);
assert.equal(isFixedSwissTsBronzeMatchCount(14), true);
assert.equal(fixedSwissMatchNo(4, 2, 14, 4), 14, "#14 bronze");
assert.equal(fixedSwissMatchNo(4, 1, 14, 4), 13, "#13 final");
assert.equal(
  isFixedSwissQuarterSemiWinEdge(3, 3, 4, 1, 14, 4),
  true,
  "8→4: #11 → #13",
);
assert.equal(
  isFixedSwissQuarterSemiWinEdge(3, 4, 4, 1, 14, 4),
  true,
  "8→4: #12 → #13",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(2, 3, 3, 4, "win", 3, 1, 14, 4),
  true,
  "8→4 SVG: #11 → #13",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(2, 3, 3, 4, "win", 4, 1, 14, 4),
  true,
  "8→4 SVG: #12 → #13",
);
{
  const links8bronze = buildFixedSwissTemplate(
    8,
    "FIXED_SWISS_8R4_1_3_mesto",
  ).links.filter((l) => l.kind === "loss" && l.toRound === 4 && l.toSlot === 2);
  assert.equal(links8bronze.length, 2, "8→4 bronze: два loss → #14");
  assert.equal(
    fixedSwissMatchNo(links8bronze[0]!.fromRound, links8bronze[0]!.fromSlot, 14, 4),
    11,
    "8→4: #11 loser → #14",
  );
  assert.equal(
    fixedSwissMatchNo(links8bronze[1]!.fromRound, links8bronze[1]!.fromSlot, 14, 4),
    12,
    "8→4: #12 loser → #14",
  );
}
assertProtocolPlace(13, "loser", 14, { place: 2 }, 4);
assertProtocolPlace(14, "winner", 14, { place: 3 }, 4);
assertProtocolPlace(14, "loser", 14, { place: 4 }, 4);
assertProtocolPlace(11, "loser", 14, null, 4);
assertProtocolPlace(12, "loser", 14, null, 4);
assert.equal(buildFixedSwissTsBronzeTemplate().matches.length, 28);
assert.equal(inferFixedSwissGridSize(27), 16);
assert.equal(inferFixedSwissGridSize(28), 16);
assert.equal(fixedSwissProtocolPlace(25, "loser", 27, 5)?.place, 3);
assert.equal(fixedSwissProtocolPlace(26, "loser", 27, 5)?.place, 3);
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

function assertProtocolPlace(
  matchNo: number,
  role: "winner" | "loser",
  matchCount: number,
  expected: { place: number; placeTo?: number } | null,
  maxRound?: number,
) {
  assert.deepEqual(
    fixedSwissProtocolPlace(matchNo, role, matchCount, maxRound),
    expected,
  );
}

assertProtocolPlace(27, "winner", 28, { place: 1 });
assertProtocolPlace(27, "loser", 28, { place: 2 });
assertProtocolPlace(28, "winner", 28, { place: 3 });
assertProtocolPlace(28, "loser", 28, { place: 4 });
assertProtocolPlace(25, "loser", 28, null);
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
  "3-е место",
  "semi #25 by round/slot",
);
assert.equal(
  fixedSwissPlacementLabel(4, 1, 6, 8, 27, 25),
  "3-е место",
  "card #25 must not map to legacy #23 when maxRound is 6",
);
assert.equal(fixedSwissPlacementLabel(3, 5, 5, 8, 27, 21), "место 5–8");

assertProtocolPlace(27, "winner", 27, { place: 1 }, 5);
assertProtocolPlace(27, "loser", 27, { place: 2 }, 5);
assertProtocolPlace(25, "loser", 27, { place: 3 }, 5);
assertProtocolPlace(26, "loser", 27, { place: 3 }, 5);
assertProtocolPlace(21, "loser", 27, { place: 5, placeTo: 8 }, 5);
assertProtocolPlace(17, "loser", 27, { place: 9, placeTo: 12 }, 5);
assertProtocolPlace(13, "loser", 27, { place: 13, placeTo: 16 }, 5);
assertProtocolPlace(12, "loser", 27, null, 5);

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
  const pts = gridFixedEdgePoints(
    fromPos,
    toPos,
    1,
    1,
    "win",
    layoutTs.minCol,
    layoutTs.cardDisplay,
  );
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
assert.equal(isFixedSwissForkEdge(1, 2), true, "R1→R2 fork (#1+#2→#49, #3+#4→#50)");
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
assert.equal(shouldDrawFixedSwissLossEdge(1, -2, false, 2, 3), false, "#49 → #65: only footer");
assert.equal(
  shouldDrawFixedSwissLossEdge(1, -2, false, 2, 3, 496, 10),
  false,
  "256 UT1 loss: only footer",
);
assert.equal(fixedSwissFooterDestLabel("loss", 272, 1), "проигравший на #272");
assert.equal(fixedSwissFooterDestLabel("win", 321, 1), "победитель на #321");
assert.equal(fixedSwissFooterDestLabel("win", 258, -1), "победитель на #258");
assert.equal(shouldDrawFixedSwissLossEdge(0, -2, false, 2, 3), false);

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
  laneKey = 0,
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
    laneKey,
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
  list.push({
    id,
    y: pos.y,
    h: layoutTs.cardHeights?.get(id) ?? cardH,
  });
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
  (mpr - 1) * FIXED_SWISS_BRACKET_UNIT + 4 + cardH,
);

// --- 32→16 (59 встреч): нижняя тур 3–4, олимпийка с 1/8 в R3 ---
function mkGridTs32(): BracketMatchView[] {
  const template = buildFixedSwissTemplate(32);
  return template.matches.map((m) => mkMatch(m.round, m.slot));
}

assert.equal(buildFixedSwissTemplate(32).matches.length, 59);
assert.equal(
  buildFixedSwissTemplate(12, "FIXED_SWISS_32R4_2_3_mesta").matches.length,
  59,
  "FIXED_SWISS_32R4_2_3_mesta: та же сетка 59",
);
assert.equal(
  buildFixedSwissTemplate(12, "FIXED_SWISS_32R4_1_3_mesto").matches.length,
  60,
);
assert.equal(
  buildFixedSwissTemplate(12, "FIXED_SWISS_32").matches.length,
  59,
  "legacy FIXED_SWISS_32 — та же сетка 59",
);
assert.equal(
  buildFixedSwissTemplate(12, "FIXED_SWISS_32R8").matches.length,
  59,
  "legacy FIXED_SWISS_32R8: oлимпийka с 1/8",
);
assert.equal(
  buildFixedSwissTemplate(12, "FIXED_SWISS_32R8_2_3_mesta").matches.length,
  55,
  "FIXED_SWISS_32R8_2_3_mesta: 1/8, вылет с 1/8 на места 9–12",
);
const r8ElimLinks = buildFixedSwissTemplate(12, "FIXED_SWISS_32R8_2_3_mesta").links;
assert.equal(
  r8ElimLinks.some((l) => l.kind === "loss" && l.fromRound === 3 && l.fromSlot === 9),
  false,
  "R8_2_3: нет loss с 1/8 в нижнюю ветку",
);
assert.equal(
  buildFixedSwissTemplate(12, "FIXED_SWISS_32R8_BRONZE").matches.length,
  60,
);
assert.equal(inferFixedSwissGridSize(59), 32);
assert.equal(isFixedSwissTs32MatchCount(59), true);
assert.equal(isOutdatedFixedSwiss32Bracket(55), true);
assert.equal(isOutdatedFixedSwiss32Bracket(55, 7), false);
assert.equal(isOutdatedFixedSwiss32Bracket(56, 7), false);
assert.equal(
  buildFixedSwissTemplate(12, "FIXED_SWISS_32R8_1_3_mesto").matches.length,
  56,
  "FIXED_SWISS_32R8_1_3_mesto: R8_2_3 + матч за 3–4",
);
assertProtocolPlace(53, "loser", 55, { place: 5, placeTo: 8 }, 7);
assertProtocolPlace(57, "loser", 55, { place: 3 }, 7);
assertProtocolPlace(58, "loser", 55, { place: 3 }, 7);
assertProtocolPlace(54, "loser", 55, { place: 5, placeTo: 8 }, 7);
assertProtocolPlace(60, "winner", 56, { place: 3 }, 7);
assertProtocolPlace(60, "loser", 56, { place: 4 }, 7);
assert.equal(
  fixedSwissTs32R8ElimPlacementByMatchNo(60, true),
  "матч за 3–4 место",
);
assert.equal(
  fixedSwissTs32R8ElimPlacementByMatchNo(57, true),
  "полуфинал",
);
assert.equal(
  fixedSwissPlacementLabel(3, 9, 6, 16, 55, 41),
  null,
  "R8_2_3: maxRound 6 не должен показывать место на 1/8",
);
assert.equal(
  fixedSwissPlacementLabel(3, 9, 7, 16, 55, 41),
  "место 9–12",
  "R8_2_3: maxRound 7 — вылет с 1/8",
);
assert.equal(fixedSwissMatchNo(3, 9, 55, 7), 41, "R8_2_3: #41 на 1/8");
// --- 32→16 R8 elim (55/7): SVG линии как у 59 ---
const MC55R8 = 55;
const MR7 = 7;
assert.equal(
  shouldDrawFixedSwissWinEdge(2, 3, 3, 5, "win", 9, 1, MC55R8, MR7),
  true,
  "R8 #41 → #53",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(4, 5, 6, 7, "win", 1, 1, MC55R8, MR7),
  true,
  "R8 #57 → #59",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(3, 4, 5, 6, "win", 3, 2, MC55R8, MR7),
  true,
  "R8 #55 → #58",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(3, 4, 5, 6, "win", 4, 2, MC55R8, MR7),
  true,
  "R8 #56 → #58",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-1, -2, 2, 3, "win", 8, 1, MC55R8, MR7),
  true,
  "R8 #24 → #33",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-2, -3, 3, 4, "win", 1, 1, MC55R8, MR7),
  true,
  "R8 #33 → #45",
);
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
assert.equal(fixedSwissTs32PlacementByMatchNo(57, false), "3-е место");
assert.equal(fixedSwissTs32PlacementByMatchNo(58, false), "3-е место");
assertProtocolPlace(57, "loser", 59, { place: 3 });
assertProtocolPlace(58, "loser", 59, { place: 3 });

{
  const links32 = buildFixedSwissTemplate(32).links;
  const win41 = links32.find(
    (l) => l.fromRound === 3 && l.fromSlot === 9 && l.kind === "win",
  );
  assert.equal(win41?.toRound, 5, "#41 winner → 1/4");
  assert.equal(win41?.toSlot, 1, "#41 → #53 team1");
  const loss41 = links32.find(
    (l) => l.fromRound === 3 && l.fromSlot === 9 && l.kind === "loss",
  );
  assert.equal(loss41?.toRound, 3, "#41 loser → lower tour 4");
  assert.equal(loss41?.toSlot, 15, "#41 loser → #50");
  assert.equal(loss41?.toTeam, 1);
  assert.equal(
    links32.find((l) => l.fromRound === 3 && l.fromSlot === 15 && l.kind === "win")
      ?.toSlot,
    4,
    "#50 → #56",
  );
  assert.equal(
    links32.find((l) => l.fromRound === 3 && l.fromSlot === 16 && l.kind === "win")
      ?.toSlot,
    3,
    "#49 → #55",
  );
  assert.equal(
    links32.find((l) => l.fromRound === 3 && l.fromSlot === 13 && l.kind === "win")
      ?.toSlot,
    2,
    "#52 → #54",
  );
  assert.equal(
    links32.find((l) => l.fromRound === 3 && l.fromSlot === 14 && l.kind === "win")
      ?.toSlot,
    1,
    "#51 → #53",
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
  const win48 = links32.find(
    (l) => l.fromRound === 4 && l.fromSlot === 1 && l.kind === "win",
  );
  assert.equal(win48?.toSlot, 13, "#48 winner → #52");
  assert.equal(win48?.toTeam, 2, "#48 → #52 team2");
  const win47 = links32.find(
    (l) => l.fromRound === 4 && l.fromSlot === 2 && l.kind === "win",
  );
  assert.equal(win47?.toSlot, 14, "#47 winner → #51");
  assert.equal(win47?.toTeam, 2, "#47 → #51 team2");
  assert.equal(
    links32.find((l) => l.fromRound === 4 && l.fromSlot === 3 && l.kind === "win")
      ?.toSlot,
    15,
    "#46 winner → #50",
  );
  assert.equal(
    links32.find((l) => l.fromRound === 4 && l.fromSlot === 4 && l.kind === "win")
      ?.toSlot,
    16,
    "#45 winner → #49",
  );
  const loss42 = links32.find(
    (l) => l.fromRound === 3 && l.fromSlot === 10 && l.kind === "loss",
  );
  assert.equal(loss42?.toSlot, 16, "#42 loser → #49");
  assert.equal(loss42?.toTeam, 1, "#42 loser → #49 team1");
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
  shouldDrawFixedSwissWinEdge(-3, -4, 4, 3, "win", 3, 15, 59),
  true,
  "#46 → #50 short adjacent",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-3, -4, 4, 3, "win", 4, 16, 59),
  true,
  "#45 → #49 short adjacent",
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
  shouldDrawFixedSwissWinEdge(-4, 3, 3, 5, "win", 14, 1, 59),
  false,
  "#51 → #53: only footer",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, 3, 3, 5, "win", 15, 4, 59),
  false,
  "#50 → #56: only footer",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, 3, 3, 5, "win", 16, 3, 59),
  false,
  "#49 → #55: only footer",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, 3, 3, 5, "win", 13, 2, 59),
  false,
  "#52 → #54: only footer",
);
assert.equal(isFixedSwissForkEdge(3, 5, 59), false, "no 1/8→1/4 fork bus on 32");
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
  const template = buildFixedSwissTemplate(32, "FIXED_SWISS_32R8_BRONZE");
  return template.matches.map((m) => mkMatch(m.round, m.slot));
}

assert.equal(buildFixedSwissTemplate(32, "FIXED_SWISS_32R8_BRONZE").matches.length, 60);
assert.equal(isFixedSwissTs32BronzeMatchCount(60), true);
assert.equal(fixedSwissMatchNo(7, 1, 60), 59, "final #59");
assert.equal(fixedSwissMatchNo(7, 2, 60), 60, "bronze #60");
assert.equal(fixedSwissTs32PlacementByMatchNo(60, true), "матч за 3–4 место");
assert.equal(fixedSwissTs32PlacementByMatchNo(57, true), "полуфинал");
assertProtocolPlace(60, "winner", 60, { place: 3 });
assertProtocolPlace(60, "loser", 60, { place: 4 });
assertProtocolPlace(53, "loser", 60, { place: 5, placeTo: 8 });
assertProtocolPlace(49, "loser", 60, { place: 9, placeTo: 12 });
assertProtocolPlace(45, "loser", 60, { place: 13, placeTo: 16 });
assertProtocolPlace(33, "loser", 60, { place: 17, placeTo: 24 });
assertProtocolPlace(17, "loser", 60, { place: 25, placeTo: 32 });
{
  const links60 = buildFixedSwissTemplate(32, "FIXED_SWISS_32R8_BRONZE").links;
  const semiLoss = links60.find(
    (l) => l.fromRound === 6 && l.fromSlot === 1 && l.kind === "loss",
  );
  assert.equal(semiLoss?.toRound, 7);
  assert.equal(semiLoss?.toSlot, 2, "#57 loser → #60");
}
const layout32Bronze = buildFixedSwissBracketLayout(mkGridTs32Bronze());
const compactH = fixedSwissMatchCardHeight(false, 0);
const compactNoMetaH = fixedSwissMatchCardHeight(false, 0, false);
{
  const layoutCompact = buildFixedSwissBracketLayout(mkGridTs32Bronze(), {
    showCardHandicap: false,
    showCardPlacement: false,
  });
  const full = layout32Bronze.positions.get("r1s1")!;
  const compact1 = layoutCompact.positions.get("r1s1")!;
  const compact2 = layoutCompact.positions.get("r1s2")!;
  assert.ok(
    layoutCompact.cardHeights?.get("r1s1") === compactH,
    "compact card height without footer/handicap",
  );
  assert.equal(
    compact2.y - compact1.y,
    compactH + 8,
    "round 1 slots stack by compact card height",
  );
  assert.ok(
    compact2.y - full.y < (layout32Bronze.positions.get("r1s2")!.y - full.y) - 1,
    "compact layout tighter than full",
  );
}
{
  const layoutNoMeta = buildFixedSwissBracketLayout(mkGridTs32Bronze(), {
    showCardMatchNumber: false,
    showCardHandicap: false,
    showCardPlacement: false,
  });
  const noMeta1 = layoutNoMeta.positions.get("r1s1")!;
  const noMeta2 = layoutNoMeta.positions.get("r1s2")!;
  assert.ok(
    layoutNoMeta.cardHeights?.get("r1s1") === compactNoMetaH,
    "card height without match number row",
  );
  assert.equal(
    noMeta2.y - noMeta1.y,
    compactNoMetaH + 8,
    "round 1 slots stack by height without meta row",
  );
  assert.ok(
    compactNoMetaH < compactH,
    "hiding match number shrinks card",
  );
}
{
  const layoutNoMeta = buildFixedSwissBracketLayout(mkGridTs32Bronze(), {
    showCardMatchNumber: false,
    showCardHandicap: false,
    showCardPlacement: false,
  });
  const fromPos = layoutNoMeta.positions.get("r1s1")!;
  const toPos = layoutNoMeta.positions.get("r2s1")!;
  const fromTop = fromPos.y + GRID_PAD + GRID_LABEL_OFFSET;
  const pts = gridFixedEdgePoints(
    fromPos,
    toPos,
    1,
    1,
    "win",
    layoutNoMeta.minCol,
    layoutNoMeta.cardDisplay,
  );
  assert.equal(
    pts.from.y,
    fromTop + GRID_ROW_H,
    "compact layout: line exits at divider without meta row",
  );
  assert.notEqual(
    pts.from.y,
    teamDividerY(fromTop),
    "compact layout: not offset by hidden meta row",
  );
}
{
  const fin = layout32Bronze.positions.get("r7s1")!;
  const bronze = layout32Bronze.positions.get("r7s2")!;
  const finH = layout32Bronze.cardHeights?.get("r7s1") ?? FIXED_SWISS_CARD_H;
  const bronzeH = layout32Bronze.cardHeights?.get("r7s2") ?? FIXED_SWISS_CARD_H;
  assert.equal(fin.col, 5, "final in «Финал» column");
  assert.equal(bronze.col, 5, "bronze in same column as final");
  assert.equal(
    bronze.y,
    fin.y + finH + 12,
    "#60 directly under #59 (actual final card height)",
  );
  assert.ok(
    bronze.y >= fin.y + finH + 12 - 0.01,
    "#60 does not overlap #59",
  );
  assert.ok(
    fin.y + finH + 12 <= bronze.y + 0.01,
    "gap between #59 and #60",
  );
  assert.ok(
    bronze.y >= fin.y + finH - 0.01,
    "bronze starts below final bottom edge",
  );
}
{
  const player = (id: string, rating: number) => ({
    id,
    player1: { id: `${id}-p`, firstName: "A", lastName: "B", rating },
    player2: null,
  });
  const finalWithHandicap: BracketMatchView = {
    ...mkMatch(7, 1),
    team1: player("t1", 1.5),
    team2: player("t2", 3),
  };
  const gridFinal = mkGridTs32Bronze().map((m) =>
    m.id === "r7s1" ? finalWithHandicap : m,
  );
  const layoutFinal = buildFixedSwissBracketLayout(gridFinal);
  const fin = layoutFinal.positions.get("r7s1")!;
  const bronze = layoutFinal.positions.get("r7s2")!;
  const finH = layoutFinal.cardHeights?.get("r7s1") ?? FIXED_SWISS_CARD_H;
  assert.ok(
    finH > FIXED_SWISS_CARD_H,
    "final with handicap is taller than compact base",
  );
  assert.equal(bronze.y, fin.y + finH + 12, "bronze offset uses tall final height");
}
assert.equal(layout32Bronze.matchNumbers.get("r7s2"), 60);

// --- 64→32 (115/116 встреч; legacy 111/112/114) ---
function mkGridTs64(): BracketMatchView[] {
  const template = buildFixedSwissTemplate(64, "FIXED_SWISS_64");
  return template.matches.map((m) => mkMatch(m.round, m.slot));
}

assert.equal(buildFixedSwissTemplate(64, "FIXED_SWISS_64").matches.length, 119);
assert.equal(buildFixedSwissTemplate(64, "FIXED_SWISS_64_BRONZE").matches.length, 120);
assert.equal(inferFixedSwissGridSize(119), 64);
assert.equal(inferFixedSwissGridSize(115), 64, "legacy 115");
assert.equal(inferFixedSwissGridSize(114), 64, "legacy 114");
assert.equal(inferFixedSwissGridSize(111), 64, "legacy 111");
assert.equal(isFixedSwissTs64MatchCount(119), true);
assert.equal(isFixedSwissTs64MatchCount(115), true, "legacy 115");
assert.equal(isFixedSwissTs64BronzeMatchCount(120), true);
assert.equal(isFixedSwissTs64BronzeMatchCount(116), true, "legacy 116");
const MC64 = 119;
assert.equal(fixedSwissMatchNo(1, 1, MC64), 1, "first tour #1");
assert.equal(fixedSwissMatchNo(1, 32, MC64), 32);
assert.equal(fixedSwissMatchNo(2, 1, MC64), 33, "lower tour 1 #33");
assert.equal(fixedSwissMatchNo(2, 16, MC64), 48);
assert.equal(fixedSwissMatchNo(2, 17, MC64), 49, "upper tour 1 #49");
assert.equal(fixedSwissMatchNo(2, 32, MC64), 64);
assert.equal(fixedSwissMatchNo(3, 1, MC64), 80, "lower tour 2 #80");
assert.equal(fixedSwissMatchNo(3, 8, MC64), 73, "lower tour 2 #73");
assert.equal(fixedSwissMatchNo(3, 9, MC64), 72, "lower tour 2 #72");
assert.equal(fixedSwissMatchNo(3, 12, MC64), 69, "lower tour 2 #69");
assert.equal(fixedSwissMatchNo(3, 13, MC64), 68, "lower tour 2 #68");
assert.equal(fixedSwissMatchNo(3, 16, MC64), 65, "lower tour 2 #65");
assert.equal(fixedSwissMatchNo(3, 33, MC64), 81, "upper tour 2 #81");
assert.equal(fixedSwissMatchNo(3, 36, MC64), 84, "upper tour 2 #84");
assert.equal(fixedSwissMatchNo(3, 21, MC64), 85, "upper tour 2 #85");
assert.equal(fixedSwissMatchNo(3, 24, MC64), 88, "upper tour 2 #88");
for (let n = 81; n <= 88; n++) {
  let found = false;
  for (let slot = 1; slot <= 36; slot++) {
    if (fixedSwissMatchNo(3, slot, MC64) === n) found = true;
  }
  assert.ok(found, `upper tour 2 must include #${n}`);
}
for (let n = 65; n <= 80; n++) {
  let found = false;
  for (let slot = 1; slot <= 16; slot++) {
    if (fixedSwissMatchNo(3, slot, MC64) === n) found = true;
  }
  assert.ok(found, `lower tour 2 must include #${n}`);
}
assert.equal(fixedSwissMatchNo(3, 17, MC64), 113, "1/8 #113 (→ from #105/#106)");
assert.equal(fixedSwissMatchNo(3, 18, MC64), 114, "1/8 #114 (→ from #107/#108)");
assert.equal(fixedSwissMatchNo(3, 19, MC64), 115, "1/8 #115 (→ from #109/#110)");
assert.equal(fixedSwissTs64MatchCol(3, 18), 4, "#114 in 1/8 column");
assert.equal(fixedSwissTs64MatchCol(3, 19), 4, "#115 in 1/8 column");
assert.equal(fixedSwissMatchNo(3, 20, MC64), 116, "1/8 #116 (→ from #111/#112)");
assert.equal(fixedSwissMatchNo(3, 9, MC64), 72, "lower tour 2 #72");
assert.equal(fixedSwissMatchNo(3, 12, MC64), 69, "lower tour 2 #69");
assert.equal(fixedSwissMatchNo(4, 5, MC64), 92, "lower tour 3 R4 #92");
assert.equal(fixedSwissTs64MatchCol(3, 9), -2, "#72 in lower tour 2 column");
assert.equal(fixedSwissTs64MatchCol(3, 16), -2, "#65 in lower tour 2 column");
assert.equal(fixedSwissTs64MatchCol(3, 33), 2, "#81 in upper tour 2 column");
assert.equal(fixedSwissTs64MatchCol(3, 21), 2, "#85 in upper tour 2 column");
assert.equal(fixedSwissTs64StageByMatchNo(1), "Первый тур");
assert.equal(fixedSwissTs64StageByMatchNo(92), "Нижняя, тур 3");
assert.equal(fixedSwissTs64StageByMatchNo(118), "Полуфинал");
assert.equal(fixedSwissTs64StageByMatchNo(117), "Полуфинал");
assert.equal(fixedSwissTs64StageByMatchNo(113), "1/4 финала");
assert.equal(fixedSwissTs64StageByMatchNo(105), "Верхняя, тур 3 · 1/8");
assert.equal(fixedSwissTs64ColumnLabel(3), "Верхняя, тур 3 · 1/8");
assert.equal(fixedSwissTs64ColumnLabel(5), "Полуфинал");
assert.equal(fixedSwissMatchNo(7, 1, MC64), 119, "only final is #119");
{
  const links115 = getFixedSwissLinksForMatchCount(MC64);
  const win85Link = links115.find(
    (l) => l.fromRound === 3 && l.fromSlot === 21 && l.kind === "win",
  );
  assert.equal(win85Link?.toRound, 5, "#85 → #109 link");
  assert.equal(win85Link?.toSlot, 5);
  const win68 = links115.find(
    (l) => l.fromRound === 3 && l.fromSlot === 13 && l.kind === "win",
  );
  assert.equal(win68?.toRound, 4, "#68 → #90");
  assert.equal(win68?.toSlot, 7);
  const win67 = links115.find(
    (l) => l.fromRound === 3 && l.fromSlot === 14 && l.kind === "win",
  );
  assert.equal(win67?.toSlot, 7, "#67 also feeds #90");
  const win66 = links115.find(
    (l) => l.fromRound === 3 && l.fromSlot === 15 && l.kind === "win",
  );
  assert.equal(win66?.toRound, 4, "#66 → #89");
  assert.equal(win66?.toSlot, 8);
  const win65b = links115.find(
    (l) => l.fromRound === 3 && l.fromSlot === 16 && l.kind === "win",
  );
  assert.equal(win65b?.toSlot, 8, "#65 also feeds #89");
  const win87 = links115.find(
    (l) => l.fromRound === 3 && l.fromSlot === 23 && l.kind === "win",
  );
  assert.equal(win87?.toRound, 5, "#87 → #111");
  assert.equal(win87?.toSlot, 7);
  const win41 = links115.find(
    (l) => l.fromRound === 2 && l.fromSlot === 9 && l.kind === "win",
  );
  assert.equal(win41?.toSlot, 9, "#41 winner → #72 (R3 slot 9)");
  const win42 = links115.find(
    (l) => l.fromRound === 2 && l.fromSlot === 10 && l.kind === "win",
  );
  assert.equal(win42?.toSlot, 10, "#42 winner → #71");
  const loss49 = links115.find(
    (l) => l.fromRound === 2 && l.fromSlot === 17 && l.kind === "loss",
  );
  assert.equal(loss49?.toSlot, 16, "#49 loser → #65");
  const loss50 = links115.find(
    (l) => l.fromRound === 2 && l.fromSlot === 18 && l.kind === "loss",
  );
  assert.equal(loss50?.toSlot, 15, "#50 loser → #66");
  for (let slot = 17; slot <= 32; slot++) {
    const loss = links115.find(
      (l) => l.fromRound === 2 && l.fromSlot === slot && l.kind === "loss",
    );
    assert.equal(
      loss?.toSlot,
      2 * 16 + 1 - slot,
      `upper tour 1 slot ${slot} loser → cross slot ${33 - slot}`,
    );
  }
  const win45 = links115.find(
    (l) => l.fromRound === 2 && l.fromSlot === 13 && l.kind === "win",
  );
  assert.equal(win45?.toSlot, 13, "#45 winner → #68 (R3 slot 13)");
  const win47 = links115.find(
    (l) => l.fromRound === 2 && l.fromSlot === 15 && l.kind === "win",
  );
  assert.equal(win47?.toSlot, 15, "#47 winner → #66 (R3 slot 15)");
  const win48 = links115.find(
    (l) => l.fromRound === 2 && l.fromSlot === 16 && l.kind === "win",
  );
  assert.equal(win48?.toSlot, 16, "#48 winner → #65 (R3 slot 16)");
  const win37 = links115.find(
    (l) => l.fromRound === 2 && l.fromSlot === 5 && l.kind === "win",
  );
  assert.equal(win37?.toSlot, 5, "#37 winner → #76 (R3 slot 5)");
  const win38 = links115.find(
    (l) => l.fromRound === 2 && l.fromSlot === 6 && l.kind === "win",
  );
  assert.equal(win38?.toSlot, 6, "#38 winner → #75 (R3 slot 6)");
  const win72 = links115.find(
    (l) => l.fromRound === 3 && l.fromSlot === 9 && l.kind === "win",
  );
  assert.equal(win72?.toSlot, 5, "#72 winner → #92 (R4 slot 5)");
  const win71 = links115.find(
    (l) => l.fromRound === 3 && l.fromSlot === 10 && l.kind === "win",
  );
  assert.equal(win71?.toSlot, 5, "#71 also feeds #92");
  const win92 = links115.find(
    (l) => l.fromRound === 4 && l.fromSlot === 5 && l.kind === "win",
  );
  assert.equal(win92?.toRound, 3, "#92 winner → lower tour 4");
  assert.equal(win92?.toSlot, 29, "#92 → #100 (R3 slot 29)");
}
assert.equal(
  shouldDrawFixedSwissWinEdge(-2, -3, 3, 4, "win", 9, 5, MC64),
  true,
  "#72 → #92 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-3, -4, 4, 3, "win", 5, 29, MC64),
  true,
  "#92 → #100 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-2, -3, 3, 4, "win", 13, 7, MC64),
  true,
  "#68 → #90 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-2, -3, 3, 4, "win", 14, 7, MC64),
  true,
  "#67 → #90 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-2, -3, 3, 4, "win", 15, 8, MC64),
  true,
  "#66 → #89 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-2, -3, 3, 4, "win", 16, 8, MC64),
  true,
  "#65 → #89 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-3, -4, 4, 3, "win", 8, 32, MC64),
  true,
  "#89 → #97 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-1, -2, 2, 3, "win", 13, 13, MC64),
  true,
  "#45 → #68 SVG (short adjacent)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-1, 2, 2, 3, "win", 13, 21, MC64),
  false,
  "#45 → #85: Excel footer only (no link)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-1, 2, 2, 3, "win", 14, 22, MC64),
  false,
  "#46 → #86: Excel footer only (no link)",
);
assert.equal(
  shouldAutoAdvanceFixedSwissLink(
    { fromRound: 2, fromSlot: 14, toRound: 3, toSlot: 22, kind: "win" },
    MC64,
    7,
  ),
  false,
  "#46 → #86 bridge: not in links",
);
assert.equal(
  shouldAutoAdvanceFixedSwissLink(
    { fromRound: 2, fromSlot: 13, toRound: 3, toSlot: 13, kind: "win" },
    112,
    7,
  ),
  true,
  "#45 → #68: auto-advance on save",
);
assert.equal(
  shouldAutoAdvanceFixedSwissLink(
    { fromRound: 2, fromSlot: 14, toRound: 3, toSlot: 14, kind: "win" },
    112,
    7,
  ),
  true,
  "#46 → #67: auto-advance on save",
);
assert.equal(
  shouldAutoAdvanceFixedSwissLink(
    { fromRound: 2, fromSlot: 28, toRound: 3, toSlot: 22, kind: "win" },
    MC64,
    7,
  ),
  true,
  "#60 → #86 team2: auto-advance on save",
);
assert.equal(
  shouldAutoAdvanceFixedSwissLink(
    { fromRound: 4, fromSlot: 5, toRound: 5, toSlot: 1, kind: "win" },
    112,
    7,
  ),
  true,
  "#92 lower tour 3 → #105 team2 (R8 elim direct quarter)",
);
assert.equal(
  shouldAutoAdvanceFixedSwissLink(
    { fromRound: 3, fromSlot: 29, toRound: 5, toSlot: 1, kind: "win" },
    112,
    7,
  ),
  false,
  "#100 → #105: footer only",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-1, -2, 2, 3, "win", 15, 15, MC64),
  true,
  "#47 → #66 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-1, -2, 2, 3, "win", 16, 16, MC64),
  true,
  "#48 → #65 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-1, 2, 2, 3, "win", 15, 23, MC64),
  false,
  "#47 → #87: no link",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-1, 2, 2, 3, "win", 16, 24, MC64),
  false,
  "#48 → #88: no link",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-3, -4, 4, 3, "win", 7, 31, MC64),
  true,
  "#90 → #98 SVG",
);
assert.equal(fixedSwissMatchNo(3, 5, MC64), 76, "#76 at R3 slot 5");
assert.equal(fixedSwissMatchNo(3, 6, MC64), 75, "#75 at R3 slot 6");
assert.equal(fixedSwissMatchNo(3, 21, MC64), 85, "#85 at R3 slot 21");
assert.equal(fixedSwissTs64MatchCol(3, 33), 2, "#81 in upper tour 2 column");
assert.equal(fixedSwissTs64MatchCol(3, 21), 2, "#85 in upper tour 2 column");
assert.equal(fixedSwissMatchNo(3, 24, MC64), 88, "#88 at R3 slot 24");
assert.equal(
  shouldDrawFixedSwissWinEdge(-1, -2, 2, 3, "win", 9, 21, MC64),
  true,
  "#41 → #72 SVG",
);
assert.equal(fixedSwissMatchNo(4, 1, MC64), 96, "lower tour 3 #96");
assert.equal(fixedSwissMatchNo(5, 1, MC64), 105, "upper tour 3 #105");
assert.equal(fixedSwissMatchNo(5, 5, MC64), 109);
assert.equal(fixedSwissMatchNo(5, 6, MC64), 110);
assert.equal(fixedSwissMatchNo(5, 7, MC64), 111);
assert.equal(fixedSwissMatchNo(5, 8, MC64), 112, "upper tour 3 #112 (#88)");
assert.equal(fixedSwissMatchNo(6, 1, MC64), 117, "1/4 #117");
assert.equal(fixedSwissMatchNo(6, 2, MC64), 118);
assert.equal(fixedSwissMatchNo(7, 1, MC64), 119, "final #119");
assert.equal(fixedSwissMatchNo(7, 2, 116), 120, "bronze #120");
assert.equal(fixedSwissTs64MatchCol(3, 21), 2, "upper tour 2 column");
assert.equal(fixedSwissTs64MatchCol(3, 17), 4, "1/8 column");
assert.equal(fixedSwissTs64MatchCol(4, 1), -3, "lower tour 3 column");
assert.equal(fixedSwissTs64MatchCol(5, 1), 3, "1/4 column");
assert.equal(fixedSwissTs64PlacementByMatchNo(33, false), "место 49–64");
assert.equal(fixedSwissTs64PlacementByMatchNo(81, false), null, "upper tour 2 without place range");
assert.equal(fixedSwissTs64PlacementByMatchNo(89, false), "место 25–32");
assert.equal(fixedSwissTs64PlacementByMatchNo(96, false), "место 25–32");
assert.equal(fixedSwissTs64PlacementByMatchNo(100, false), "место 17–24");
assert.equal(fixedSwissTs64PlacementByMatchNo(105, false), "место 9–16");
assert.equal(fixedSwissTs64PlacementByMatchNo(112, false), "место 9–16");
assert.equal(fixedSwissTs64PlacementByMatchNo(113, false), "место 5–8");
assert.equal(fixedSwissTs64PlacementByMatchNo(117, false), "3-е место");
assert.equal(fixedSwissTs64PlacementByMatchNo(118, false), "3-е место");
assert.equal(fixedSwissTs64PlacementByMatchNo(117, true), "полуфинал");
assertProtocolPlace(119, "winner", MC64, { place: 1 });
assertProtocolPlace(120, "winner", 116, { place: 3 });
assertProtocolPlace(105, "loser", MC64, { place: 5, placeTo: 8 });
assertProtocolPlace(97, "loser", MC64, { place: 9, placeTo: 16 });
const layout64 = buildFixedSwissBracketLayout(mkGridTs64());
assert.equal(
  layout64.positions.get("r3s9")!.y,
  layout64.positions.get("r2s9")!.y,
  "#72 on same Y as #41",
);
assert.equal(
  layout64.positions.get("r3s10")!.y,
  layout64.positions.get("r2s10")!.y,
  "#71 on same Y as #42",
);
assert.equal(layout64.positions.get("r3s9")!.col, -2, "#72 in lower tour 2 column");
assert.equal(layout64.positions.get("r3s10")!.col, -2, "#71 in lower tour 2 column");
assert.equal(
  layout64.positions.get("r3s5")!.y,
  layout64.positions.get("r2s5")!.y,
  "#76 on same Y as #37",
);
assert.equal(
  layout64.positions.get("r3s6")!.y,
  layout64.positions.get("r2s6")!.y,
  "#75 on same Y as #38",
);
assert.equal(layout64.positions.get("r3s13")!.col, -2, "#68 in lower tour 2");
assert.equal(layout64.positions.get("r3s16")!.col, -2, "#65 in lower tour 2");
assert.equal(
  layout64.positions.get("r3s13")!.y,
  layout64.positions.get("r2s13")!.y,
  "#68 same Y as #45",
);
assert.equal(
  layout64.positions.get("r3s16")!.y,
  layout64.positions.get("r2s16")!.y,
  "#65 same Y as #48",
);
assert.equal(layout64.positions.get("r3s33")!.col, 2, "#81 in upper tour 2");
assert.equal(layout64.positions.get("r3s36")!.col, 2, "#84 in upper tour 2");
assert.equal(layout64.positions.get("r3s21")!.col, 2, "#85 in upper tour 2");
assert.equal(layout64.positions.get("r3s24")!.col, 2, "#88 in upper tour 2");
assert.equal(layout64.matchNumbers.get("r3s13"), 68);
assert.equal(layout64.matchNumbers.get("r3s16"), 65);
assert.equal(layout64.matchNumbers.get("r3s33"), 81);
assert.equal(layout64.matchNumbers.get("r3s24"), 88);
assert.equal(
  layout64.positions.get("r4s5")!.y,
  (layout64.positions.get("r3s9")!.y + layout64.positions.get("r3s10")!.y) / 2,
  "#92 between #72 and #71",
);
assert.equal(layout64.positions.get("r4s5")!.col, -3, "#92 in lower tour 3");
assert.equal(fixedSwissMatchNo(3, 29, MC64), 100, "lower tour 4 #100");
assert.equal(fixedSwissTs64MatchCol(3, 29), -4, "#100 in lower tour 4 column");
assert.equal(
  layout64.positions.get("r3s29")!.y,
  layout64.positions.get("r4s5")!.y,
  "#100 on same Y as #92",
);
assert.equal(layout64.positions.get("r3s29")!.col, -4, "#100 in lower tour 4");
assert.equal(fixedSwissMatchNo(4, 7, MC64), 90, "lower tour 3 #90");
assert.equal(fixedSwissMatchNo(3, 31, MC64), 98, "lower tour 4 #98");
assert.equal(layout64.positions.get("r4s7")!.col, -3, "#90 in lower tour 3");
assert.equal(
  layout64.positions.get("r4s7")!.y,
  (layout64.positions.get("r3s13")!.y + layout64.positions.get("r3s14")!.y) / 2,
  "#90 between #68 and #67",
);
assert.equal(
  layout64.positions.get("r3s31")!.y,
  layout64.positions.get("r4s7")!.y,
  "#98 on same Y as #90",
);
assert.equal(
  layout64.positions.get("r4s8")!.y,
  (layout64.positions.get("r3s15")!.y + layout64.positions.get("r3s16")!.y) / 2,
  "#89 between #66 and #65",
);
assert.equal(
  layout64.positions.get("r3s32")!.y,
  layout64.positions.get("r4s8")!.y,
  "#97 on same Y as #89",
);
assert.ok(
  layout64.positions.get("r3s21")!.y < layout64.positions.get("r3s22")!.y,
  "#85 above #86 in upper tour 2",
);
assert.equal(layout64.minCol, -4);
assert.equal(layout64.maxCol, 6);
assert.equal(layout64.matchNumbers.get("r7s1"), 119);
{
  const links64 = buildFixedSwissTemplate(64, "FIXED_SWISS_64").links;
  const win49 = links64.find(
    (l) => l.fromRound === 2 && l.fromSlot === 17 && l.kind === "win",
  );
  assert.equal(win49?.toSlot, 33, "#49 winner → #81 (R3.33)");
  const win85u = links64.find(
    (l) => l.fromRound === 3 && l.fromSlot === 21 && l.kind === "win",
  );
  assert.equal(win85u?.toRound, 5, "#85 winner → 1/8");
  assert.equal(win85u?.toSlot, 5, "#85 → #109");
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 13 && l.kind === "win")
      ?.toSlot,
    7,
    "#68 → #90 team1",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 14 && l.kind === "win")
      ?.toSlot,
    7,
    "#67 → #90 team2",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 15 && l.kind === "win")
      ?.toSlot,
    8,
    "#66 → #89 team1",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 16 && l.kind === "win")
      ?.toSlot,
    8,
    "#65 → #89 team2",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 25 && l.kind === "win")
      ?.toSlot,
    5,
    "#104 → #109 team2",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 26 && l.kind === "win")
      ?.toSlot,
    6,
    "#103 → #110 team2",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 27 && l.kind === "win")
      ?.toSlot,
    7,
    "#102 → #111 team2",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 28 && l.kind === "win")
      ?.toSlot,
    8,
    "#101 → #112 team2",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 29 && l.kind === "win")
      ?.toSlot,
    1,
    "#100 → #105 team2",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 30 && l.kind === "win")
      ?.toSlot,
    2,
    "#99 → #106 team2",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 31 && l.kind === "win")
      ?.toSlot,
    3,
    "#98 → #107 team2",
  );
  const win85b = links64.find(
    (l) => l.fromRound === 3 && l.fromSlot === 21 && l.kind === "win",
  );
  assert.equal(win85b?.toRound, 5, "#85 winner → 1/8");
  assert.equal(win85b?.toSlot, 5, "#85 → #109");
  const win86b = links64.find(
    (l) => l.fromRound === 3 && l.fromSlot === 22 && l.kind === "win",
  );
  assert.equal(win86b?.toSlot, 6, "#86 → #110");
  const win90 = links64.find(
    (l) => l.fromRound === 4 && l.fromSlot === 7 && l.kind === "win",
  );
  assert.equal(win90?.toRound, 3, "#90 winner → lower tour 4");
  assert.equal(win90?.toSlot, 31, "#90 → #98 (R3 slot 31)");
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 32 && l.kind === "win")
      ?.toSlot,
    4,
    "#97 → #108 team2",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 33 && l.kind === "loss")
      ?.toSlot,
    27,
    "#81 loser → #102",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 33 && l.kind === "loss")
      ?.toTeam,
    1,
    "#81 loser → #102 team1",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 21 && l.kind === "loss")
      ?.toSlot,
    27,
    "#85 loser → #102",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 21 && l.kind === "loss")
      ?.toTeam,
    2,
    "#85 loser → #102 team2",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 24 && l.kind === "loss")
      ?.toSlot,
    30,
    "#88 loser → #99",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 24 && l.kind === "loss")
      ?.toTeam,
    2,
    "#88 loser → #99 team2",
  );
  for (const [fromSlot, toSlot, toTeam, label] of [
    [33, 27, 1, "#81 → #102"],
    [34, 28, 1, "#82 → #101"],
    [35, 29, 1, "#83 → #100"],
    [36, 30, 1, "#84 → #99"],
    [21, 27, 2, "#85 → #102"],
    [22, 28, 2, "#86 → #101"],
    [23, 29, 2, "#87 → #100"],
    [24, 30, 2, "#88 → #99"],
  ] as const) {
    const loss = links64.find(
      (l) =>
        l.fromRound === 3 && l.fromSlot === fromSlot && l.kind === "loss",
    );
    assert.equal(loss?.toSlot, toSlot, `${label} slot`);
    assert.equal(loss?.toTeam, toTeam, `${label} team`);
  }
  assert.equal(
    links64.find(
      (l) => l.fromRound === 5 && l.fromSlot === 1 && l.kind === "win",
    )?.toSlot,
    17,
    "#105 → #113 team1",
  );
  assert.equal(
    links64.find(
      (l) => l.fromRound === 5 && l.fromSlot === 2 && l.kind === "win",
    )?.toTeam,
    2,
    "#106 → #113 team2",
  );
  assert.equal(
    links64.find(
      (l) => l.fromRound === 5 && l.fromSlot === 3 && l.kind === "win",
    )?.toSlot,
    18,
    "#107 → #114 team1",
  );
  assert.equal(
    links64.find(
      (l) => l.fromRound === 5 && l.fromSlot === 4 && l.kind === "win",
    )?.toTeam,
    2,
    "#108 → #114 team2",
  );
  assert.equal(
    links64.find(
      (l) => l.fromRound === 5 && l.fromSlot === 5 && l.kind === "win",
    )?.toSlot,
    19,
    "#109 → #115 team1",
  );
  assert.equal(
    links64.find(
      (l) => l.fromRound === 5 && l.fromSlot === 6 && l.kind === "win",
    )?.toTeam,
    2,
    "#110 → #115 team2",
  );
  assert.equal(
    links64.find(
      (l) => l.fromRound === 5 && l.fromSlot === 7 && l.kind === "win",
    )?.toSlot,
    20,
    "#111 → #116 team1",
  );
  assert.equal(
    links64.find(
      (l) => l.fromRound === 5 && l.fromSlot === 8 && l.kind === "win",
    )?.toTeam,
    2,
    "#112 → #116 team2",
  );
  assert.equal(
    links64.find(
      (l) =>
        l.fromRound === 5 &&
        l.fromSlot === 3 &&
        l.kind === "win" &&
        l.toRound === 6,
    ),
    undefined,
    "#107 winner does not go straight to semi",
  );
  assert.equal(
    links64.find(
      (l) =>
        l.fromRound === 5 &&
        l.fromSlot === 1 &&
        l.kind === "win" &&
        l.toRound === 6,
    ),
    undefined,
    "#105 winner does not go straight to semi",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 25 && l.kind === "win")
      ?.toSlot,
    5,
    "#104 → #109 team2",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 29 && l.kind === "win")
      ?.toSlot,
    1,
    "#100 → #105 team2",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 30 && l.kind === "win")
      ?.toSlot,
    2,
    "#99 → #106 team2",
  );
  assert.equal(
    links64.find((l) => l.fromRound === 3 && l.fromSlot === 31 && l.kind === "win")
      ?.toSlot,
    3,
    "#98 → #107 team2",
  );
}
assert.equal(fixedSwissMatchNo(5, 5, MC64), 109);
assert.equal(fixedSwissMatchNo(5, 8, MC64), 112);
assert.equal(
  layout64.positions.get("r5s8")!.y,
  layout64.positions.get("r3s24")!.y,
  "#112 same Y as #88",
);
assert.equal(
  layout64.positions.get("r5s5")!.y,
  layout64.positions.get("r3s21")!.y,
  "#109 same Y as #85",
);
assert.equal(
  layout64.positions.get("r5s6")!.y,
  layout64.positions.get("r3s22")!.y,
  "#110 same Y as #86",
);
assert.equal(
  layout64.positions.get("r5s7")!.y,
  layout64.positions.get("r3s23")!.y,
  "#111 same Y as #87",
);
assert.equal(
  layout64.positions.get("r3s17")!.y,
  (layout64.positions.get("r5s1")!.y + layout64.positions.get("r5s2")!.y) / 2,
  "#113 between #105 and #106",
);
assert.equal(layout64.positions.get("r3s18")!.col, 4, "#114 in 1/8 column");
assert.equal(
  layout64.positions.get("r3s18")!.y,
  (layout64.positions.get("r5s3")!.y + layout64.positions.get("r5s4")!.y) / 2,
  "#114 between #107 and #108",
);
assert.equal(
  layout64.positions.get("r3s19")!.y,
  (layout64.positions.get("r5s5")!.y + layout64.positions.get("r5s6")!.y) / 2,
  "#115 between #109 and #110",
);
assert.equal(
  layout64.positions.get("r3s20")!.y,
  (layout64.positions.get("r5s7")!.y + layout64.positions.get("r5s8")!.y) / 2,
  "#116 between #111 and #112",
);
assert.equal(
  layout64.positions.get("r6s1")!.y,
  (layout64.positions.get("r3s17")!.y + layout64.positions.get("r3s18")!.y) / 2,
  "#117 between #113 and #114",
);
assert.equal(
  layout64.positions.get("r6s2")!.y,
  (layout64.positions.get("r3s19")!.y + layout64.positions.get("r3s20")!.y) / 2,
  "#118 between #115 and #116",
);
{
  const links64b = buildFixedSwissTemplate(64, "FIXED_SWISS_64").links;
  assert.equal(
    links64b.find((l) => l.fromRound === 3 && l.fromSlot === 17 && l.kind === "win")
      ?.toSlot,
    1,
    "#113 → #117 team1",
  );
  assert.equal(
    links64b.find((l) => l.fromRound === 3 && l.fromSlot === 18 && l.kind === "win")
      ?.toTeam,
    2,
    "#114 → #117 team2",
  );
  assert.equal(
    links64b.find((l) => l.fromRound === 4 && l.fromSlot === 8 && l.kind === "win")
      ?.toSlot,
    32,
    "#89 → #97 lower tour 4",
  );
  assert.equal(
    links64b.find((l) => l.fromRound === 3 && l.fromSlot === 31 && l.kind === "win")
      ?.toTeam,
    2,
    "#98 → #111 team2",
  );
  assert.ok(
    !links64b.some((l) => l.fromRound === 4 && l.fromSlot === 5 && l.toRound === 6),
    "R4.5 not into R6",
  );
}
assert.equal(
  shouldDrawFixedSwissWinEdge(4, 5, 3, 6, "win", 17, 1, MC64),
  true,
  "#113 → #117 line",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(5, 6, 6, 7, "win", 1, 1, MC64),
  true,
  "#117+#118 → #119",
);
assert.equal(layout64.matchNumbers.get("r3s25"), 104, "lower tour 4 top #104");
assert.equal(layout64.matchNumbers.get("r3s32"), 97, "lower tour 4 bottom #97");
assert.equal(layout64.positions.get("r3s25")!.col, -4);
assert.equal(layout64.positions.get("r3s32")!.col, -4);
assert.ok(
  layout64.positions.get("r3s25")!.y < layout64.positions.get("r3s32")!.y,
  "#104 above #97 (104→103→…→97 top to bottom)",
);
for (let slot = 25; slot < 32; slot++) {
  const above = layout64.positions.get(`r3s${slot}`)!;
  const below = layout64.positions.get(`r3s${slot + 1}`)!;
  assert.ok(
    above.y < below.y,
    `#${layout64.matchNumbers.get(`r3s${slot}`)} above #${layout64.matchNumbers.get(`r3s${slot + 1}`)}`,
  );
}

function mkGridTs64Bronze(): BracketMatchView[] {
  const template = buildFixedSwissTemplate(64, "FIXED_SWISS_64_BRONZE");
  return template.matches.map((m) => mkMatch(m.round, m.slot));
}
const layout64Bronze = buildFixedSwissBracketLayout(mkGridTs64Bronze());
{
  const linksBronze = buildFixedSwissTemplate(64, "FIXED_SWISS_64_BRONZE").links;
  assert.equal(
    linksBronze.find((l) => l.fromRound === 6 && l.fromSlot === 1 && l.kind === "loss")
      ?.toSlot,
    2,
    "#117 loser → #120",
  );
  assert.equal(
    linksBronze.find((l) => l.fromRound === 6 && l.fromSlot === 2 && l.kind === "loss")
      ?.toSlot,
    2,
    "#118 loser → #120",
  );
  assert.equal(linksBronze.length, buildFixedSwissTemplate(64, "FIXED_SWISS_64").links.length + 2);
  const fin = layout64Bronze.positions.get("r7s1")!;
  const bronze = layout64Bronze.positions.get("r7s2")!;
  assert.equal(bronze.col, 6, "bronze in «Финал» column");
  assert.equal(layout64Bronze.matchNumbers.get("r7s2"), 120);
  const finH64 = layout64Bronze.cardHeights?.get("r7s1") ?? FIXED_SWISS_CARD_H;
  assert.equal(bronze.y, fin.y + finH64 + 12, "#120 under #119");
}
assert.equal(
  shouldDrawFixedSwissWinEdge(2, 3, 3, 5, "win", 33, 1, MC64),
  true,
  "#81 → #105",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(2, 3, 3, 5, "win", 34, 2, MC64),
  true,
  "#82 → #106",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(1, 2, 2, 3, "win", 17, 33, MC64),
  true,
  "#49 → #81 fork",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(1, 2, 2, 3, "win", 18, 33, MC64),
  true,
  "#50 → #81 fork",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(0, 1, 1, 2, "win", 1, 17, MC64),
  true,
  "R1 → верхняя тур 1 (#49)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(2, 3, 3, 5, "win", 24, 8, MC64),
  true,
  "#88 → #112 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(3, 4, 5, 3, "win", 1, 17, MC64),
  true,
  "#105 → #113 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(3, 4, 5, 3, "win", 2, 17, MC64),
  true,
  "#106 → #113 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(3, 4, 5, 3, "win", 3, 18, MC64),
  true,
  "#107 → #114 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(3, 4, 5, 3, "win", 4, 18, MC64),
  true,
  "#108 → #114 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(3, 4, 5, 3, "win", 5, 19, MC64),
  true,
  "#109 → #115 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(3, 4, 5, 3, "win", 8, 20, MC64),
  true,
  "#112 → #116 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, 3, 3, 5, "win", 25, 5, MC64),
  false,
  "#104 → #109: only footer",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, 3, 3, 5, "win", 27, 7, MC64),
  false,
  "#102 → #111: only footer",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, 3, 3, 5, "win", 28, 8, MC64),
  false,
  "#101 → #112: only footer",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, 3, 3, 5, "win", 29, 1, MC64),
  false,
  "#100 → #105: only footer",
);
{
  const matchById64 = new Map(mkGridTs64().map((m) => [m.id, m]));
  const getFromY64 = (
    fromId: string,
    toId: string,
    fromTeamSlot: 1 | 2,
    _toTeamSlot: 1 | 2,
    kind: "win" | "loss",
  ) => {
    const fromPos = layout64.positions.get(fromId);
    const toPos = layout64.positions.get(toId);
    if (!fromPos || !toPos) return undefined;
    return gridFixedEdgePoints(
      fromPos,
      toPos,
      fromTeamSlot,
      1,
      kind,
      layout64.minCol,
    ).from.y;
  };
  const r23Trunk64 = fixedSwissForkTrunkYByTarget(
    2,
    3,
    layout64.edges,
    getFromY64,
    matchById64,
    MC64,
  );
  const id85 = mkGridTs64().find((m) => m.round === 3 && m.slot === 21)!.id;
  const trunk85 = r23Trunk64.get(id85)!;
  const y57 = getFromY64("r2s25", id85, 1, 1, "win")!;
  const y58 = getFromY64("r2s26", id85, 2, 1, "win")!;
  assert.ok(
    Math.abs(trunk85 - (y57 + y58) / 2) < 1,
    "#57+#58 fork trunk at #85 (excludes #45 bridge)",
  );
  const path57 = forkPath(layout64, "r2s25", "win", r23Trunk64, 21);
  const path58 = forkPath(layout64, "r2s26", "win", r23Trunk64, 21);
  const gutter57 = path57.match(/H (\d+) V/)?.[1];
  const gutter58 = path58.match(/H (\d+) V/)?.[1];
  assert.equal(gutter57, gutter58, "#57+#58 share fork gutter X");
  const path49 = forkPath(layout64, "r2s17", "win", r23Trunk64, 33);
  const path50 = forkPath(layout64, "r2s18", "win", r23Trunk64, 33);
  const baseGutter12 = fixedSwissColumnGutter(
    1,
    2,
    layout64.minCol,
    layout64.colWidth ?? FIXED_SWISS_COL_W,
  );
  assert.equal(
    path49.match(/H (\d+) V/)?.[1],
    String(baseGutter12),
    "#49→#81 fork gutter centered in col 1→2",
  );
  assert.equal(
    path49.match(/H (\d+) V/)?.[1],
    path50.match(/H (\d+) V/)?.[1],
    "#49+#50 share fork gutter X",
  );
  const path63 = forkPath(layout64, "r2s31", "win", r23Trunk64, 24);
  const path64 = forkPath(layout64, "r2s32", "win", r23Trunk64, 24);
  assert.equal(
    path63.match(/H (\d+) V/)?.[1],
    path64.match(/H (\d+) V/)?.[1],
    "#63+#64 share fork gutter X",
  );
  assert.ok(
    !path58.includes(`V ${Math.round(trunk85 + 500)}`),
    "#58→#85 fork does not drop far below #85",
  );
  assert.match(
    path58,
    new RegExp(`V ${Math.round(trunk85)}`),
    "#58→#85 uses shared trunk Y",
  );
  const pts85109 = gridFixedEdgePoints(
    layout64.positions.get("r3s21")!,
    layout64.positions.get("r5s5")!,
    1,
    1,
    "win",
    layout64.minCol,
  );
  const path85109 = gridFixedConnectorPath(
    pts85109.from,
    pts85109.to,
    "win",
    2,
    3,
    layout64.minCol,
    layout64.colWidth ?? FIXED_SWISS_COL_W,
    0,
  );
  assert.match(
    path85109,
    new RegExp(`V ${pts85109.to.y} H \\d+$`),
    "#85→#109 reaches #109 Y",
  );
  const pts4585 = gridFixedEdgePoints(
    layout64.positions.get("r2s13")!,
    layout64.positions.get("r3s21")!,
    1,
    2,
    "win",
    layout64.minCol,
  );
  const path4585 = gridFixedCrossToQuarterConnectorPath(
    pts4585.from,
    pts4585.to,
    -1,
    2,
    layout64.minCol,
    layout64.colWidth ?? FIXED_SWISS_COL_W,
    0,
  );
  assert.ok(
    !path4585.includes("V 3335 H 1266"),
    "#45→#85: no horizontal bus at #85 Y across columns",
  );
  assert.match(
    path4585,
    new RegExp(`V ${pts4585.to.y} H \\d+$`),
    "#45→#85 enters #85 Y",
  );
}
assert.equal(
  shouldDrawFixedSwissWinEdge(1, 2, 2, 3, "win", 25, 21, MC64),
  true,
  "#57 → #85 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(1, 2, 2, 3, "win", 26, 21, MC64),
  true,
  "#58 → #85 SVG",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(2, 3, 3, 5, "win", 21, 5, MC64),
  true,
  "#85 → #109 SVG",
);

{
  const expectedColOrder: Record<number, number[]> = {
    0: Array.from({ length: 32 }, (_, i) => i + 1),
    [-1]: Array.from({ length: 16 }, (_, i) => 33 + i),
    1: Array.from({ length: 16 }, (_, i) => 49 + i),
    [-2]: Array.from({ length: 16 }, (_, i) => 80 - i),
    2: Array.from({ length: 8 }, (_, i) => 81 + i),
    [-3]: Array.from({ length: 8 }, (_, i) => 96 - i),
    [-4]: Array.from({ length: 8 }, (_, i) => 104 - i),
    3: Array.from({ length: 8 }, (_, i) => 105 + i),
    4: [113, 114, 115, 116],
    5: [117, 118],
    6: [119],
  };
  const byCol = new Map<number, { no: number; y: number }[]>();
  for (const m of mkGridTs64()) {
    const pos = layout64.positions.get(`r${m.round}s${m.slot}`);
    if (!pos) continue;
    const no = fixedSwissMatchNo(m.round, m.slot, MC64);
    if (!byCol.has(pos.col)) byCol.set(pos.col, []);
    byCol.get(pos.col)!.push({ no, y: pos.y });
  }
  for (const [col, expected] of Object.entries(expectedColOrder)) {
    const nos = byCol
      .get(Number(col))!
      .sort((a, b) => a.y - b.y)
      .map((x) => x.no);
    assert.deepEqual(nos, expected, `column ${col} top→bottom order`);
  }
}
assert.equal(
  layout64.positions.get("r5s1")!.y,
  layout64.positions.get("r3s33")!.y,
  "#105 on same Y as #81",
);

{
  const links32 = buildFixedSwissTemplate(32).links;
  const rows = [
    { round: 1, slot: 3, team1Id: "a", team2Id: null, winnerTeamId: "a", status: "FINISHED" },
    { round: 1, slot: 4, team1Id: "b", team2Id: null, winnerTeamId: "b", status: "FINISHED" },
    { round: 2, slot: 2, team1Id: null, team2Id: null, winnerTeamId: null, status: "SCHEDULED" },
  ];
  assert.equal(isRoundOneByeSlot(rows[0]!), true);
  assert.equal(
    isVoidFixedSwissCrossMatch(rows[2]!, rows, links32),
    true,
    "R2 cross empty when both R1 feeders are bye",
  );
}

{
  const soloTeam = {
    id: "t-solo",
    player1: { id: "p-solo", firstName: "A", lastName: "B", rating: 5 },
    player2: null,
  };
  const byeR1s3: BracketMatchView = {
    ...mkMatch(1, 3),
    team1: soloTeam,
    team2: null,
    winnerTeamId: soloTeam.id,
    status: "FINISHED",
  };
  const byeR1s4: BracketMatchView = {
    ...mkMatch(1, 4),
    team1: { ...soloTeam, id: "t-solo-2" },
    team2: null,
    winnerTeamId: "t-solo-2",
    status: "FINISHED",
  };
  const voidCrossR2s2: BracketMatchView = {
    ...mkMatch(2, 2),
    status: "FINISHED",
  };
  const grid32 = mkGridTs32Bronze().map((m) => {
    if (m.id === "r1s3") return byeR1s3;
    if (m.id === "r1s4") return byeR1s4;
    if (m.id === "r2s2") return voidCrossR2s2;
    return m;
  });
  const layout32 = buildFixedSwissBracketLayout(grid32);
  const byId32 = new Map(grid32.map((m) => [m.id, m]));
  assert.equal(
    fixedSwissMatchNo(2, 2, 60),
    18,
    "#18 is lower R2 slot 2 in 32→16 bronze",
  );
  assert.equal(
    isIncomingAutopassPhantomForTeam("r2s2", 1, layout32.edges, byId32),
    true,
    "#18 row 1: × from R1 bye",
  );
  assert.equal(
    isIncomingAutopassPhantomForTeam("r2s2", 2, layout32.edges, byId32),
    true,
    "#18 row 2: × from R1 bye",
  );
}

// --- 64→32 R8 elim (111/112) ---
assert.equal(
  buildFixedSwissTemplate(64, "FIXED_SWISS_64R8_1_3_mesto").matches.length,
  112,
  "FIXED_SWISS_64R8_1_3_mesto: 111 + матч за 3–4",
);
const r64R8Links = buildFixedSwissTemplate(64, "FIXED_SWISS_64R8_1_3_mesto").links;
assert.equal(
  r64R8Links.some(
    (l) => l.kind === "loss" && l.fromRound === 3 && l.fromSlot === 21,
  ),
  false,
  "64R8: нет loss с 1/8 в нижнюю ветку",
);
assert.equal(
  r64R8Links.some(
    (l) => l.fromRound === 4 && l.toRound === 5 && l.fromSlot === 1,
  ),
  true,
  "64R8: нижняя тур 3 → 1/4 напрямую",
);
assert.equal(
  buildFixedSwissTemplate(64, "FIXED_SWISS_64R8_1_3_mesto").matches.filter(
    (m) => m.round === 3,
  ).length,
  28,
  "64R8: R3 без нижней тур 4 (28 слотов)",
);
assertProtocolPlace(85, "loser", 112, { place: 17, placeTo: 24 }, 7);
assertProtocolPlace(120, "winner", 112, { place: 3 }, 7);
assertProtocolPlace(120, "loser", 112, { place: 4 }, 7);
assert.equal(
  fixedSwissPlacementLabel(3, 21, 7, 32, 112, 85),
  "место 17–24",
  "64R8: вылет с 1/8",
);
assert.equal(fixedSwissMatchNo(7, 1, 112, 7), 119, "64R8: финал #119");
assert.equal(fixedSwissMatchNo(7, 2, 112, 7), 120, "64R8: бронза #120");

assert.equal(
  buildFixedSwissTemplate(64, "FIXED_SWISS_64R8_2_3_mesta").matches.length,
  111,
  "FIXED_SWISS_64R8_2_3_mesta: 111 встреч без доп. игры",
);
const r64R8TwoThirdLinks = buildFixedSwissTemplate(
  64,
  "FIXED_SWISS_64R8_2_3_mesta",
).links;
assert.equal(
  r64R8TwoThirdLinks.some((l) => l.fromRound === 7 && l.fromSlot === 2),
  false,
  "64R8_2_3: нет матча #120",
);
assertProtocolPlace(117, "loser", 111, { place: 3 }, 7);
assertProtocolPlace(118, "loser", 111, { place: 3 }, 7);
assert.equal(fixedSwissMatchNo(7, 1, 111, 7), 119, "64R8_2_3: финал #119");

assert.equal(
  shouldAutoAdvanceFixedSwissLink(
    { fromRound: 5, fromSlot: 1, toRound: 3, toSlot: 17, kind: "win" },
    112,
    7,
  ),
  true,
  "#105 → #113 (1/4): auto-advance",
);
assert.equal(
  shouldAutoAdvanceFixedSwissLink(
    { fromRound: 3, fromSlot: 17, toRound: 6, toSlot: 1, kind: "win" },
    112,
    7,
  ),
  true,
  "#113 → #117 (полуфинал): auto-advance",
);

// --- 128→64 R8 elim (247/248) ---
assert.equal(
  buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto").matches.length,
  248,
  "FIXED_SWISS_128R8_1_3_mesto: 247 + матч за 3–4",
);
const r128R8Links = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto").links;
assert.equal(
  r128R8Links.some(
    (l) =>
      l.kind === "loss" &&
      l.fromRound === 3 &&
      l.fromSlot >= 33 &&
      l.fromSlot <= 40,
  ),
  false,
  "128R8: нет loss с 1/8 в нижнюю ветку",
);
assert.equal(
  r128R8Links.some(
    (l) => l.kind === "loss" && l.fromRound === 3 && l.fromSlot === 41,
  ),
  true,
  "128R8: #165 loss → нижняя тур 4",
);
assert.equal(
  r128R8Links.some(
    (l) =>
      l.fromRound === 4 &&
      l.toRound === 3 &&
      l.fromSlot === 16 &&
      l.kind === "win" &&
      l.toTeam === 2 &&
      fixedSwissMatchNo(l.toRound, l.toSlot, 248, 7) === 193,
  ),
  true,
  "128R8: #177 win → нижняя тур 4 #193 team2",
);
assert.equal(
  r128R8Links.some(
    (l) =>
      l.fromRound === 4 &&
      l.toRound === 3 &&
      l.fromSlot === 8 &&
      l.kind === "win" &&
      l.toTeam === 2 &&
      fixedSwissMatchNo(l.toRound, l.toSlot, 248, 7) === 201,
  ),
  true,
  "128R8: #185 win → #201 team2 (loss #161 на team1)",
);
assert.equal(
  r128R8Links.some(
    (l) =>
      l.fromRound === 3 &&
      l.fromSlot === 64 &&
      l.kind === "win" &&
      l.toTeam === 1 &&
      fixedSwissMatchNo(l.toRound, l.toSlot, 248, 7) === 224,
  ),
  true,
  "128R8: #193 win → нижняя тур 5 #224",
);
assert.equal(
  r128R8Links.some(
    (l) =>
      l.fromRound === 3 &&
      l.fromSlot === 69 &&
      l.kind === "win" &&
      fixedSwissMatchNo(l.toRound, l.toSlot, 248, 7) === 225,
  ),
  true,
  "128R8: #217 win → нижняя тур 6 #225",
);
assert.equal(
  r128R8Links.some(
    (l) =>
      l.fromRound === 5 &&
      l.fromSlot === 9 &&
      l.kind === "win" &&
      l.toTeam === 2 &&
      fixedSwissMatchNo(l.toRound, l.toSlot, 248, 7) === 227,
  ),
  true,
  "128R8: #219 win → #227 team2 (loss #215 на team1)",
);
assert.equal(
  r128R8Links.some(
    (l) =>
      l.fromRound === 3 &&
      l.fromSlot === 73 &&
      l.kind === "win" &&
      l.toTeam === 1 &&
      fixedSwissMatchNo(l.toRound, l.toSlot, 248, 7) === 240,
  ),
  true,
  "128R8: #225 win → 1/8 #240 team1 (win #216 на team2)",
);
assert.equal(
  buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto").matches.filter(
    (m) => m.round === 3,
  ).length,
  84,
  "128R8: R3 с колонками −4/−5/−6 (84 слота)",
);
assert.equal(
  buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_2_3_mesta").matches.length,
  247,
  "FIXED_SWISS_128R8_2_3_mesta: 247 встреч без доп. игры",
);
const r128R8TwoThirdLinks = buildFixedSwissTemplate(
  128,
  "FIXED_SWISS_128R8_2_3_mesta",
).links;
assert.equal(
  r128R8TwoThirdLinks.some((l) => l.fromRound === 7 && l.fromSlot === 2),
  false,
  "128R8_2_3: нет матча за 3–4",
);
assert.equal(fixedSwissMatchNo(7, 1, 247, 7), 247, "128R8_2_3: финал #247");
assert.equal(fixedSwissMatchNo(7, 2, 248, 7), 248, "128R8: бронза #248");
{
  const oneThird = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto");
  const twoThird = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_2_3_mesta");
  const linkKey = (l: (typeof oneThird.links)[number]) =>
    `${l.fromRound}:${l.fromSlot}:${l.kind}->${l.toRound}:${l.toSlot}:t${l.toTeam}`;
  const oneSansBronze = oneThird.links.filter(
    (l) => !(l.fromRound === 6 && l.kind === "loss" && l.toRound === 7 && l.toSlot === 2),
  );
  assert.equal(
    twoThird.links.length,
    oneSansBronze.length,
    "128R8_2_3: links = 1_3_mesto без бронзы",
  );
  const setOne = new Set(oneSansBronze.map(linkKey));
  const setTwo = new Set(twoThird.links.map(linkKey));
  assert.equal(setOne.size, setTwo.size, "128R8_2_3: уникальные links");
  for (const k of setOne) {
    assert.ok(setTwo.has(k), `128R8_2_3: link ${k}`);
  }
  for (const m of twoThird.matches) {
    assert.equal(
      fixedSwissMatchNo(m.round, m.slot, 247, 7),
      fixedSwissMatchNo(m.round, m.slot, 248, 7),
      `128R8: # совпадает R${m.round}s${m.slot}`,
    );
  }
  assert.deepEqual(
    fixedSwissProtocolPlace(245, "loser", 247, 7),
    { place: 3 },
    "128R8_2_3: проигравший полуфинала — 3-е",
  );
  assert.equal(
    fixedSwissProtocolPlace(245, "loser", 248, 7),
    null,
    "128R8_1_3: проигравший полуфинала играет бронзу",
  );
}
assert.equal(fixedSwissMatchNo(1, 1, 248, 7), 1, "128R8: первый тур #1");
assert.equal(fixedSwissMatchNo(2, 1, 248, 7), 65, "128R8: нижняя тур 1 #65");
{
  const t128 = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto");
  for (let m = 65; m <= 96; m++) {
    const match = t128.matches.find(
      (x) => fixedSwissMatchNo(x.round, x.slot, 248, 7) === m,
    )!;
    const expectWin = 225 - m;
    const wins = t128.links.filter(
      (l) =>
        l.fromRound === match.round &&
        l.fromSlot === match.slot &&
        l.kind === "win",
    );
    const losses = t128.links.filter(
      (l) =>
        l.fromRound === match.round &&
        l.fromSlot === match.slot &&
        l.kind === "loss",
    );
    assert.equal(losses.length, 0, `128R8: #${m} без loss link (место 97–128)`);
    assert.equal(wins.length, 1, `128R8: #${m} один win link`);
    assert.equal(
      fixedSwissMatchNo(wins[0]!.toRound, wins[0]!.toSlot, 248, 7),
      expectWin,
      `128R8: #${m} win → #${expectWin}`,
    );
    assert.equal(
      fixedSwissTs128R8ElimPlacementByMatchNo(m, true),
      "место 97–128",
      `128R8: подпись нижней тур 1 #${m}`,
    );
    assert.deepEqual(
      fixedSwissProtocolPlace(m, "loser", 248, 7),
      { place: 97, placeTo: 128 },
      `128R8: протокол проигравшего #${m}`,
    );
  }
}
assert.equal(fixedSwissMatchNo(2, 33, 248, 7), 97, "128R8: верхняя тур 1 #97");
assert.equal(fixedSwissMatchNo(3, 32, 248, 7), 129, "128R8: нижняя тур 2 #129");
{
  const t128 = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto");
  for (let m = 129; m <= 160; m++) {
    const match = t128.matches.find(
      (x) => fixedSwissMatchNo(x.round, x.slot, 248, 7) === m,
    )!;
    const expectWin = 177 + Math.floor((m - 129) / 2);
    const wins = t128.links.filter(
      (l) =>
        l.fromRound === match.round &&
        l.fromSlot === match.slot &&
        l.kind === "win",
    );
    const losses = t128.links.filter(
      (l) =>
        l.fromRound === match.round &&
        l.fromSlot === match.slot &&
        l.kind === "loss",
    );
    assert.equal(losses.length, 0, `128R8: #${m} без loss link (место 65–96)`);
    assert.equal(wins.length, 1, `128R8: #${m} один win link`);
    assert.equal(
      fixedSwissMatchNo(wins[0]!.toRound, wins[0]!.toSlot, 248, 7),
      expectWin,
      `128R8: #${m} win → #${expectWin}`,
    );
    assert.equal(
      fixedSwissTs128R8ElimPlacementByMatchNo(m, true),
      "место 65–96",
      `128R8: подпись нижней тур 2 #${m}`,
    );
    assert.deepEqual(
      fixedSwissProtocolPlace(m, "loser", 248, 7),
      { place: 65, placeTo: 96 },
      `128R8: протокол проигравшего #${m}`,
    );
  }
}
assert.equal(fixedSwissMatchNo(3, 65, 248, 7), 161, "128R8: верхняя тур 2 #161");
assert.equal(fixedSwissMatchNo(3, 68, 248, 7), 164, "128R8: верхняя тур 2 #164");
assert.equal(fixedSwissMatchNo(3, 41, 248, 7), 165, "128R8: верхняя тур 2 #165");
assert.equal(fixedSwissMatchNo(3, 48, 248, 7), 172, "128R8: верхняя тур 2 #172");
assert.equal(fixedSwissMatchNo(3, 49, 248, 7), 173, "128R8: верхняя тур 2 #173");
assert.equal(fixedSwissMatchNo(3, 52, 248, 7), 176, "128R8: верхняя тур 2 #176");
assert.equal(fixedSwissMatchNo(3, 81, 248, 7), 208, "128R8: нижняя тур 4 #208");
assert.equal(fixedSwissMatchNo(3, 64, 248, 7), 193, "128R8: нижняя тур 4 #193");
assert.equal(fixedSwissMatchNo(3, 69, 248, 7), 217, "128R8: нижняя тур 5 #217");
assert.equal(fixedSwissMatchNo(3, 72, 248, 7), 224, "128R8: нижняя тур 5 #224");
assert.equal(fixedSwissMatchNo(3, 73, 248, 7), 225, "128R8: нижняя тур 6 #225");
assert.equal(fixedSwissMatchNo(3, 80, 248, 7), 232, "128R8: нижняя тур 6 #232");
for (let n = 161; n <= 176; n++) {
  const found = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto").matches.some(
    (m) => fixedSwissMatchNo(m.round, m.slot, 248, 7) === n,
  );
  assert.ok(found, `128R8: верхняя тур 2 включает #${n}`);
}
{
  const t128 = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto");
  const slotByNo = new Map<number, number>();
  for (const m of t128.matches.filter((x) => x.round === 3)) {
    const no = fixedSwissMatchNo(m.round, m.slot, 248, 7);
    if (no >= 161 && no <= 176) slotByNo.set(no, m.slot);
  }
  for (let m = 161; m <= 176; m++) {
    const slot = slotByNo.get(m)!;
    const k = Math.ceil((m - 160) / 2);
    const expectWin = 208 + k;
    const expectLoss = m <= 168 ? 200 + (m - 160) : 192 + (m - 168);
    for (const kind of ["win", "loss"] as const) {
      const link = t128.links.find(
        (l) => l.fromRound === 3 && l.fromSlot === slot && l.kind === kind,
      );
      assert.ok(link, `128R8: #${m} ${kind} link`);
      const got = fixedSwissMatchNo(link!.toRound, link!.toSlot, 248, 7);
      const want = kind === "win" ? expectWin : expectLoss;
      assert.equal(got, want, `128R8: #${m} ${kind} → #${want}`);
    }
  }
}
{
  const t128 = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto");
  for (let m = 209; m <= 216; m++) {
    const fromSlot = m - 208;
    const expectWin = m + 24;
    const expectLoss = m <= 212 ? 228 + (m - 208) : 224 + (m - 212);
    for (const kind of ["win", "loss"] as const) {
      const link = t128.links.find(
        (l) => l.fromRound === 5 && l.fromSlot === fromSlot && l.kind === kind,
      );
      assert.ok(link, `128R8: #${m} ${kind} link`);
      const got = fixedSwissMatchNo(link!.toRound, link!.toSlot, 248, 7);
      const want = kind === "win" ? expectWin : expectLoss;
      assert.equal(got, want, `128R8: #${m} ${kind} → #${want}`);
    }
  }
}
assert.equal(fixedSwissMatchNo(4, 16, 248, 7), 177, "128R8: нижняя тур 3 #177");
{
  const t128 = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto");
  for (let m = 177; m <= 192; m++) {
    const match = t128.matches.find(
      (x) => fixedSwissMatchNo(x.round, x.slot, 248, 7) === m,
    )!;
    const expectWin = m + 16;
    const wins = t128.links.filter(
      (l) =>
        l.fromRound === match.round &&
        l.fromSlot === match.slot &&
        l.kind === "win",
    );
    const losses = t128.links.filter(
      (l) =>
        l.fromRound === match.round &&
        l.fromSlot === match.slot &&
        l.kind === "loss",
    );
    assert.equal(losses.length, 0, `128R8: #${m} без loss link (место 49–64)`);
    assert.equal(wins.length, 1, `128R8: #${m} один win link`);
    assert.equal(
      fixedSwissMatchNo(wins[0]!.toRound, wins[0]!.toSlot, 248, 7),
      expectWin,
      `128R8: #${m} win → #${expectWin}`,
    );
    assert.equal(
      fixedSwissTs128R8ElimPlacementByMatchNo(m, true),
      "место 49–64",
      `128R8: подпись нижней тур 3 #${m}`,
    );
    assert.deepEqual(
      fixedSwissProtocolPlace(m, "loser", 248, 7),
      { place: 49, placeTo: 64 },
      `128R8: протокол проигравшего #${m}`,
    );
  }
}
{
  const t128 = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto");
  for (let m = 193; m <= 208; m++) {
    const slot = fixedSwissTs128R8LowerTour4DisplaySlot(m);
    const expectWin = 224 - Math.floor((m - 193) / 2);
    const expectTeam = m % 2 === 1 ? 1 : 2;
    const wins = t128.links.filter(
      (l) => l.fromRound === 3 && l.fromSlot === slot && l.kind === "win",
    );
    const losses = t128.links.filter(
      (l) => l.fromRound === 3 && l.fromSlot === slot && l.kind === "loss",
    );
    assert.equal(losses.length, 0, `128R8: #${m} без loss link (место 33–48)`);
    assert.equal(wins.length, 1, `128R8: #${m} один win link`);
    assert.equal(
      fixedSwissMatchNo(wins[0]!.toRound, wins[0]!.toSlot, 248, 7),
      expectWin,
      `128R8: #${m} win → #${expectWin}`,
    );
    assert.equal(wins[0]!.toTeam, expectTeam, `128R8: #${m} win team${expectTeam}`);
    assert.equal(
      fixedSwissTs128R8ElimPlacementByMatchNo(m, true),
      "место 33–48",
      `128R8: подпись нижней тур 4 #${m}`,
    );
    assert.deepEqual(
      fixedSwissProtocolPlace(m, "loser", 248, 7),
      { place: 33, placeTo: 48 },
      `128R8: протокол проигравшего #${m}`,
    );
  }
}
{
  const t128 = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto");
  for (let m = 217; m <= 224; m++) {
    const from = fixedSwissTs128R8LowerTour5FromMatchNo(m);
    const expectWin = m + 8;
    const wins = t128.links.filter(
      (l) =>
        l.fromRound === from!.toRound &&
        l.fromSlot === from!.toSlot &&
        l.kind === "win",
    );
    const losses = t128.links.filter(
      (l) =>
        l.fromRound === from!.toRound &&
        l.fromSlot === from!.toSlot &&
        l.kind === "loss",
    );
    assert.equal(losses.length, 0, `128R8: #${m} без loss link (место 25–32)`);
    assert.equal(wins.length, 1, `128R8: #${m} один win link`);
    assert.equal(
      fixedSwissMatchNo(wins[0]!.toRound, wins[0]!.toSlot, 248, 7),
      expectWin,
      `128R8: #${m} win → #${expectWin}`,
    );
    assert.equal(
      fixedSwissTs128R8ElimPlacementByMatchNo(m, true),
      "место 25–32",
      `128R8: подпись нижней тур 5 #${m}`,
    );
    assert.deepEqual(
      fixedSwissProtocolPlace(m, "loser", 248, 7),
      { place: 25, placeTo: 32 },
      `128R8: протокол проигравшего #${m}`,
    );
  }
}
{
  const t128 = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto");
  for (let m = 225; m <= 232; m++) {
    const slot = m - 152;
    const expectWin = 465 - m;
    const wins = t128.links.filter(
      (l) => l.fromRound === 3 && l.fromSlot === slot && l.kind === "win",
    );
    const losses = t128.links.filter(
      (l) => l.fromRound === 3 && l.fromSlot === slot && l.kind === "loss",
    );
    assert.equal(losses.length, 0, `128R8: #${m} без loss link (место 17–24)`);
    assert.equal(wins.length, 1, `128R8: #${m} один win link`);
    assert.equal(
      fixedSwissMatchNo(wins[0]!.toRound, wins[0]!.toSlot, 248, 7),
      expectWin,
      `128R8: #${m} win → #${expectWin}`,
    );
    const eighthSlot = fixedSwissTs128R8EighthDisplaySlot(expectWin);
    const expectTeam = (eighthSlot - 32) % 2 === 1 ? 2 : 1;
    assert.equal(wins[0]!.toTeam, expectTeam, `128R8: #${m} win → team${expectTeam}`);
    assert.equal(
      fixedSwissTs128R8ElimPlacementByMatchNo(m, true),
      "место 17–24",
      `128R8: подпись нижней тур 6 #${m}`,
    );
    assert.deepEqual(
      fixedSwissProtocolPlace(m, "loser", 248, 7),
      { place: 17, placeTo: 24 },
      `128R8: протокол проигравшего #${m}`,
    );
  }
}
assert.equal(fixedSwissMatchNo(3, 64, 248, 7), 193, "128R8: нижняя тур 4 #193");
assert.equal(fixedSwissMatchNo(5, 1, 248, 7), 209, "128R8: верхняя тур 3 #209");
assert.equal(fixedSwissMatchNo(5, 9, 248, 7), 219, "128R8: нижняя тур 5 #219");
assert.equal(fixedSwissMatchNo(3, 33, 248, 7), 233, "128R8: 1/8 #233");
{
  const t128 = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto");
  for (let m = 233; m <= 240; m++) {
    const match = t128.matches.find(
      (x) => fixedSwissMatchNo(x.round, x.slot, 248, 7) === m,
    )!;
    const expectWin = 240 + Math.ceil((m - 232) / 2);
    const link = t128.links.find(
      (l) =>
        l.fromRound === match.round &&
        l.fromSlot === match.slot &&
        l.kind === "win",
    );
    assert.ok(link, `128R8: #${m} win link`);
    const got = fixedSwissMatchNo(link!.toRound, link!.toSlot, 248, 7);
    assert.equal(got, expectWin, `128R8: #${m} win → #${expectWin}`);
  }
}
assert.equal(
  fixedSwissTs128R8ElimPlacementByMatchNo(233, true),
  "место 9–16",
  "128R8: подпись 1/8",
);
assert.equal(fixedSwissMatchNo(5, 13, 248, 7), 241, "128R8: 1/4 #241");
assert.equal(fixedSwissMatchNo(6, 1, 248, 7), 245, "128R8: полуфинал #245");
{
  const t128 = buildFixedSwissTemplate(128, "FIXED_SWISS_128R8_1_3_mesto");
  const bad = t128.links.filter(
    (l) =>
      l.fromRound === 5 &&
      l.fromSlot >= 13 &&
      l.fromSlot <= 16 &&
      l.kind === "win" &&
      l.toRound === 3,
  );
  assert.equal(bad.length, 0, "128R8: 1/4 без legacy R5→R3 third-place");
  const q13 = t128.links.filter(
    (l) => l.fromRound === 5 && l.fromSlot === 13 && l.kind === "win",
  );
  assert.equal(q13.length, 1, "128R8: #241 один win link");
  assert.equal(
    fixedSwissMatchNo(q13[0]!.toRound, q13[0]!.toSlot, 248, 7),
    245,
    "128R8: #241 win → #245",
  );
  const quarterWin: Record<number, number> = {
    241: 245,
    242: 245,
    243: 246,
    244: 246,
  };
  for (let m = 241; m <= 244; m++) {
    const match = t128.matches.find(
      (x) => fixedSwissMatchNo(x.round, x.slot, 248, 7) === m,
    )!;
    const wins = t128.links.filter(
      (l) =>
        l.fromRound === match.round &&
        l.fromSlot === match.slot &&
        l.kind === "win",
    );
    const losses = t128.links.filter(
      (l) =>
        l.fromRound === match.round &&
        l.fromSlot === match.slot &&
        l.kind === "loss",
    );
    assert.equal(losses.length, 0, `128R8: #${m} без loss link (место 5–8)`);
    assert.equal(wins.length, 1, `128R8: #${m} один win link`);
    assert.equal(
      fixedSwissMatchNo(wins[0]!.toRound, wins[0]!.toSlot, 248, 7),
      quarterWin[m],
      `128R8: #${m} win → #${quarterWin[m]}`,
    );
    assert.equal(
      fixedSwissTs128R8ElimPlacementByMatchNo(m, true),
      "место 5–8",
      `128R8: подпись 1/4 #${m}`,
    );
    assert.deepEqual(
      fixedSwissProtocolPlace(m, "loser", 248, 7),
      { place: 5, placeTo: 8 },
      `128R8: протокол проигравшего #${m}`,
    );
  }
}
assert.equal(
  isFixedSwissForkEdge(5, 3, 248, 1, 33, 7),
  false,
  "128R8: верхняя тур 3→1/8 — прямая линия, не вилка",
);
assert.equal(
  isFixedSwissForkEdge(3, 5, 248, 33, 13, 7),
  true,
  "128R8: 1/8→1/4 — вилка",
);
assert.equal(
  isFixedSwissForkEdge(5, 6, 248, 13, 1, 7),
  true,
  "128R8: 1/4→полуфинал — вилка",
);

assert.equal(
  shouldAutoAdvanceFixedSwissLink(
    { fromRound: 5, fromSlot: 1, toRound: 3, toSlot: 33, kind: "win" },
    248,
    7,
  ),
  true,
  "#209 → #233 (верхняя тур 3 → 1/8): auto-advance",
);

const MC128 = 247;
const MC128B = 248;
const MR128 = 7;

function mkGrid128R8(twoThird: boolean): BracketMatchView[] {
  const template = buildFixedSwissTemplate(
    128,
    twoThird ? "FIXED_SWISS_128R8_2_3_mesta" : "FIXED_SWISS_128R8_1_3_mesto",
  );
  return template.matches.map((m) => mkMatch(m.round, m.slot));
}

function assertAllWinEdgesDrawn(
  matches: BracketMatchView[],
  matchCount: number,
  maxRound: number,
  label: string,
) {
  const layout = buildFixedSwissBracketLayout(matches, {
    showCardMatchNumber: false,
    showCardHandicap: false,
    showCardPlacement: false,
  });
  const byId = new Map(matches.map((m) => [m.id, m]));
  for (const edge of layout.edges) {
    if (edge.kind !== "win" && edge.kind !== "bye") continue;
    const from = byId.get(edge.fromId)!;
    const to = byId.get(edge.toId)!;
    const link = {
      fromRound: from.round,
      fromSlot: from.slot,
      toRound: to.round,
      toSlot: to.slot,
      kind: "win" as const,
    };
    if (isFixedSwissWinLinkFooterOnly(link, matchCount, maxRound)) continue;
    if (
      isFixedSwissTs128R8LowerTour6FooterWinEdge(link, matchCount, maxRound)
    ) {
      continue;
    }
    const fromCol = fixedSwissMatchColForCount(
      from.round,
      from.slot,
      matchCount,
      maxRound,
    );
    const toCol = fixedSwissMatchColForCount(
      to.round,
      to.slot,
      matchCount,
      maxRound,
    );
    const draw = shouldDrawFixedSwissWinEdge(
      fromCol,
      toCol,
      from.round,
      to.round,
      edge.kind,
      from.slot,
      to.slot,
      matchCount,
      maxRound,
    );
    assert.equal(
      draw,
      true,
      `${label}: SVG #${fixedSwissMatchNo(from.round, from.slot, matchCount, maxRound)}→#${fixedSwissMatchNo(to.round, to.slot, matchCount, maxRound)}`,
    );
  }
}

for (const [twoThird, mc] of [
  [true, MC128],
  [false, MC128B],
] as const) {
  assertAllWinEdgesDrawn(
    mkGrid128R8(twoThird),
    mc,
    MR128,
    twoThird ? "128R8_2_3" : "128R8_1_3",
  );
}

{
  const layout128 = buildFixedSwissBracketLayout(mkGrid128R8(false), {
    showCardMatchNumber: false,
  });
  const negCols = [
    ...new Set(
      [...layout128.positions.values()]
        .map((p) => p.col)
        .filter((c) => c < 0),
    ),
  ].sort((a, b) => a - b);
  assert.deepEqual(
    negCols,
    [-6, -5, -4, -3, -2, -1],
    "128R8: все нижние колонки TS",
  );
  assert.equal(layout128.minCol, -6, "128R8: minCol включает пустую нижнюю тур 4 (−4)");
  assert.equal(layout128.maxCol, 7, "128R8: maxCol до финала");
  assert.equal(
    fixedSwissColumnLabel(-4, MC128B, MR128),
    "Нижняя, тур 4",
    "128R8: подпись нижней тур 4",
  );
  assert.equal(
    fixedSwissColumnLabel(-1, MC128B, MR128),
    "Нижняя, тур 1",
    "128: подпись нижней тур 1",
  );
  assert.equal(
    fixedSwissColumnLabel(-6, MC128B, MR128),
    "Нижняя, тур 6",
    "128: подпись нижней тур 6",
  );
  assert.equal(
    fixedSwissColumnLabel(5, MC128B, MR128),
    "1/4 финала",
    "128R8: подпись 1/4",
  );
  const byCol = new Map<number, number>();
  for (const m of mkGrid128R8(false)) {
    const col = fixedSwissMatchColForCount(m.round, m.slot, MC128B, MR128);
    byCol.set(col, (byCol.get(col) ?? 0) + 1);
  }
  assert.equal(byCol.get(-1), 32, "128R8: нижняя тур 1 — 32");
  assert.equal(byCol.get(-2), 32, "128R8: нижняя тур 2 — 32");
  assert.equal(byCol.get(-3), 16, "128R8: нижняя тур 3 — 16");
  assert.equal(byCol.get(-4), 16, "128R8: нижняя тур 4 — 16 (#193–208)");
  assert.equal(
    layout128.positions.get("r4s1")!.y,
    layout128.positions.get("r3s81")!.y,
    "128R8: #192 и #208 на одной линии",
  );
  assert.equal(
    layout128.positions.get("r4s2")!.y,
    layout128.positions.get("r3s82")!.y,
    "128R8: #191 и #207 на одной линии",
  );
  assert.equal(byCol.get(-5), 8, "128R8: нижняя тур 5 — 8 (#217–224)");
  expectCenterBetween(
    layout128.positions.get("r3s69")!.y,
    layout128.positions.get("r3s82")!.y,
    layout128.positions.get("r3s81")!.y,
    cardH,
    "128R8: #217 между #207 и #208",
  );
  expectCenterBetween(
    layout128.positions.get("r5s11")!.y,
    layout128.positions.get("r3s57")!.y,
    layout128.positions.get("r3s58")!.y,
    cardH,
    "128R8: #221 между #200 и #199",
  );
  assert.equal(byCol.get(-6), 8, "128R8: нижняя тур 6 — 8 (#225–232)");
  assert.equal(byCol.get(0), 64, "128R8: первый тур — 64");
  assert.equal(byCol.get(1), 32, "128R8: верхняя тур 1 — 32");
  assert.equal(byCol.get(2), 16, "128R8: верхняя тур 2 — 16 (#161–#176)");
  assert.equal(fixedSwissTs128R8MatchCol(3, 65), 2, "128R8: #161 в колонке верхней тур 2");
  assert.equal(fixedSwissTs128R8MatchCol(3, 41), 2, "128R8: #165 в колонке верхней тур 2");
  assert.equal(
    layout128.positions.get("r3s65")!.col,
    2,
    "128R8 layout: #161 в верхней тур 2",
  );
  assert.equal(
    layout128.positions.get("r3s41")!.col,
    2,
    "128R8 layout: #165 в верхней тур 2",
  );
  assert.ok(
    layout128.positions.get("r3s65")!.y < layout128.positions.get("r3s41")!.y,
    "128R8: #161–#164 выше #165–#172",
  );
  assert.equal(byCol.get(3), 8, "128R8: верхняя тур 3 — 8 (#209–#216)");
  assert.equal(fixedSwissTs128R8MatchCol(5, 1), 3, "128R8: #209 в колонке верхней тур 3");
  assert.equal(fixedSwissTs128R8MatchCol(5, 8), 3, "128R8: #216 в колонке верхней тур 3");
  for (let n = 209; n <= 216; n++) {
    const found = mkGrid128R8(false).some(
      (m) => fixedSwissMatchNo(m.round, m.slot, MC128B, MR128) === n,
    );
    assert.ok(found, `128R8: верхняя тур 3 включает #${n}`);
  }
  assert.equal(
    layout128.positions.get("r5s1")!.col,
    3,
    "128R8 layout: #209 в верхней тур 3",
  );
  assert.equal(
    layout128.positions.get("r5s8")!.col,
    3,
    "128R8 layout: #216 в верхней тур 3",
  );
  const upper3Ys = Array.from({ length: 8 }, (_, i) =>
    layout128.positions.get(`r5s${i + 1}`)!.y,
  );
  for (let i = 1; i < upper3Ys.length; i++) {
    assert.ok(
      upper3Ys[i - 1]! < upper3Ys[i]!,
      "128R8: #209–#216 сверху вниз",
    );
  }
  expectCenterBetween(
    layout128.positions.get("r5s1")!.y,
    layout128.positions.get("r3s65")!.y,
    layout128.positions.get("r3s66")!.y,
    cardH,
    "128R8: #209 между #161 и #162",
  );
  expectCenterBetween(
    layout128.positions.get("r5s3")!.y,
    layout128.positions.get("r3s41")!.y,
    layout128.positions.get("r3s42")!.y,
    cardH,
    "128R8: #211 между #165 и #166",
  );
  assert.equal(
    layout128.positions.get("r5s1")!.y,
    layout128.positions.get("r3s33")!.y,
    "128R8: #209 и #233 на одной линии",
  );
  assert.equal(
    layout128.positions.get("r5s2")!.y,
    layout128.positions.get("r3s34")!.y,
    "128R8: #210 и #234 на одной линии",
  );
  assert.equal(
    layout128.positions.get("r3s69")!.y,
    layout128.positions.get("r3s73")!.y,
    "128R8: #217 и #225 на одной линии",
  );
  assert.equal(
    layout128.positions.get("r3s72")!.y,
    layout128.positions.get("r3s80")!.y,
    "128R8: #224 и #232 на одной линии",
  );
  expectCenterBetween(
    layout128.positions.get("r5s13")!.y,
    layout128.positions.get("r3s33")!.y,
    layout128.positions.get("r3s34")!.y,
    cardH,
    "128R8: #241 между #233 и #234",
  );
  assert.equal(
    layout128.positions.get("r3s33")!.y,
    layout128.positions.get("r5s1")!.y,
    "128R8: #233 на линии #209",
  );
  {
    const colOrder: Record<number, number[]> = {
      [-4]: Array.from({ length: 16 }, (_, i) => 208 - i),
      [-5]: Array.from({ length: 8 }, (_, i) => 217 + i),
      [-6]: Array.from({ length: 8 }, (_, i) => 225 + i),
    };
    for (const [col, expected] of Object.entries(colOrder)) {
      const nos = mkGrid128R8(false)
        .map((m) => {
          const pos = layout128.positions.get(m.id);
          if (!pos || pos.col !== Number(col)) return null;
          return fixedSwissMatchNo(m.round, m.slot, MC128B, MR128);
        })
        .filter((n): n is number => n != null)
        .sort((a, b) => {
          const ya = layout128.positions.get(
            mkGrid128R8(false).find(
              (m) => fixedSwissMatchNo(m.round, m.slot, MC128B, MR128) === a,
            )!.id,
          )!.y;
          const yb = layout128.positions.get(
            mkGrid128R8(false).find(
              (m) => fixedSwissMatchNo(m.round, m.slot, MC128B, MR128) === b,
            )!.id,
          )!.y;
          return ya - yb;
        });
      assert.deepEqual(nos, expected, `128R8 col ${col} top→bottom`);
    }
  }
  assert.equal(byCol.get(4), 8, "128R8: 1/8 — 8");
  assert.equal(byCol.get(5), 4, "128R8: 1/4 — 4");
  assert.equal(byCol.get(6), 2, "128R8: полуфинал — 2");
  assert.equal(byCol.get(7), 2, "128R8_1_3: финал + бронза — 2");
}

{
  const layout247 = buildFixedSwissBracketLayout(mkGrid128R8(true), {
    showCardMatchNumber: false,
  });
  const layout248 = buildFixedSwissBracketLayout(mkGrid128R8(false), {
    showCardMatchNumber: false,
  });
  for (const m of mkGrid128R8(true)) {
    const m248 = mkGrid128R8(false).find(
      (x) => x.round === m.round && x.slot === m.slot,
    )!;
    assert.deepEqual(
      layout247.positions.get(m.id),
      layout248.positions.get(m248.id),
      `128R8_2_3 layout R${m.round}s${m.slot}`,
    );
  }
  const byCol247 = new Map<number, number>();
  for (const m of mkGrid128R8(true)) {
    const col = fixedSwissMatchColForCount(m.round, m.slot, MC128, MR128);
    byCol247.set(col, (byCol247.get(col) ?? 0) + 1);
  }
  assert.equal(byCol247.get(7), 1, "128R8_2_3: только финал #247 в col 7");
  assert.equal(
    fixedSwissTs128R8ElimPlacementByMatchNo(245, false),
    "3-е место",
    "128R8_2_3: подпись полуфинала",
  );
  assert.equal(
    fixedSwissTs128R8ElimPlacementByMatchNo(245, true),
    "полуфинал",
    "128R8_1_3: подпись полуфинала",
  );
}

assert.equal(
  shouldDrawFixedSwissWinEdge(-3, -4, 4, 3, "win", 16, 64, MC128, MR128),
  true,
  "128R8: #177→#193 (нижняя тур 3 → тур 4)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, -5, 3, 3, "win", 64, 72, MC128, MR128),
  true,
  "128R8: #193→#224 (нижняя тур 4 → тур 5)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-4, -5, 3, 3, "win", 82, 69, MC128, MR128),
  true,
  "128R8: #207→#217 (нижняя тур 4 → тур 5)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-5, -6, 3, 3, "win", 69, 73, MC128, MR128),
  true,
  "128R8: #217→#225 (нижняя тур 5 → тур 6)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-6, 4, 3, 3, "win", 73, 40, MC128, MR128),
  false,
  "128R8: #225→#240 без SVG (footer only)",
);
assert.equal(
  shouldAutoAdvanceFixedSwissLink(
    { fromRound: 3, fromSlot: 73, toRound: 3, toSlot: 40, kind: "win" },
    MC128,
    MR128,
  ),
  true,
  "128R8: #225→#240 auto-advance",
);
assert.equal(
  isFixedSwissCrossAtSourceYEdge(3, 3, 64, 72, MC128, MR128),
  false,
  "128R8: #193→#224 не cross-to-quarter",
);
assert.equal(
  isFixedSwissCrossAtSourceYEdge(3, 3, 73, 40, MC128, MR128),
  false,
  "128R8: #225→#240 не cross-to-quarter",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(4, 5, 3, 5, "win", 33, 13, MC128, MR128),
  true,
  "128R8: #233→#241 (1/8 → 1/4)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(5, 6, 5, 6, "win", 13, 1, MC128, MR128),
  true,
  "128R8: #241→#245 (1/4 → полуфинал)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(4, 6, 3, 6, "win", 37, 2, MC128, MR128),
  false,
  "128R8: 1/8 больше не идёт напрямую в полуфинал",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(3, 4, 5, 3, "win", 1, 33, MC128, MR128),
  true,
  "128R8: #209→#233 (верхняя тур 3 → 1/8)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(3, 4, 5, 3, "win", 2, 34, MC128, MR128),
  true,
  "128R8: #210→#234 (верхняя тур 3 → 1/8)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(2, 3, 3, 5, "win", 41, 3, MC128, MR128),
  true,
  "128R8: #165→#211 (верхняя тур 2 → верхняя тур 3)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(1, 2, 2, 3, "win", 57, 49, MC128, MR128),
  true,
  "128R8: #121→#173 (R2 → верхняя 2)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(2, 3, 3, 5, "win", 49, 7, MC128, MR128),
  true,
  "128R8: #173→#215 (верхняя тур 2 → верхняя тур 3)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(1, 2, 2, 3, "win", 33, 65, MC128, MR128),
  true,
  "128R8: #97→#161 fork",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(-3, 3, 4, 5, "win", 1, 9, MC128, MR128),
  true,
  "128R8: #192→#219 (нижняя тур 3 → 1/4)",
);
assert.equal(
  shouldDrawFixedSwissWinEdge(6, 7, 6, 7, "win", 1, 1, MC128, MR128),
  true,
  "128R8: полуфинал → финал",
);

for (const [matchCount, maxRound] of [
  [14, 4],
  [28, 5],
  [56, 7],
  [59, 7],
  [111, 7],
  [112, 7],
  [115, 7],
  [119, 7],
  [247, 7],
  [248, 7],
  [219, 7],
  [220, 7],
] as const) {
  const links = getFixedSwissLinksForMatchCount(matchCount, maxRound);
  for (const link of links) {
    const auto = shouldAutoAdvanceFixedSwissLink(link, matchCount, maxRound);
    const footerOnly = isFixedSwissWinLinkFooterOnly(link, matchCount, maxRound);
    if (link.kind === "loss") {
      assert.equal(auto, true, `loss link R${link.fromRound}S${link.fromSlot} (${matchCount})`);
    } else if (footerOnly) {
      assert.equal(
        auto,
        false,
        `footer win R${link.fromRound}S${link.fromSlot} (${matchCount})`,
      );
    } else {
      assert.equal(
        auto,
        true,
        `real win R${link.fromRound}S${link.fromSlot}→R${link.toRound}S${link.toSlot} (${matchCount})`,
      );
    }
  }
}

assert.equal(
  buildFixedSwissTemplate(256, "FIXED_SWISS_256R8_1_3_mesto").matches.length,
  FIXED_SWISS_TS256R16_MATCH_COUNT,
  "FIXED_SWISS_256R8_1_3_mesto: R1–R5",
);
{
  const t256 = buildFixedSwissTemplate(256, "FIXED_SWISS_256R8_1_3_mesto");
  assertFixedSwissTs256R1Routing(t256.links);
  assertFixedSwissTs256Tour1Routing(t256.links);
  assertFixedSwissTs256Tour2Routing(t256.links);
  assertFixedSwissTs256Tour3Routing(t256.links);
  assertFixedSwissTs256Tour4Routing(t256.links);
  assertFixedSwissTs256Tour5Routing(t256.links);
  for (const slot of [1, 2, 53, 127]) {
    const win = t256.links.find(
      (l) => l.fromRound === 1 && l.fromSlot === slot && l.kind === "win",
    );
    const loss = t256.links.find(
      (l) => l.fromRound === 1 && l.fromSlot === slot && l.kind === "loss",
    );
    assert.ok(win && loss, `256 R1 links slot ${slot}`);
    const winNo = fixedSwissMatchNo(
      win.toRound,
      win.toSlot,
      FIXED_SWISS_TS256R16_MATCH_COUNT,
      5,
    );
    const lossNo = fixedSwissMatchNo(
      loss.toRound,
      loss.toSlot,
      FIXED_SWISS_TS256R16_MATCH_COUNT,
      5,
    );
    const pair = Math.ceil(slot / 2);
    assert.equal(winNo, 128 + pair, `#${slot} win→#${winNo}`);
    assert.equal(lossNo, 128 + 64 + pair, `#${slot} loss→#${lossNo}`);
  }
  assert.equal(t256.matches.filter((m) => m.round > 10).length, 0);
  assert.equal(t256.matches.length, 496);
  assert.equal(fixedSwissTs256LowerTour4WinMatchNo(33), 433);
  assert.equal(fixedSwissTs256LowerTour6MatchNo(1), 449);
  assert.equal(fixedSwissTs256LowerTour6MatchNo(16), 464);
  assert.equal(fixedSwissTs256UpperTour2WinMatchNo(0), 417);
  assert.equal(fixedSwissTs256UpperTour2WinMatchNo(15), 432);
  assert.equal(fixedSwissTs256LowerTour2LossMatchNo(257), 288);
  assert.equal(fixedSwissTs256LowerTour2LossMatchNo(262), 283);
  assert.equal(fixedSwissTs256LowerTour3LossMatchNo(353), 396);
  assert.equal(fixedSwissTs256LowerTour3LossMatchNo(354), 395);
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(469, true), "место 17–32");
  assert.equal(fixedSwissTs256UpperTour1LossMatchNo(0, false), 272);
  assert.equal(fixedSwissTs256UpperTour1LossMatchNo(0, true), 271);
  assert.equal(fixedSwissTs256UpperTour1LossMatchNo(8, false), 288);
  assert.equal(fixedSwissTs256UpperTour1LossMatchNo(8, true), 287);
  assert.equal(fixedSwissTs256UpperTour1LossMatchNo(10, true), 283);
  assert.equal(fixedSwissTs256UpperTour1LossMatchNo(12, false), 280);
  assert.equal(fixedSwissTs256UpperTour2LossMatchNo(65), 388);
  assert.equal(fixedSwissTs256UpperTour2LossMatchNo(66), 387);
  assert.equal(fixedSwissTs256UpperTour2LossMatchNo(77), 400);
  assert.equal(fixedSwissTs256UpperTour2LossMatchNo(78), 399);
  assert.equal(fixedSwissTs256UpperTour2LossMatchNo(81), 404);
  assert.equal(fixedSwissTs256UpperTour2LossMatchNo(85), 408);
  assert.equal(fixedSwissTs256UpperTour3LossMatchNo(0), 451);
  assert.equal(fixedSwissTs256UpperTour3LossMatchNo(1), 452);
  assert.equal(fixedSwissTs256UpperTour3LossMatchNo(6), 453);
  assert.equal(fixedSwissTs256UpperTour3LossMatchNo(7), 454);
  assert.equal(fixedSwissTs256UpperTour3LossMatchNo(8), 459);
  assert.equal(fixedSwissTs256UpperTour3LossMatchNo(9), 460);
  assert.equal(fixedSwissTs256UpperTour3LossMatchNo(10), 457);
  assert.equal(fixedSwissTs256UpperTour3LossMatchNo(11), 458);
  assert.equal(fixedSwissTs256UpperTour3LossMatchNo(12), 463);
  assert.equal(fixedSwissTs256UpperTour3LossMatchNo(13), 464);
  assert.equal(fixedSwissTs256UpperTour3LossMatchNo(14), 461);
  assert.equal(fixedSwissTs256UpperTour3LossMatchNo(15), 462);
  assert.equal(
    fixedSwissTs256LowerTour6WinTarget(456)?.toSlot,
    25,
    "LT6 #456 → 1/16 slot 25 (#473)",
  );
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(193, true), "место 193–256");
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(257, true), "место 129–192");
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(353, true), "место 97–128");
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(385, true), "место 65–96");
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(433, true), "место 49–64");
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(449, true), "место 33–48");
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(1, true), null);
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(128, true), null);
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(129, true), null);
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(321, true), null);
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(417, true), null);
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(465, true), "место 17–32");
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(481, true), "место 9–16");
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(489, true), "место 5–8");
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(493, true), "полуфинал");
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(495, true), "место 1–2");
  assert.equal(fixedSwissTs256R16PlacementByMatchNo(496, true), "матч за 3–4 место");
  const layout256 = buildFixedSwissBracketLayout(
    t256.matches.map((m) => ({
      id: `r${m.round}s${m.slot}`,
      round: m.round,
      slot: m.slot,
      status: "SCHEDULED",
      winnerTeamId: null,
      team1: null,
      team2: null,
    })),
  );
  assert.ok(Number.isFinite(layout256.totalHeight), "256R16 layout height");
  for (const pos of layout256.positions.values()) {
    assert.ok(Number.isFinite(pos.y), "256R16 position y");
  }
  const fin256 = layout256.positions.get("r9s1");
  const bronze256 = layout256.positions.get("r10s1");
  assert.ok(fin256 && bronze256, "256 final/bronze positions");
  assert.equal(bronze256.col, fin256.col, "#496 same column as #495");
  const finH256 = layout256.cardHeights?.get("r9s1") ?? FIXED_SWISS_CARD_H;
  assert.equal(bronze256.y, fin256.y + finH256 + 12, "#496 under #495");
  const matchById256 = new Map(
    t256.matches.map((m) => [
      `r${m.round}s${m.slot}`,
      { round: m.round, slot: m.slot },
    ]),
  );
  const getFromY256 = (
    fromId: string,
    toId: string,
    fromTeamSlot: 1 | 2,
    toTeamSlot: 1 | 2,
    kind: "win" | "loss",
  ) => {
    const fromPos = layout256.positions.get(fromId);
    const toPos = layout256.positions.get(toId);
    if (!fromPos || !toPos) return undefined;
    return gridFixedEdgePoints(
      fromPos,
      toPos,
      fromTeamSlot,
      toTeamSlot,
      kind,
      layout256.minCol,
    ).from.y;
  };
  const r23Trunk256 = fixedSwissForkTrunkYByTarget(
    2,
    3,
    layout256.edges,
    getFromY256,
    matchById256,
    FIXED_SWISS_TS256R16_MATCH_COUNT,
    10,
  );
  const r23Trunk256NoMr = fixedSwissForkTrunkYByTarget(
    2,
    3,
    layout256.edges,
    getFromY256,
    matchById256,
    FIXED_SWISS_TS256R16_MATCH_COUNT,
  );
  assert.ok(r23Trunk256.size >= 32, "256 UT1→UT2 fork trunks with maxRound");
  assert.equal(r23Trunk256NoMr.size, 0, "256 fork trunks require maxRound");
  assert.equal(
    isFixedSwissSemiFinalForkEdge(4, 5, FIXED_SWISS_TS256R16_MATCH_COUNT, 10),
    false,
    "256 R4→R5 is not semi fork",
  );
  assert.equal(
    isFixedSwissForkEdge(4, 5, FIXED_SWISS_TS256R16_MATCH_COUNT, 93, 13, 10),
    false,
    "256 LT5→LT6 track is 1:1, not fork",
  );
  const fp445 = layout256.positions.get("r4s93");
  const tp461 = layout256.positions.get("r5s13");
  assert.ok(fp445 && tp461, "445/461 positions");
  const pts445 = gridFixedEdgePoints(
    fp445,
    tp461,
    1,
    1,
    "win",
    layout256.minCol,
  );
  const path445 = gridFixedConnectorPath(
    pts445.from,
    pts445.to,
    "win",
    -5,
    -6,
    layout256.minCol,
    FIXED_SWISS_COL_W,
    13,
  );
  assert.match(path445, /^M [\d.]+ [\d.]+ H [\d.]+ V [\d.]+ H/, "#445→#461 short H–V–H");
  assert.doesNotMatch(path445, /V \d+ V/, "#445→#461 no fork trunk bus");
  const p481 = layout256.positions.get("r6s1");
  const p465 = layout256.positions.get("r5s17");
  const p417 = layout256.positions.get("r4s65");
  assert.ok(p481 && p465 && p417, "481/465/417 positions");
  assert.ok(
    Math.abs(p481.y - (p465.y + layout256.positions.get("r5s18")!.y) / 2) < 80,
    "256 1/8 #481 between its 1/16 parents",
  );
  assert.ok(
    Math.abs(p465.y - p417.y) < 80,
    "256 1/16 #465 aligned with UT3 #417",
  );
  assert.equal(
    shouldDrawFixedSwissWinEdge(3, 4, 4, 5, "win", 65, 17, FIXED_SWISS_TS256R16_MATCH_COUNT, 10),
    true,
    "256 UT3→1/16: short win line",
  );
  assert.equal(
    shouldDrawFixedSwissWinEdge(5, 6, 6, 7, "win", 1, 1, FIXED_SWISS_TS256R16_MATCH_COUNT, 10),
    true,
    "256 #481→#489 fork",
  );
  assert.equal(
    shouldDrawFixedSwissWinEdge(5, 6, 6, 7, "win", 2, 1, FIXED_SWISS_TS256R16_MATCH_COUNT, 10),
    true,
    "256 #482→#489 fork",
  );
  assert.equal(
    isFixedSwissSemiFinalForkEdge(6, 7, FIXED_SWISS_TS256R16_MATCH_COUNT, 10),
    true,
    "256 1/8→1/4 is olympic fork",
  );
  assert.equal(
    isFixedSwissSemiFinalForkEdge(8, 9, FIXED_SWISS_TS256R16_MATCH_COUNT, 10),
    true,
    "256 semi→final is olympic fork",
  );
  assert.equal(
    shouldAutoAdvanceFixedSwissLink(
      { fromRound: 5, fromSlot: 1, toRound: 5, toSlot: 17, kind: "win" },
      FIXED_SWISS_TS256R16_MATCH_COUNT,
      10,
    ),
    true,
    "256 LT6→1/16 auto-advance (no SVG line)",
  );
}

console.log("fixed swiss layout tests passed");
