import {
  groupMatchesByRound,
  matchAutopassBye,
  type BracketMatchView,
} from "@/lib/bracket-view";
import {
  findFixedSwissLink,
  fixedSwiss168MatchNo,
  fixedSwissMatchNo,
  fixedSwissTsMatchNo,
  getFixedSwissLinksForMatchCount,
  inferFixedSwissGridSize,
  isFixedSwiss168LegacyMatchCount,
  isFixedSwiss168MatchCount,
  isFixedSwissTsBronzeMatchCount,
  isFixedSwissTsMatchCount,
  isFixedSwissTsLegacy27SixRound,
  isFixedSwissTsLegacy29MatchCount,
} from "@/lib/fixed-swiss-grid";
import {
  fixedSwissTs32OlympicToQuarterTarget,
  fixedSwissTs64OlympicToQuarterTarget,
  isFixedSwissTs32BronzeMatchCount,
  isFixedSwissTs32MatchCount,
  isFixedSwissTs64BronzeMatchCount,
  isFixedSwissTs64MatchCount,
  isOutdatedFixedSwiss32Bracket,
  tsMaxRound,
  tsPostR3SlotCount,
} from "@/lib/fixed-swiss-ts-grid";
import {
  GRID_CARD_W,
  GRID_LABEL_OFFSET,
  GRID_PAD,
  gridCardHeight,
  teamDividerY,
  type SwissBracketEdge,
  type SwissBracketLayout,
  type SwissEdgeKind,
  type SwissMatchPosition,
} from "@/lib/swiss-bracket-layout";

/** Эталон layout/UI 16→8 — docs/BRACKET_REFERENCE_16_8.md */
export const BRACKET_REFERENCE_VARIANT = "fixed-swiss-16-8-27" as const;

export const FIXED_SWISS_COL_W = 248;
export const FIXED_SWISS_CARD_W = GRID_CARD_W;
/** Зазор между gutter и левым краем карточки — линия не «наезжает» на блок. */
const FIXED_SWISS_LINE_ENTRY_GAP = 12;
/** До 3 строк подвала: место, проигравший, победитель. */
export const FIXED_SWISS_CARD_H = gridCardHeight(true, 3);
export const FIXED_SWISS_BRACKET_UNIT = 184;

/** Зазор между финалом (#27) и матчем за 3–4 (#28) в колонке «Финал». */
const FIXED_SWISS_BRONZE_BELOW_GAP = 12;

/** Макс. вертикальный скачок линии победы — длиннее не рисуем (зеркало нижней → крест). */
export const FIXED_SWISS_WIN_EDGE_MAX_DY = FIXED_SWISS_BRACKET_UNIT * 2;
const COL_COLLISION_GAP = 10;

function buildMatchNumbers(
  matches: BracketMatchView[],
  matchCount: number,
  maxRound: number,
): Map<string, number> {
  const map = new Map<string, number>();
  if (isFixedSwiss168MatchCount(matchCount)) {
    for (const m of matches) {
      map.set(
        m.id,
        fixedSwissMatchNo(m.round, m.slot, matchCount, maxRound),
      );
    }
    return map;
  }
  const sorted = [...matches].sort((a, b) => a.round - b.round || a.slot - b.slot);
  sorted.forEach((m, i) => map.set(m.id, i + 1));
  return map;
}

function parentSlots(
  round: number,
  slot: number,
  half: number,
): [number, number] {
  if (slot <= half) {
    return [2 * slot - 1, 2 * slot];
  }
  const idx = slot - half;
  return [2 * idx - 1, 2 * idx];
}

/** Колонка classic: тур 1 — центр, ±(тур−1). */
export function fixedSwissMatchCol(
  round: number,
  slot: number,
  matchesPerRound: number,
): number {
  if (round === 1) return 0;
  const half = matchesPerRound / 2;
  const depth = round - 1;
  return slot <= half ? depth : -depth;
}

/** Колонки legacy 27 встреч (7 колонок). */
export function fixedSwiss168MatchCol(round: number, slot: number): number {
  if (round === 1) return 0;
  if (round === 2 && slot <= 4) return -1;
  if (round === 2) return 1;
  if (round === 3 && slot <= 4) return -2;
  if (round === 3) return 2;
  if (round === 4) return 3;
  return 4;
}

/** Колонки TS 27 встреч (7 колонок). */
export function fixedSwissTsMatchCol(
  round: number,
  slot: number,
  matchCount?: number,
): number {
  if (matchCount !== undefined && isFixedSwissTsLegacy29MatchCount(matchCount)) {
    return fixedSwissTsLegacy29MatchCol(round, slot);
  }
  if (round === 1) return 0;
  if (round === 2 && slot <= 4) return -1;
  if (round === 2) return 1;
  if (round === 3 && slot <= 4) return -2;
  if (round === 3) return 2;
  if (round === 4) return 3;
  if (round === 5) return 4;
  return 4;
}

/** Колонки TS 29 встреч (устаревшая, 9 колонок). */
export function fixedSwissTsLegacy29MatchCol(round: number, slot: number): number {
  if (round === 1) return 0;
  if (round === 2 && slot <= 4) return -1;
  if (round === 2) return 1;
  if (round === 3 && slot <= 4) return -2;
  if (round === 3) return 2;
  if (round === 4 && slot <= 2) return -3;
  if (round === 4) return -4;
  if (round === 5) return 3;
  return 4;
}

export function fixedSwissMatchColForCount(
  round: number,
  slot: number,
  matchCount: number,
  maxRound?: number,
): number {
  if (isFixedSwissTs32MatchCount(matchCount) || isFixedSwissTs32BronzeMatchCount(matchCount)) {
    return fixedSwissTs32MatchCol(round, slot);
  }
  if (isFixedSwissTs64MatchCount(matchCount) || isFixedSwissTs64BronzeMatchCount(matchCount)) {
    return fixedSwissTs64MatchCol(round, slot);
  }
  if (isOutdatedFixedSwiss32Bracket(matchCount)) {
    return fixedSwissTs32OutdatedMatchCol(round, slot);
  }
  if (isFixedSwissTsLegacy29MatchCount(matchCount)) {
    return fixedSwissTsLegacy29MatchCol(round, slot);
  }
  if (isFixedSwiss168LegacyMatchCount(matchCount, maxRound)) {
    return fixedSwiss168MatchCol(round, slot);
  }
  if (isFixedSwissTsMatchCount(matchCount, maxRound)) {
    return fixedSwissTsMatchCol(round, slot, matchCount);
  }
  return fixedSwiss168MatchCol(round, slot);
}

export function fixedGridColLeft(col: number, minCol: number) {
  return (col - minCol) * FIXED_SWISS_COL_W + GRID_PAD;
}

export function fixedGridCardLeft(col: number, minCol: number) {
  return (
    fixedGridColLeft(col, minCol) +
    (FIXED_SWISS_COL_W - FIXED_SWISS_CARD_W) / 2
  );
}

function centerBetweenParents(
  y1: number,
  y2: number,
  cardH: number,
): number {
  const c1 = y1 + cardH / 2;
  const c2 = y2 + cardH / 2;
  return (c1 + c2) / 2 - cardH / 2;
}

export function fixedSwissMatchTop(
  round: number,
  slot: number,
  matchesPerRound: number,
  _maxRound?: number,
  cardH: number = FIXED_SWISS_CARD_H,
  prevRoundY?: Map<number, number>,
): number {
  const unit = FIXED_SWISS_BRACKET_UNIT;
  const half = matchesPerRound / 2;

  if (round === 1) {
    return (slot - 1) * unit + (unit - cardH) / 2;
  }

  const [s1, s2] = parentSlots(round, slot, half);
  if (prevRoundY) {
    return centerBetweenParents(prevRoundY.get(s1)!, prevRoundY.get(s2)!, cardH);
  }

  const t1 = fixedSwissMatchTop(round - 1, s1, matchesPerRound, _maxRound, cardH);
  const t2 = fixedSwissMatchTop(round - 1, s2, matchesPerRound, _maxRound, cardH);
  return centerBetweenParents(t1, t2, cardH);
}

function resolveRoundColumnCollisions(
  roundMatches: BracketMatchView[],
  positions: Map<string, SwissMatchPosition>,
  cardH: number,
  half: number,
) {
  const byCol = new Map<number, BracketMatchView[]>();
  for (const m of roundMatches) {
    const col = positions.get(m.id)!.col;
    const list = byCol.get(col) ?? [];
    list.push(m);
    byCol.set(col, list);
  }

  for (const colMatches of byCol.values()) {
    const isWinnerCol = colMatches[0]!.slot <= half;
    const sideMatches = colMatches.filter((m) =>
      isWinnerCol ? m.slot <= half : m.slot > half,
    );

    let lastBottom = -Infinity;
    for (let g = 0; g < half / 2; g++) {
      const localSlots = [g + 1, g + 3];
      const group = sideMatches
        .filter((m) => {
          const local = isWinnerCol ? m.slot : m.slot - half;
          return localSlots.includes(local);
        })
        .sort((a, b) => a.slot - b.slot);

      for (const m of group) {
        const pos = positions.get(m.id)!;
        let y = pos.y;
        if (y < lastBottom + COL_COLLISION_GAP) {
          y = lastBottom + COL_COLLISION_GAP;
          positions.set(m.id, { ...pos, y });
        }
        lastBottom = y + cardH;
      }
    }

    const sorted = [...sideMatches].sort(
      (a, b) => positions.get(a.id)!.y - positions.get(b.id)!.y,
    );
    lastBottom = -Infinity;
    for (const m of sorted) {
      const pos = positions.get(m.id)!;
      let y = pos.y;
      if (y < lastBottom + COL_COLLISION_GAP) {
        y = lastBottom + COL_COLLISION_GAP;
        positions.set(m.id, { ...pos, y });
      }
      lastBottom = y + cardH;
    }
  }
}

export function fixedSwissBracketHeight(
  matchesPerRound: number,
  cardH: number = FIXED_SWISS_CARD_H,
): number {
  const unit = FIXED_SWISS_BRACKET_UNIT;
  return matchesPerRound * unit - (unit - cardH) / 2;
}

function teamIdInSlot(match: BracketMatchView, slot: 1 | 2): string | undefined {
  return slot === 1 ? match.team1?.id : match.team2?.id;
}

export function fixedSwissFromTeamSlot(
  match: BracketMatchView,
  kind: "win" | "loss",
): 1 | 2 {
  const { isBye, phantomRow } = matchAutopassBye(match);
  if (isBye && kind === "loss" && phantomRow) {
    return phantomRow;
  }
  if (match.winnerTeamId) {
    const winIs1 = match.winnerTeamId === match.team1?.id;
    if (kind === "win") return winIs1 ? 1 : 2;
    return winIs1 ? 2 : 1;
  }
  if (match.round === 1) {
    return match.slot % 2 === 1 ? 1 : 2;
  }
  return kind === "win" ? 1 : 2;
}

function buildFixedTemplateEdges(
  matches: BracketMatchView[],
  matchCount: number,
  maxRound: number,
): SwissBracketEdge[] {
  const links = getFixedSwissLinksForMatchCount(matchCount, maxRound);
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }

  const edges: SwissBracketEdge[] = [];
  for (const match of matches) {
    const { isBye } = matchAutopassBye(match);

    for (const kind of ["win", "loss"] as const) {
      const link = findFixedSwissLink(links, match.round, match.slot, kind);
      if (!link) continue;
      const to = byRoundSlot.get(`${link.toRound}:${link.toSlot}`);
      if (!to) continue;

      const fromTeamSlot = fixedSwissFromTeamSlot(match, kind);
      const teamId =
        teamIdInSlot(match, fromTeamSlot) ??
        `${match.id}-${kind}-${fromTeamSlot}`;

      edges.push({
        fromId: match.id,
        toId: to.id,
        teamId,
        kind: kind === "loss" ? "loss" : isBye ? "bye" : "win",
        fromTeamSlot,
        toTeamSlot: link.toTeam,
      });
    }
  }
  return edges;
}

function yAt(round: number, slot: number, slotY: Map<string, number>): number {
  return slotY.get(`${round}:${slot}`)!;
}

/** Разнести карточки в одной колонке, сохранив slotY для следующих туров. */
function resolveFixedColCollisions(
  positions: Map<string, SwissMatchPosition>,
  slotY: Map<string, number>,
  matchIds: string[],
  cardH: number,
  gap: number,
) {
  const sorted = [...matchIds].sort(
    (a, b) => positions.get(a)!.y - positions.get(b)!.y,
  );
  let lastBottom = -Infinity;
  for (const id of sorted) {
    const pos = positions.get(id)!;
    let y = pos.y;
    if (y < lastBottom + gap) y = lastBottom + gap;
    if (y !== pos.y) {
      positions.set(id, { ...pos, y });
    }
    const m = id.match(/^r(\d+)s(\d+)$/);
    if (m) slotY.set(`${m[1]}:${m[2]}`, y);
    lastBottom = y + cardH;
  }
}

/** Разнести карточки в заданном порядке слотов (1/4: #53→#54→#55→#56). */
function resolveFixedColCollisionsInOrder(
  positions: Map<string, SwissMatchPosition>,
  slotY: Map<string, number>,
  matchIds: string[],
  cardH: number,
  gap: number,
) {
  let lastBottom = -Infinity;
  for (const id of matchIds) {
    const pos = positions.get(id);
    if (!pos) continue;
    let y = Math.max(pos.y, lastBottom + gap);
    if (y !== pos.y) {
      positions.set(id, { ...pos, y });
    }
    const m = id.match(/^r(\d+)s(\d+)$/);
    if (m) slotY.set(`${m[1]}:${m[2]}`, y);
    lastBottom = y + cardH;
  }
}

/** Позиции Y для формата 16-8 по графу переходов. */
function build168Positions(
  matches: BracketMatchView[],
  cardH: number,
): Map<string, SwissMatchPosition> {
  const positions = new Map<string, SwissMatchPosition>();
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }

  const slotY = new Map<string, number>();
  const unit = FIXED_SWISS_BRACKET_UNIT;

  for (let slot = 1; slot <= 8; slot++) {
    const y = (slot - 1) * unit + (unit - cardH) / 2;
    slotY.set(`1:${slot}`, y);
    const m = byRoundSlot.get(`1:${slot}`);
    if (m) positions.set(m.id, { col: 0, y });
  }

  for (let slot = 1; slot <= 4; slot++) {
    const y = centerBetweenParents(
      yAt(1, 2 * slot - 1, slotY),
      yAt(1, 2 * slot, slotY),
      cardH,
    );
    slotY.set(`2:${slot}`, y);
    const lower = byRoundSlot.get(`2:${slot}`);
    if (lower) positions.set(lower.id, { col: -1, y });
    const upper = byRoundSlot.get(`2:${slot + 4}`);
    if (upper) positions.set(upper.id, { col: 1, y });
    slotY.set(`2:${slot + 4}`, y);
  }

  for (let k = 1; k <= 4; k++) {
    const crossY = yAt(2, k, slotY);
    slotY.set(`3:${k}`, crossY);
    const cross = byRoundSlot.get(`3:${k}`);
    if (cross) positions.set(cross.id, { col: -2, y: crossY });
  }

  for (let q = 1; q <= 2; q++) {
    const slot = 4 + q;
    const quarterY = centerBetweenParents(
      yAt(2, 2 * q + 3, slotY),
      yAt(2, 2 * q + 4, slotY),
      cardH,
    );
    slotY.set(`3:${slot}`, quarterY);
    const quarter = byRoundSlot.get(`3:${slot}`);
    if (quarter) positions.set(quarter.id, { col: 2, y: quarterY });
  }

  for (let slot = 1; slot <= 2; slot++) {
    const y = centerBetweenParents(
      yAt(3, 2 * slot + 3, slotY),
      yAt(3, 2 * slot + 4, slotY),
      cardH,
    );
    slotY.set(`4:${slot}`, y);
    const semi = byRoundSlot.get(`4:${slot}`);
    if (semi) positions.set(semi.id, { col: 3, y });
  }

  const finalY = centerBetweenParents(yAt(4, 1, slotY), yAt(4, 2, slotY), cardH);
  const fin = byRoundSlot.get("5:1");
  if (fin) positions.set(fin.id, { col: 4, y: finalY });

  return positions;
}

function buildTsPositions(
  matches: BracketMatchView[],
  cardH: number,
  matchCount: number,
  maxRound: number,
): Map<string, SwissMatchPosition> {
  if (isFixedSwissTs32BronzeMatchCount(matchCount)) {
    return buildTsPositions32Bronze(matches, cardH);
  }
  if (isFixedSwissTs32MatchCount(matchCount)) {
    return buildTsPositions32(matches, cardH);
  }
  if (isFixedSwissTs64BronzeMatchCount(matchCount)) {
    return buildTsPositions64Bronze(matches, cardH);
  }
  if (isFixedSwissTs64MatchCount(matchCount)) {
    return buildTsPositions64(matches, cardH);
  }
  if (isOutdatedFixedSwiss32Bracket(matchCount)) {
    return buildTsPositionsScaled(matches, cardH, 16);
  }
  if (isFixedSwissTsBronzeMatchCount(matchCount)) {
    return buildTsPositions28Bronze(matches, cardH);
  }
  if (isFixedSwissTsLegacy29MatchCount(matchCount)) {
    return buildTsPositionsLegacy29(matches, cardH);
  }
  if (isFixedSwissTsLegacy27SixRound(matchCount, maxRound)) {
    return buildTsPositions27SixRound(matches, cardH);
  }
  return buildTsPositionsScaled(matches, cardH, 8);
}

/** Устаревшая 27×6: 2×1/4, место 5–6, полуфинал, финал. */
function buildTsPositions27SixRound(
  matches: BracketMatchView[],
  cardH: number,
): Map<string, SwissMatchPosition> {
  const positions = new Map<string, SwissMatchPosition>();
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }

  const slotY = new Map<string, number>();
  const unit = FIXED_SWISS_BRACKET_UNIT;

  for (let slot = 1; slot <= 8; slot++) {
    const y = (slot - 1) * unit + (unit - cardH) / 2;
    slotY.set(`1:${slot}`, y);
    const m = byRoundSlot.get(`1:${slot}`);
    if (m) positions.set(m.id, { col: 0, y });
  }

  for (let slot = 1; slot <= 4; slot++) {
    const y = centerBetweenParents(
      yAt(1, 2 * slot - 1, slotY),
      yAt(1, 2 * slot, slotY),
      cardH,
    );
    slotY.set(`2:${slot}`, y);
    slotY.set(`2:${slot + 4}`, y);
    const lower = byRoundSlot.get(`2:${slot}`);
    if (lower) positions.set(lower.id, { col: -1, y });
    const upper = byRoundSlot.get(`2:${slot + 4}`);
    if (upper) positions.set(upper.id, { col: 1, y });
  }

  for (let q = 1; q <= 2; q++) {
    const slot = 4 + q;
    const quarterY = centerBetweenParents(
      yAt(2, 2 * q + 3, slotY),
      yAt(2, 2 * q + 4, slotY),
      cardH,
    );
    slotY.set(`3:${slot}`, quarterY);
    const quarter = byRoundSlot.get(`3:${slot}`);
    if (quarter) positions.set(quarter.id, { col: 2, y: quarterY });
  }

  const crossIds: string[] = [];
  for (let k = 1; k <= 4; k++) {
    const crossY = yAt(2, 5 - k, slotY);
    slotY.set(`3:${k}`, crossY);
    const cross = byRoundSlot.get(`3:${k}`);
    if (cross) {
      positions.set(cross.id, { col: -2, y: crossY });
      crossIds.push(cross.id);
    }
  }
  resolveFixedColCollisions(positions, slotY, crossIds, cardH, COL_COLLISION_GAP);

  const col3Ids: string[] = [];
  for (let slot = 1; slot <= 2; slot++) {
    const y = yAt(3, slot + 4, slotY);
    slotY.set(`4:${slot}`, y);
    const place = byRoundSlot.get(`4:${slot}`);
    if (place) {
      positions.set(place.id, { col: 3, y });
      col3Ids.push(place.id);
    }
  }

  const semi1Y = centerBetweenParents(yAt(3, 5, slotY), yAt(3, 6, slotY), cardH);
  slotY.set(`5:1`, semi1Y);
  const semi1 = byRoundSlot.get("5:1");
  if (semi1) {
    positions.set(semi1.id, { col: 3, y: semi1Y });
    col3Ids.push(semi1.id);
  }

  const semi2Y = centerBetweenParents(yAt(4, 1, slotY), yAt(4, 2, slotY), cardH);
  slotY.set(`5:2`, semi2Y);
  const semi2 = byRoundSlot.get("5:2");
  if (semi2) {
    positions.set(semi2.id, { col: 3, y: semi2Y });
    col3Ids.push(semi2.id);
  }
  resolveFixedColCollisions(positions, slotY, col3Ids, cardH, COL_COLLISION_GAP);

  const finalY = centerBetweenParents(yAt(5, 1, slotY), yAt(5, 2, slotY), cardH);
  const fin = byRoundSlot.get("6:1");
  if (fin) positions.set(fin.id, { col: 4, y: finalY });

  return positions;
}

/** TS 27/55 — масштабируемая сетка 16→8 / 32→16 (олимпийка с 1/4 / с 1/8). */
function buildTsPositionsScaled(
  matches: BracketMatchView[],
  cardH: number,
  half2: number,
): Map<string, SwissMatchPosition> {
  const half1 = half2 / 2;
  const maxRound = tsMaxRound(half2);
  const positions = new Map<string, SwissMatchPosition>();
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }

  const slotY = new Map<string, number>();
  const unit = FIXED_SWISS_BRACKET_UNIT;

  for (let slot = 1; slot <= half2; slot++) {
    const y = (slot - 1) * unit + (unit - cardH) / 2;
    slotY.set(`1:${slot}`, y);
    const m = byRoundSlot.get(`1:${slot}`);
    if (m) positions.set(m.id, { col: 0, y });
  }

  for (let slot = 1; slot <= half1; slot++) {
    const y = centerBetweenParents(
      yAt(1, 2 * slot - 1, slotY),
      yAt(1, 2 * slot, slotY),
      cardH,
    );
    slotY.set(`2:${slot}`, y);
    slotY.set(`2:${slot + half1}`, y);
    const lower = byRoundSlot.get(`2:${slot}`);
    if (lower) positions.set(lower.id, { col: -1, y });
    const upper = byRoundSlot.get(`2:${slot + half1}`);
    if (upper) positions.set(upper.id, { col: 1, y });
  }

  for (let k = 1; k <= half1; k++) {
    const crossY = yAt(2, k, slotY);
    slotY.set(`3:${k}`, crossY);
    const cross = byRoundSlot.get(`3:${k}`);
    if (cross) positions.set(cross.id, { col: -2, y: crossY });
  }

  // Олимпийка: 1/4 на 16 (слоты R3 5–8) или 1/8 на 32 (слоты R3 9–16).
  if (half1 >= 8) {
    for (let k = 1; k <= half1 / 2; k++) {
      const parentA = half1 + 2 * k - 1;
      const parentB = half1 + 2 * k;
      const olympicSlot = half1 + k;
      const olympicY = centerBetweenParents(
        yAt(2, parentA, slotY),
        yAt(2, parentB, slotY),
        cardH,
      );
      slotY.set(`3:${olympicSlot}`, olympicY);
      const olympic = byRoundSlot.get(`3:${olympicSlot}`);
      if (olympic) positions.set(olympic.id, { col: 2, y: olympicY });
    }
    for (let k = 1; k <= half1 / 2; k++) {
      const parentA = 2 * k - 1;
      const parentB = 2 * k;
      const olympicSlot = half1 + half1 / 2 + k;
      const olympicY = centerBetweenParents(
        yAt(3, parentA, slotY),
        yAt(3, parentB, slotY),
        cardH,
      );
      slotY.set(`3:${olympicSlot}`, olympicY);
      const olympic = byRoundSlot.get(`3:${olympicSlot}`);
      if (olympic) positions.set(olympic.id, { col: 2, y: olympicY });
    }
  } else {
    for (let k = 1; k <= half1; k++) {
      const upperSlot = k + half1;
      const olympicY = yAt(2, upperSlot, slotY);
      slotY.set(`3:${upperSlot}`, olympicY);
      const olympic = byRoundSlot.get(`3:${upperSlot}`);
      if (olympic) positions.set(olympic.id, { col: 2, y: olympicY });
    }
  }

  if (half1 >= 8) {
    const olympicIds = matches
      .filter((m) => m.round === 3 && m.slot > half1)
      .map((m) => m.id);
    resolveFixedColCollisions(
      positions,
      slotY,
      olympicIds,
      cardH,
      COL_COLLISION_GAP,
    );
  }

  let col = 3;
  for (let round = 4; round < maxRound; round++) {
    const slotCount = tsPostR3SlotCount(half2, round);
    for (let slot = 1; slot <= slotCount; slot++) {
      const parentA = 2 * slot - 1 + half1;
      const parentB = 2 * slot + half1;
      const y =
        round === 4
          ? centerBetweenParents(
              yAt(3, parentA, slotY),
              yAt(3, parentB, slotY),
              cardH,
            )
          : centerBetweenParents(
              yAt(round - 1, 2 * slot - 1, slotY),
              yAt(round - 1, 2 * slot, slotY),
              cardH,
            );
      slotY.set(`${round}:${slot}`, y);
      const m = byRoundSlot.get(`${round}:${slot}`);
      if (m) positions.set(m.id, { col, y });
    }
    col++;
  }

  const finalY = centerBetweenParents(
    yAt(maxRound - 1, 1, slotY),
    yAt(maxRound - 1, 2, slotY),
    cardH,
  );
  const fin = byRoundSlot.get(`${maxRound}:1`);
  if (fin) positions.set(fin.id, { col, y: finalY });

  return positions;
}

/** @deprecated alias — используйте buildTsPositionsScaled(..., 8). */
function buildTsPositions27(
  matches: BracketMatchView[],
  cardH: number,
): Map<string, SwissMatchPosition> {
  return buildTsPositionsScaled(matches, cardH, 8);
}

/** TS 28 встреч — как 27, матч за 3–4 (#28) под финалом в колонке «Финал». */
function buildTsPositions28Bronze(
  matches: BracketMatchView[],
  cardH: number,
): Map<string, SwissMatchPosition> {
  const positions = buildTsPositionsScaled(matches, cardH, 8);
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }
  const fin = byRoundSlot.get("5:1");
  const bronze = byRoundSlot.get("5:2");
  if (!fin || !bronze) return positions;
  const finPos = positions.get(fin.id);
  if (!finPos) return positions;
  positions.set(bronze.id, {
    col: finPos.col,
    y: finPos.y + cardH + FIXED_SWISS_BRONZE_BELOW_GAP,
  });
  return positions;
}

/** TS 32→16 (59 встреч): 10 колонок — см. docs/BRACKET_REFERENCE_32_16.md */
function buildTsPositions32(
  matches: BracketMatchView[],
  cardH: number,
): Map<string, SwissMatchPosition> {
  const half1 = 8;
  const positions = new Map<string, SwissMatchPosition>();
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }

  const slotY = new Map<string, number>();
  const unit = FIXED_SWISS_BRACKET_UNIT;

  for (let slot = 1; slot <= 16; slot++) {
    const y = (slot - 1) * unit + (unit - cardH) / 2;
    slotY.set(`1:${slot}`, y);
    const m = byRoundSlot.get(`1:${slot}`);
    if (m) positions.set(m.id, { col: 0, y });
  }

  for (let slot = 1; slot <= half1; slot++) {
    const y = centerBetweenParents(
      yAt(1, 2 * slot - 1, slotY),
      yAt(1, 2 * slot, slotY),
      cardH,
    );
    slotY.set(`2:${slot}`, y);
    slotY.set(`2:${slot + half1}`, y);
    const lower = byRoundSlot.get(`2:${slot}`);
    if (lower) positions.set(lower.id, { col: -1, y });
    const upper = byRoundSlot.get(`2:${slot + half1}`);
    if (upper) positions.set(upper.id, { col: 1, y });
  }

  const crossIds: string[] = [];
  for (let k = 1; k <= half1; k++) {
    const crossY = yAt(2, k, slotY);
    slotY.set(`3:${k}`, crossY);
    const cross = byRoundSlot.get(`3:${k}`);
    if (cross) {
      positions.set(cross.id, { col: -2, y: crossY });
      crossIds.push(cross.id);
    }
  }

  // 1/8 (#41–#44): пары верхней R2 (#25+#26→#41 …).
  for (let k = 1; k <= half1 / 2; k++) {
    const slotA = half1 + 2 * k - 1;
    const slotB = half1 + 2 * k;
    const olympicSlot = half1 + k;
    const olympicY = centerBetweenParents(
      yAt(2, slotA, slotY),
      yAt(2, slotB, slotY),
      cardH,
    );
    slotY.set(`3:${olympicSlot}`, olympicY);
    const olympic = byRoundSlot.get(`3:${olympicSlot}`);
    if (olympic) positions.set(olympic.id, { col: 2, y: olympicY });
  }

  const olympic18Ids = matches
    .filter((m) => m.round === 3 && m.slot > half1 && m.slot <= half1 + half1 / 2)
    .map((m) => m.id);
  resolveFixedColCollisions(
    positions,
    slotY,
    olympic18Ids,
    cardH,
    COL_COLLISION_GAP,
  );
  resolveFixedColCollisions(positions, slotY, crossIds, cardH, COL_COLLISION_GAP);

  // Нижняя тур 3 (#48↓#45): R4, колонка −3.
  const lowerTour3Ids: string[] = [];
  for (let slot = 1; slot <= 4; slot++) {
    const crossA = 2 * slot - 1;
    const y = centerBetweenParents(
      yAt(3, crossA, slotY),
      yAt(3, crossA + 1, slotY),
      cardH,
    );
    slotY.set(`4:${slot}`, y);
    const lowerR3 = byRoundSlot.get(`4:${slot}`);
    if (lowerR3) {
      positions.set(lowerR3.id, { col: -3, y });
      lowerTour3Ids.push(lowerR3.id);
    }
  }
  resolveFixedColCollisions(
    positions,
    slotY,
    lowerTour3Ids,
    cardH,
    COL_COLLISION_GAP,
  );

  // Нижняя тур 4 (#52↓#49): R3 слоты 13–16, колонка −4.
  const lowerTour4Ids: string[] = [];
  for (let k = 1; k <= half1 / 2; k++) {
    const parentA = 2 * k - 1;
    const parentB = 2 * k;
    const olympicSlot = half1 + half1 / 2 + k;
    const olympicY = centerBetweenParents(
      yAt(3, parentA, slotY),
      yAt(3, parentB, slotY),
      cardH,
    );
    slotY.set(`3:${olympicSlot}`, olympicY);
    const olympic = byRoundSlot.get(`3:${olympicSlot}`);
    if (olympic) {
      positions.set(olympic.id, { col: -4, y: olympicY });
      lowerTour4Ids.push(olympic.id);
    }
  }
  resolveFixedColCollisions(
    positions,
    slotY,
    lowerTour4Ids,
    cardH,
    COL_COLLISION_GAP,
  );

  const quarterIds: string[] = [];
  for (let slot = 1; slot <= 4; slot++) {
    const olympicSlot = half1 + slot;
    const y = yAt(3, olympicSlot, slotY);
    slotY.set(`5:${slot}`, y);
    const quarter = byRoundSlot.get(`5:${slot}`);
    if (quarter) {
      positions.set(quarter.id, { col: 3, y });
      quarterIds.push(quarter.id);
    }
  }

  const semi1Y = centerBetweenParents(yAt(5, 1, slotY), yAt(5, 2, slotY), cardH);
  slotY.set(`6:1`, semi1Y);
  const semi1 = byRoundSlot.get("6:1");
  if (semi1) positions.set(semi1.id, { col: 4, y: semi1Y });

  const semi2Y = centerBetweenParents(yAt(5, 3, slotY), yAt(5, 4, slotY), cardH);
  slotY.set(`6:2`, semi2Y);
  const semi2 = byRoundSlot.get("6:2");
  if (semi2) positions.set(semi2.id, { col: 4, y: semi2Y });

  const finalY = centerBetweenParents(yAt(6, 1, slotY), yAt(6, 2, slotY), cardH);
  const fin = byRoundSlot.get("7:1");
  if (fin) positions.set(fin.id, { col: 5, y: finalY });

  return positions;
}

/** TS 60 встреч — матч за 3–4 под финалом. */
function buildTsPositions32Bronze(
  matches: BracketMatchView[],
  cardH: number,
): Map<string, SwissMatchPosition> {
  const positions = buildTsPositions32(matches, cardH);
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }
  const fin = byRoundSlot.get("7:1");
  const bronze = byRoundSlot.get("7:2");
  if (!fin || !bronze) return positions;
  const finPos = positions.get(fin.id);
  if (!finPos) return positions;
  positions.set(bronze.id, {
    col: finPos.col,
    y: finPos.y + cardH + FIXED_SWISS_BRONZE_BELOW_GAP,
  });
  return positions;
}

/** TS 64→32 (111 встреч) — масштаб buildTsPositions32. */
function buildTsPositions64(
  matches: BracketMatchView[],
  cardH: number,
): Map<string, SwissMatchPosition> {
  const half1 = 16;
  const positions = new Map<string, SwissMatchPosition>();
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }

  const slotY = new Map<string, number>();
  const unit = FIXED_SWISS_BRACKET_UNIT;

  for (let slot = 1; slot <= 32; slot++) {
    const y = (slot - 1) * unit + (unit - cardH) / 2;
    slotY.set(`1:${slot}`, y);
    const m = byRoundSlot.get(`1:${slot}`);
    if (m) positions.set(m.id, { col: 0, y });
  }

  for (let slot = 1; slot <= half1; slot++) {
    const y = centerBetweenParents(
      yAt(1, 2 * slot - 1, slotY),
      yAt(1, 2 * slot, slotY),
      cardH,
    );
    slotY.set(`2:${slot}`, y);
    slotY.set(`2:${slot + half1}`, y);
    const lower = byRoundSlot.get(`2:${slot}`);
    if (lower) positions.set(lower.id, { col: -1, y });
    const upper = byRoundSlot.get(`2:${slot + half1}`);
    if (upper) positions.set(upper.id, { col: 1, y });
  }

  const crossIds: string[] = [];
  for (let k = 1; k <= half1; k++) {
    const crossY = yAt(2, k, slotY);
    slotY.set(`3:${k}`, crossY);
    const cross = byRoundSlot.get(`3:${k}`);
    if (cross) {
      positions.set(cross.id, { col: -2, y: crossY });
      crossIds.push(cross.id);
    }
  }

  for (let k = 1; k <= half1 / 2; k++) {
    const slotA = half1 + 2 * k - 1;
    const slotB = half1 + 2 * k;
    const olympicSlot = half1 + k;
    const olympicY = centerBetweenParents(
      yAt(2, slotA, slotY),
      yAt(2, slotB, slotY),
      cardH,
    );
    slotY.set(`3:${olympicSlot}`, olympicY);
    const olympic = byRoundSlot.get(`3:${olympicSlot}`);
    if (olympic) positions.set(olympic.id, { col: 2, y: olympicY });
  }

  const olympic18Ids = matches
    .filter((m) => m.round === 3 && m.slot > half1 && m.slot <= half1 + half1 / 2)
    .map((m) => m.id);
  resolveFixedColCollisions(
    positions,
    slotY,
    olympic18Ids,
    cardH,
    COL_COLLISION_GAP,
  );
  resolveFixedColCollisions(positions, slotY, crossIds, cardH, COL_COLLISION_GAP);

  const lowerTour3Ids: string[] = [];
  for (let slot = 1; slot <= half1 / 2; slot++) {
    const crossA = 2 * slot - 1;
    const y = centerBetweenParents(
      yAt(3, crossA, slotY),
      yAt(3, crossA + 1, slotY),
      cardH,
    );
    slotY.set(`4:${slot}`, y);
    const lowerR3 = byRoundSlot.get(`4:${slot}`);
    if (lowerR3) {
      positions.set(lowerR3.id, { col: -3, y });
      lowerTour3Ids.push(lowerR3.id);
    }
  }
  resolveFixedColCollisions(
    positions,
    slotY,
    lowerTour3Ids,
    cardH,
    COL_COLLISION_GAP,
  );

  const lowerTour4Ids: string[] = [];
  for (let k = 1; k <= half1 / 2; k++) {
    const parentA = 2 * k - 1;
    const parentB = 2 * k;
    const olympicSlot = half1 + half1 / 2 + k;
    const olympicY = centerBetweenParents(
      yAt(3, parentA, slotY),
      yAt(3, parentB, slotY),
      cardH,
    );
    slotY.set(`3:${olympicSlot}`, olympicY);
    const olympic = byRoundSlot.get(`3:${olympicSlot}`);
    if (olympic) {
      positions.set(olympic.id, { col: -4, y: olympicY });
      lowerTour4Ids.push(olympic.id);
    }
  }
  resolveFixedColCollisions(
    positions,
    slotY,
    lowerTour4Ids,
    cardH,
    COL_COLLISION_GAP,
  );

  const quarterIds: string[] = [];
  for (let slot = 1; slot <= 4; slot++) {
    const olympicSlot = half1 + slot;
    const y = yAt(3, olympicSlot, slotY);
    slotY.set(`5:${slot}`, y);
    const quarter = byRoundSlot.get(`5:${slot}`);
    if (quarter) {
      positions.set(quarter.id, { col: 3, y });
      quarterIds.push(quarter.id);
    }
  }

  const semi1Y = centerBetweenParents(yAt(5, 1, slotY), yAt(5, 2, slotY), cardH);
  slotY.set(`6:1`, semi1Y);
  const semi1 = byRoundSlot.get("6:1");
  if (semi1) positions.set(semi1.id, { col: 4, y: semi1Y });

  const semi2Y = centerBetweenParents(yAt(5, 3, slotY), yAt(5, 4, slotY), cardH);
  slotY.set(`6:2`, semi2Y);
  const semi2 = byRoundSlot.get("6:2");
  if (semi2) positions.set(semi2.id, { col: 4, y: semi2Y });

  const finalY = centerBetweenParents(yAt(6, 1, slotY), yAt(6, 2, slotY), cardH);
  const fin = byRoundSlot.get("7:1");
  if (fin) positions.set(fin.id, { col: 5, y: finalY });

  return positions;
}

/** TS 112 встреч — матч за 3–4 под финалом. */
function buildTsPositions64Bronze(
  matches: BracketMatchView[],
  cardH: number,
): Map<string, SwissMatchPosition> {
  const positions = buildTsPositions64(matches, cardH);
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }
  const fin = byRoundSlot.get("7:1");
  const bronze = byRoundSlot.get("7:2");
  if (!fin || !bronze) return positions;
  const finPos = positions.get(fin.id);
  if (!finPos) return positions;
  positions.set(bronze.id, {
    col: finPos.col,
    y: finPos.y + cardH + FIXED_SWISS_BRONZE_BELOW_GAP,
  });
  return positions;
}

/** TS 29 встреч (устаревшая) — 9 колонок с нижней тур 3–4. */
function buildTsPositionsLegacy29(
  matches: BracketMatchView[],
  cardH: number,
): Map<string, SwissMatchPosition> {
  const positions = new Map<string, SwissMatchPosition>();
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }

  const slotY = new Map<string, number>();
  const unit = FIXED_SWISS_BRACKET_UNIT;

  for (let slot = 1; slot <= 8; slot++) {
    const y = (slot - 1) * unit + (unit - cardH) / 2;
    slotY.set(`1:${slot}`, y);
    const m = byRoundSlot.get(`1:${slot}`);
    if (m) positions.set(m.id, { col: 0, y });
  }

  for (let slot = 1; slot <= 4; slot++) {
    const y = centerBetweenParents(
      yAt(1, 2 * slot - 1, slotY),
      yAt(1, 2 * slot, slotY),
      cardH,
    );
    slotY.set(`2:${slot}`, y);
    slotY.set(`2:${slot + 4}`, y);
    const lower = byRoundSlot.get(`2:${slot}`);
    if (lower) positions.set(lower.id, { col: -1, y });
    const upper = byRoundSlot.get(`2:${slot + 4}`);
    if (upper) positions.set(upper.id, { col: 1, y });
  }

  for (let q = 1; q <= 2; q++) {
    const slot = 4 + q;
    const quarterY = centerBetweenParents(
      yAt(2, 2 * q + 3, slotY),
      yAt(2, 2 * q + 4, slotY),
      cardH,
    );
    slotY.set(`3:${slot}`, quarterY);
    const quarter = byRoundSlot.get(`3:${slot}`);
    if (quarter) positions.set(quarter.id, { col: 2, y: quarterY });
  }

  const crossMirrorUpperSlot = (crossSlot: number) => (crossSlot % 2 === 1 ? 5 : 6);
  const crossIds: string[] = [];
  for (let k = 1; k <= 4; k++) {
    const crossY = yAt(3, crossMirrorUpperSlot(k), slotY);
    slotY.set(`3:${k}`, crossY);
    const cross = byRoundSlot.get(`3:${k}`);
    if (cross) {
      positions.set(cross.id, { col: -2, y: crossY });
      crossIds.push(cross.id);
    }
  }
  resolveFixedColCollisions(positions, slotY, crossIds, cardH, COL_COLLISION_GAP);

  for (let slot = 1; slot <= 2; slot++) {
    const y = centerBetweenParents(
      yAt(3, 2 * slot - 1, slotY),
      yAt(3, 2 * slot, slotY),
      cardH,
    );
    slotY.set(`4:${slot}`, y);
    const lowerR3 = byRoundSlot.get(`4:${slot}`);
    if (lowerR3) positions.set(lowerR3.id, { col: -3, y });
  }

  for (let slot = 3; slot <= 4; slot++) {
    const y = yAt(3, slot, slotY);
    slotY.set(`4:${slot}`, y);
    const lowerR4 = byRoundSlot.get(`4:${slot}`);
    if (lowerR4) positions.set(lowerR4.id, { col: -4, y });
  }

  slotY.set(`5:1`, yAt(3, 5, slotY));
  const semi1 = byRoundSlot.get("5:1");
  if (semi1) positions.set(semi1.id, { col: 3, y: yAt(3, 5, slotY) });

  const semi2Y = centerBetweenParents(yAt(4, 3, slotY), yAt(4, 4, slotY), cardH);
  slotY.set(`5:2`, semi2Y);
  const semi2 = byRoundSlot.get("5:2");
  if (semi2) positions.set(semi2.id, { col: 3, y: semi2Y });

  const finalY = centerBetweenParents(yAt(5, 1, slotY), yAt(5, 2, slotY), cardH);
  const fin = byRoundSlot.get("6:1");
  if (fin) positions.set(fin.id, { col: 4, y: finalY });

  return positions;
}

function buildClassicPositions(
  matches: BracketMatchView[],
  matchesPerRound: number,
  maxRound: number,
  cardH: number,
): Map<string, SwissMatchPosition> {
  const positions = new Map<string, SwissMatchPosition>();
  const byRoundSlot = new Map<string, BracketMatchView>();
  const half = matchesPerRound / 2;
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }

  const slotY = new Map<string, number>();

  for (let slot = 1; slot <= matchesPerRound; slot++) {
    const y = fixedSwissMatchTop(1, slot, matchesPerRound, maxRound, cardH);
    slotY.set(`1:${slot}`, y);
    const m = byRoundSlot.get(`1:${slot}`);
    if (m) positions.set(m.id, { col: 0, y });
  }

  for (let round = 2; round <= maxRound; round++) {
    const roundMatches: BracketMatchView[] = [];
    const prevY = new Map<number, number>();
    for (let slot = 1; slot <= matchesPerRound; slot++) {
      prevY.set(slot, slotY.get(`${round - 1}:${slot}`)!);
    }

    for (let slot = 1; slot <= matchesPerRound; slot++) {
      const m = byRoundSlot.get(`${round}:${slot}`);
      if (!m) continue;
      const [s1, s2] = parentSlots(round, slot, half);
      const y = centerBetweenParents(prevY.get(s1)!, prevY.get(s2)!, cardH);
      positions.set(m.id, {
        col: fixedSwissMatchCol(round, slot, matchesPerRound),
        y,
      });
      slotY.set(`${round}:${slot}`, y);
      roundMatches.push(m);
    }

    resolveRoundColumnCollisions(roundMatches, positions, cardH, half);

    for (const m of roundMatches) {
      slotY.set(`${m.round}:${m.slot}`, positions.get(m.id)!.y);
    }
  }

  return positions;
}

export function buildFixedSwissBracketLayout(
  matches: BracketMatchView[],
): SwissBracketLayout {
  const rounds = groupMatchesByRound(matches);
  const matchCount = matches.length;
  const gridSize = inferFixedSwissGridSize(matchCount);
  const maxRoundEarly =
    matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;
  const useTsLegacy29 = isFixedSwissTsLegacy29MatchCount(matchCount);
  const useTsLegacy27Six = isFixedSwissTsLegacy27SixRound(
    matchCount,
    maxRoundEarly,
  );
  const useLegacy168 =
    isFixedSwiss168LegacyMatchCount(matchCount, maxRoundEarly) &&
    !isFixedSwissTsMatchCount(matchCount, maxRoundEarly);
  const useTs =
    isFixedSwissTsMatchCount(matchCount, maxRoundEarly) ||
    isFixedSwissTsBronzeMatchCount(matchCount) ||
    isFixedSwissTs32MatchCount(matchCount) ||
    isFixedSwissTs32BronzeMatchCount(matchCount) ||
    isFixedSwissTs64MatchCount(matchCount) ||
    isFixedSwissTs64BronzeMatchCount(matchCount) ||
    useTsLegacy29 ||
    useTsLegacy27Six;
  const use168 = useTs || useLegacy168;
  const matchesPerRound = gridSize / 2;
  const edges = buildFixedTemplateEdges(matches, matchCount, maxRoundEarly);
  const matchNumbers = buildMatchNumbers(
    matches,
    matchCount,
    maxRoundEarly,
  );
  const cardH = FIXED_SWISS_CARD_H;

  if (rounds.length === 0) {
    return {
      rounds,
      positions: new Map(),
      edges,
      matchNumbers,
      minCol: 0,
      maxCol: 0,
      minRound: 1,
      totalWidth: FIXED_SWISS_COL_W,
      totalHeight: cardH + GRID_PAD * 2 + GRID_LABEL_OFFSET,
      centerX:
        GRID_PAD +
        (FIXED_SWISS_COL_W - FIXED_SWISS_CARD_W) / 2 +
        FIXED_SWISS_CARD_W / 2,
    };
  }

  const maxRound = Math.max(...rounds.map((r) => r.round));
  const positions = useTs
    ? buildTsPositions(matches, cardH, matchCount, maxRoundEarly)
    : useLegacy168
      ? build168Positions(matches, cardH)
      : buildClassicPositions(matches, matchesPerRound, maxRound, cardH);

  let minCol = 0;
  let maxCol = 0;
  let maxY = 0;
  for (const [, pos] of positions) {
    minCol = Math.min(minCol, pos.col);
    maxCol = Math.max(maxCol, pos.col);
    maxY = Math.max(maxY, pos.y + cardH);
  }

  const totalWidth =
    (maxCol - minCol + 1) * FIXED_SWISS_COL_W + GRID_PAD * 2;
  const totalHeight = Math.max(
    maxY + GRID_PAD * 2 + GRID_LABEL_OFFSET,
    fixedSwissBracketHeight(matchesPerRound, cardH) +
      GRID_PAD * 2 +
      GRID_LABEL_OFFSET,
  );
  const centerX = fixedGridCardLeft(0, minCol) + FIXED_SWISS_CARD_W / 2;

  return {
    rounds,
    positions,
    edges,
    matchNumbers,
    minCol,
    maxCol,
    minRound: 1,
    totalWidth,
    totalHeight,
    centerX,
    colWidth: FIXED_SWISS_COL_W,
    cardWidth: FIXED_SWISS_CARD_W,
    cardHeight: cardH,
  };
}

export function gridFixedColumnLabel(col: number): string {
  if (col === 0) return "Старт";
  if (col < 0) return `← ${Math.abs(col)}`;
  return `${col} →`;
}

/** Y выхода линии с карточки (эталон: разделитель строк игроков). */
export function fixedSwissEdgeFromY(cardTop: number): number {
  return teamDividerY(cardTop);
}

/**
 * Y входа линии в карточку — эталон: разделитель строк (одна линия на вилке).
 */
export function fixedSwissEdgeToY(
  _fromCardTop: number,
  toCardTop: number,
  _toTeamSlot: 1 | 2,
  kind: SwissEdgeKind,
): number {
  if (kind === "loss") return teamDividerY(toCardTop);
  return teamDividerY(toCardTop);
}

export function gridFixedEdgePoints(
  fromPos: SwissMatchPosition,
  toPos: SwissMatchPosition,
  _fromTeamSlot: 1 | 2,
  toTeamSlot: 1 | 2,
  kind: SwissEdgeKind,
  minCol: number,
) {
  const fromTop = fromPos.y + GRID_PAD + GRID_LABEL_OFFSET;
  const toTop = toPos.y + GRID_PAD + GRID_LABEL_OFFSET;
  const y = fixedSwissEdgeFromY(fromTop);
  const entryY = fixedSwissEdgeToY(fromTop, toTop, toTeamSlot, kind);
  const fromLeft = fixedGridCardLeft(fromPos.col, minCol);
  const toLeft = fixedGridCardLeft(toPos.col, minCol);
  const exitsLeft = kind === "loss";

  const from = exitsLeft
    ? { x: fromLeft, y }
    : { x: fromLeft + FIXED_SWISS_CARD_W, y };

  const enteringFromRight = toPos.col > fromPos.col;
  const enteringFromLeft = toPos.col < fromPos.col;
  let to: { x: number; y: number };
  if (enteringFromRight) {
    to = { x: toLeft, y: entryY };
  } else if (enteringFromLeft) {
    to = { x: toLeft + FIXED_SWISS_CARD_W, y: entryY };
  } else {
    to = exitsLeft
      ? { x: toLeft + FIXED_SWISS_CARD_W, y: entryY }
      : { x: toLeft, y: entryY };
  }

  return { from, to };
}

function fixedSwissLineEntryX(
  toX: number,
  gutterX: number,
  toCol: number,
  fromCol: number,
): number {
  const gap = FIXED_SWISS_LINE_ENTRY_GAP;
  if (toCol > fromCol) {
    if (toX >= gutterX) return Math.max(toX, gutterX + gap);
    return toX;
  }
  if (toCol < fromCol) {
    if (toX <= gutterX) return Math.min(toX, gutterX - gap);
    return toX;
  }
  return toX;
}

/** X-координата канала между двумя соседними колонками. */
export function fixedSwissColumnGutter(
  colA: number,
  colB: number,
  minCol: number,
  colWidth: number = FIXED_SWISS_COL_W,
): number {
  const cLow = Math.min(colA, colB);
  const cHigh = Math.max(colA, colB);
  return (
    (fixedGridColLeft(cLow, minCol) +
      colWidth +
      fixedGridColLeft(cHigh, minCol)) /
    2
  );
}

/** Смещение lane внутри gutter — только для туров 3+. */
function gutterLaneOffset(
  fromY: number,
  toY: number,
  laneKey = 0,
  fromCol?: number,
  toCol?: number,
): number {
  if (fromCol === 0 && toCol != null && Math.abs(toCol) === 1) {
    return 0;
  }
  const lanes = [-16, -10, -4, 2, 8, 14];
  const idx =
    (Math.round(fromY / FIXED_SWISS_BRACKET_UNIT) * 3 +
      Math.round(toY / FIXED_SWISS_BRACKET_UNIT) +
      laneKey) %
    lanes.length;
  return lanes[idx] ?? 0;
}

export function gridFixedConnectorPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  _kind: SwissEdgeKind,
  fromCol?: number,
  toCol?: number,
  minCol?: number,
  colWidth: number = FIXED_SWISS_COL_W,
  laneKey = 0,
) {
  if (
    fromCol === undefined ||
    toCol === undefined ||
    minCol === undefined ||
    fromCol === toCol
  ) {
    const midX = from.x + (to.x - from.x) / 2;
    return `M ${from.x} ${from.y} H ${midX} V ${to.y} H ${to.x}`;
  }

  const delta = toCol - fromCol;
  const sign = delta > 0 ? 1 : -1;
  const lane = gutterLaneOffset(from.y, to.y, laneKey, fromCol, toCol);
  const firstGutter =
    fixedSwissColumnGutter(fromCol, fromCol + sign, minCol, colWidth) + lane;

  let d = `M ${from.x} ${from.y} H ${firstGutter}`;

  if (Math.abs(delta) === 1) {
    const entryX = fixedSwissLineEntryX(to.x, firstGutter, toCol, fromCol);
    d += ` V ${to.y} H ${entryX}`;
    return d;
  }

  // Дальше одна колонка: сначала вертикаль в gutter, потом горизонталь на Y цели.
  d += ` V ${to.y}`;
  let col = fromCol + sign;
  while (col !== toCol) {
    const nextCol = col + sign;
    const gx =
      fixedSwissColumnGutter(col, nextCol, minCol, colWidth) + lane;
    d += ` H ${gx}`;
    col = nextCol;
  }
  const lastGutter =
    fixedSwissColumnGutter(toCol - sign, toCol, minCol, colWidth) + lane;
  const entryX = fixedSwissLineEntryX(to.x, lastGutter, toCol, fromCol);
  d += ` H ${entryX}`;
  return d;
}

/**
 * Крест → 1/4: сначала горизонталь на Y источника через gutter'ы,
 * затем вертикаль у целевой колонки — без «шины» через нижнюю R1.
 */
export function gridFixedCrossToQuarterConnectorPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromCol: number,
  toCol: number,
  minCol: number,
  colWidth: number = FIXED_SWISS_COL_W,
  laneKey = 0,
): string {
  const sign = toCol > fromCol ? 1 : -1;
  const lane = gutterLaneOffset(from.y, to.y, laneKey, fromCol, toCol);
  let d = `M ${from.x} ${from.y}`;
  let col = fromCol;
  while (col !== toCol) {
    const nextCol = col + sign;
    const gx = fixedSwissColumnGutter(col, nextCol, minCol, colWidth) + lane;
    d += ` H ${gx}`;
    col = nextCol;
  }
  const lastGutter = fixedSwissColumnGutter(
    toCol - sign,
    toCol,
    minCol,
    colWidth,
  );
  const entryX = fixedSwissLineEntryX(to.x, lastGutter + lane, toCol, fromCol);
  d += ` V ${to.y} H ${entryX}`;
  return d;
}

/**
 * ЭТАЛОН вилки (R12, R23): точки на teamDividerY; H gutter(s) V trunkY … V to.y H to.x.
 * Спека: docs/FIXED_SWISS_BRACKET_LINES.md
 */
export function gridFixedForkConnectorPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromCol: number,
  toCol: number,
  minCol: number,
  colWidth: number,
  trunkY: number,
): string {
  const sign = toCol > fromCol ? 1 : -1;
  const delta = Math.abs(toCol - fromCol);

  if (delta <= 1) {
    const gutter = fixedSwissColumnGutter(fromCol, toCol, minCol, colWidth);
    const entryX = fixedSwissLineEntryX(to.x, gutter, toCol, fromCol);
    return `M ${from.x} ${from.y} H ${gutter} V ${trunkY} V ${to.y} H ${entryX}`;
  }

  // Дальний переход (напр. проигрыш 1→-2): без горизонтали на trunkY через центр сетки
  const firstGutter = fixedSwissColumnGutter(
    fromCol,
    fromCol + sign,
    minCol,
    colWidth,
  );
  let d = `M ${from.x} ${from.y} H ${firstGutter} V ${to.y}`;
  let col = fromCol + sign;
  while (col !== toCol) {
    const nextCol = col + sign;
    const gx = fixedSwissColumnGutter(col, nextCol, minCol, colWidth);
    d += ` H ${gx}`;
    col = nextCol;
  }
  const lastGutter = fixedSwissColumnGutter(
    toCol - sign,
    toCol,
    minCol,
    colWidth,
  );
  const entryX = fixedSwissLineEntryX(to.x, lastGutter, toCol, fromCol);
  d += ` H ${entryX}`;
  return d;
}

/** @deprecated Используйте gridFixedForkConnectorPath — алиас для тестов R12. */
export function gridFixedR12ConnectorPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromCol: number,
  toCol: number,
  minCol: number,
  colWidth: number,
  trunkY: number,
): string {
  return gridFixedForkConnectorPath(
    from,
    to,
    fromCol,
    toCol,
    minCol,
    colWidth,
    trunkY,
  );
}

/** Y ствола: середина Y всех входящих из `fromRound` в одну встречу `toRound`. */
export function fixedSwissForkTrunkYByTarget(
  fromRound: number,
  toRound: number,
  edges: Array<{
    fromId: string;
    toId: string;
    kind: string;
    fromTeamSlot?: 1 | 2;
    toTeamSlot?: 1 | 2;
  }>,
  getFromY: (
    fromId: string,
    toId: string,
    fromTeamSlot: 1 | 2,
    toTeamSlot: 1 | 2,
    kind: "win" | "loss",
  ) => number | undefined,
  matchById: Map<string, { round: number }>,
): Map<string, number> {
  const byTarget = new Map<string, number[]>();
  for (const edge of edges) {
    const from = matchById.get(edge.fromId);
    const to = matchById.get(edge.toId);
    if (!from || !to || from.round !== fromRound || to.round !== toRound) continue;
    if (edge.fromTeamSlot == null || edge.toTeamSlot == null) continue;
    const y = getFromY(
      edge.fromId,
      edge.toId,
      edge.fromTeamSlot,
      edge.toTeamSlot,
      edge.kind === "loss" ? "loss" : "win",
    );
    if (y == null) continue;
    const list = byTarget.get(edge.toId) ?? [];
    list.push(y);
    byTarget.set(edge.toId, list);
  }
  const trunk = new Map<string, number>();
  for (const [toId, ys] of byTarget) {
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    trunk.set(toId, (min + max) / 2);
  }
  return trunk;
}

/** Y ствола R12 — алиас. */
export function fixedSwissR12TrunkYByTarget(
  edges: Parameters<typeof fixedSwissForkTrunkYByTarget>[2],
  getFromY: Parameters<typeof fixedSwissForkTrunkYByTarget>[3],
  matchById: Parameters<typeof fixedSwissForkTrunkYByTarget>[4],
): Map<string, number> {
  return fixedSwissForkTrunkYByTarget(1, 2, edges, getFromY, matchById);
}

export function isFixedSwissRound12Edge(
  fromRound: number,
  toRound: number,
): boolean {
  return fromRound === 1 && toRound === 2;
}

export function isFixedSwissRound23Edge(
  fromRound: number,
  toRound: number,
): boolean {
  return fromRound === 2 && toRound === 3;
}

function isFixedSwissTs32CurrentGrid(matchCount?: number): boolean {
  return (
    matchCount !== undefined &&
    (isFixedSwissTs32MatchCount(matchCount) ||
      isFixedSwissTs32BronzeMatchCount(matchCount))
  );
}

function isFixedSwissTs64CurrentGrid(matchCount?: number): boolean {
  return (
    matchCount !== undefined &&
    (isFixedSwissTs64MatchCount(matchCount) ||
      isFixedSwissTs64BronzeMatchCount(matchCount))
  );
}

function isFixedSwissTsLargeCurrentGrid(matchCount?: number): boolean {
  return isFixedSwissTs32CurrentGrid(matchCount) || isFixedSwissTs64CurrentGrid(matchCount);
}

function half1ForLargeGrid(matchCount?: number): number {
  if (isFixedSwissTs64CurrentGrid(matchCount)) return 16;
  if (isFixedSwissTs32CurrentGrid(matchCount)) return 8;
  return 4;
}

function isFixedSwissTs32AnyGrid(matchCount?: number): boolean {
  return (
    isFixedSwissTs32CurrentGrid(matchCount) ||
    (matchCount !== undefined && isOutdatedFixedSwiss32Bracket(matchCount))
  );
}

export function isFixedSwissCrossToQuarterEdge(
  fromRound: number,
  toRound: number,
  _matchCount?: number,
): boolean {
  return fromRound === 3 && toRound === 3;
}

/** Вилка SVG: R1→R2; крест→нижняя R4; 1/8→1/4 (R3→R4 или R3→R5). */
export function isFixedSwissQuarterSemiForkEdge(
  fromRound: number,
  toRound: number,
  matchCount?: number,
  fromSlot?: number,
): boolean {
  if (fromRound === 3 && toRound === 4) {
    const half1 = half1ForLargeGrid(matchCount);
    return fromSlot == null || fromSlot <= half1;
  }
  if (isFixedSwissTs64CurrentGrid(matchCount)) {
    return fromRound === 3 && toRound === 5;
  }
  if (isFixedSwissTs32CurrentGrid(matchCount)) {
    return false;
  }
  return fromRound === 3 && toRound === 5;
}

export function isFixedSwissSemiFinalForkEdge(
  fromRound: number,
  toRound: number,
  matchCount?: number,
): boolean {
  if (isFixedSwissTsLargeCurrentGrid(matchCount)) {
    return (
      (fromRound === 5 && toRound === 6) ||
      (fromRound === 6 && toRound === 7)
    );
  }
  if (isFixedSwissTs32AnyGrid(matchCount)) {
    return (
      (fromRound === 4 && toRound === 5) ||
      (fromRound === 5 && toRound === 6)
    );
  }
  return fromRound === 4 && toRound === 5;
}

/** Устаревшая 32→16: #25+#26→#41 — вилка R2→R3 (не короткая 1:1). */
export function isFixedSwissUpperOlympicForkEdge(
  fromRound: number,
  toRound: number,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
): boolean {
  if (fromSlot == null || toSlot == null || matchCount == null) return false;
  if (!isOutdatedFixedSwiss32Bracket(matchCount)) return false;
  return isFixedSwissShortAdjacentWinEdge(
    fromRound,
    fromSlot,
    toRound,
    toSlot,
    matchCount,
  );
}

export function isFixedSwissForkEdge(
  fromRound: number,
  toRound: number,
  matchCount?: number,
  fromSlot?: number,
  toSlot?: number,
): boolean {
  return (
    isFixedSwissRound12Edge(fromRound, toRound) ||
    isFixedSwissR23Upper18ForkEdge(
      fromRound,
      toRound,
      fromSlot,
      toSlot,
      matchCount,
    ) ||
    isFixedSwissQuarterSemiForkEdge(fromRound, toRound, matchCount, fromSlot) ||
    isFixedSwissSemiFinalForkEdge(fromRound, toRound, matchCount)
  );
}

/** #21/#22→#25; на 32→16 — 1/8→1/4 (R3→R4 устаревшая, R3→R5 актуальная). */
export function isFixedSwissQuarterSemiWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
): boolean {
  const half1 = half1ForLargeGrid(matchCount);
  const olympicToRound = isFixedSwissTsLargeCurrentGrid(matchCount) ? 5 : 4;
  if (fromRound !== 3 || toRound !== olympicToRound) return false;
  if (fromSlot < half1 + 1 || fromSlot > half1 * 2) return false;
  if (isFixedSwissTs32CurrentGrid(matchCount)) {
    const target = fixedSwissTs32OlympicToQuarterTarget(fromSlot);
    return target?.toSlot === toSlot;
  }
  if (isFixedSwissTs64CurrentGrid(matchCount)) {
    const target = fixedSwissTs64OlympicToQuarterTarget(fromSlot);
    return target?.toSlot === toSlot;
  }
  const qIdx = fromSlot - half1;
  return toSlot === Math.ceil(qIdx / 2);
}

/** Крест R3 → нижняя тур 3–4 (актуальная 32→16). */
export function isFixedSwissCrossToLowerWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
): boolean {
  if (!isFixedSwissTsLargeCurrentGrid(matchCount)) return false;
  if (fromRound !== 3 || toRound !== 4) return false;
  const half1 = half1ForLargeGrid(matchCount);
  if (fromSlot < 1 || fromSlot > half1) return false;
  return toSlot === Math.ceil(fromSlot / 2);
}

/** Нижняя тур 3 → нижняя тур 4 на актуальной 32→16 / 64→32. */
export function isFixedSwissLowerTour3To4WinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
): boolean {
  if (!isFixedSwissTsLargeCurrentGrid(matchCount)) return false;
  if (fromRound !== 4 || toRound !== 3) return false;
  const half1 = half1ForLargeGrid(matchCount);
  const lowerTour4Start = half1 + half1 / 2 + 1;
  for (let slot = 1; slot <= half1 / 4; slot++) {
    if (fromSlot === slot && toSlot === lowerTour4Start + slot - 1) return true;
  }
  return false;
}

export function isFixedSwissLowerInternalWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
): boolean {
  return isFixedSwissLowerTour3To4WinEdge(
    fromRound,
    fromSlot,
    toRound,
    toSlot,
    matchCount,
  );
}

/** Нижняя R4 → полуфинал (team2). */
export function isFixedSwissLowerToSemiWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
): boolean {
  if (!isFixedSwissTsLargeCurrentGrid(matchCount)) return false;
  if (fromRound !== 4 || toRound !== 6) return false;
  const half1 = half1ForLargeGrid(matchCount);
  if (isFixedSwissTs32CurrentGrid(matchCount)) {
    if (fromSlot === 3 && toSlot === 2) return true;
    if (fromSlot === 4 && toSlot === 1) return true;
    return false;
  }
  if (fromSlot === half1 / 2 + 1 && toSlot === 1) return true;
  if (fromSlot === half1 / 2 + 2 && toSlot === 1) return true;
  if (fromSlot === half1 / 2 + 3 && toSlot === 2) return true;
  if (fromSlot === half1 / 2 + 4 && toSlot === 2) return true;
  return false;
}

/** #25/#26→#27; на 32 — 1/4→полуфинал и полуфинал→финал. */
export function isFixedSwissSemiFinalWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
): boolean {
  if (isFixedSwissTsLargeCurrentGrid(matchCount)) {
    if (fromRound === 5 && toRound === 6) {
      return toSlot === Math.ceil(fromSlot / 2);
    }
    if (fromRound === 6 && toRound === 7) {
      return toSlot === 1 && (fromSlot === 1 || fromSlot === 2);
    }
    if (fromRound === 3 && toRound === 5 && isFixedSwissTs64CurrentGrid(matchCount)) {
      return toSlot >= 1 && toSlot <= 4 && fromSlot >= 17 && fromSlot <= 24;
    }
    return false;
  }
  if (isFixedSwissTs32AnyGrid(matchCount)) {
    if (fromRound === 4 && toRound === 5) {
      return toSlot === Math.ceil(fromSlot / 2);
    }
    if (fromRound === 5 && toRound === 6) {
      return toSlot === 1 && (fromSlot === 1 || fromSlot === 2);
    }
    return false;
  }
  return (
    fromRound === 4 &&
    toRound === 5 &&
    toSlot === 1 &&
    (fromSlot === 1 || fromSlot === 2)
  );
}

/** Соседние колонки — короткий путь без общего ствола. */
export function isFixedSwissAdjacentWinEdge(
  fromCol: number,
  toCol: number,
): boolean {
  return Math.abs(fromCol - toCol) === 1;
}

/** Верхняя R2 → 1/8 (#25+#26→#41 …) на актуальной 32→16. */
export function isFixedSwissR23Upper18ForkEdge(
  fromRound: number,
  toRound: number,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
): boolean {
  if (fromSlot == null || toSlot == null || !isFixedSwissTsLargeCurrentGrid(matchCount)) {
    return false;
  }
  if (fromRound !== 2 || toRound !== 3) return false;
  const half1 = half1ForLargeGrid(matchCount);
  if (fromSlot <= half1) return false;
  for (let k = 1; k <= half1 / 2; k++) {
    const olympicSlot = half1 + k;
    if (toSlot !== olympicSlot) continue;
    const slotA = half1 + 2 * k - 1;
    const slotB = half1 + 2 * k;
    return fromSlot === slotA || fromSlot === slotB;
  }
  return false;
}

/** Короткие линии R2→R3: #9→#21 … #16→#20; на 32→16 — только нижняя R2→крест. */
export function isFixedSwissShortAdjacentWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
): boolean {
  if (fromRound !== 2 || toRound !== 3) return false;
  if (isFixedSwissTsLargeCurrentGrid(matchCount)) {
    const half1 = half1ForLargeGrid(matchCount);
    return fromSlot === toSlot && fromSlot >= 1 && fromSlot <= half1;
  }
  if (matchCount !== undefined && isOutdatedFixedSwiss32Bracket(matchCount)) {
    const half1 = 8;
    for (let k = 1; k <= half1 / 2; k++) {
      const slotA = half1 + 2 * k - 1;
      const slotB = half1 + 2 * k;
      const olympicSlot = half1 + k;
      if (
        toSlot === olympicSlot &&
        (fromSlot === slotA || fromSlot === slotB)
      ) {
        return true;
      }
    }
    return false;
  }
  return (
    fromSlot === toSlot &&
    fromSlot >= 1 &&
    fromSlot <= 8
  );
}

/**
 * SVG: вилки R1→R2 (0→±1) + явные короткие победы R2→R3 (см. isFixedSwissShortAdjacentWinEdge).
 */
export function shouldDrawFixedSwissWinEdge(
  fromCol: number,
  toCol: number,
  fromRound: number,
  toRound: number,
  edgeKind: string,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
): boolean {
  const isWinLike = edgeKind === "win" || edgeKind === "bye";
  if (!isWinLike) return false;
  if (
    isFixedSwissRound12Edge(fromRound, toRound) &&
    fromCol === 0 &&
    toCol === 1
  ) {
    return true;
  }
  if (
    isFixedSwissR23LowerWinEdge(fromCol, toCol, "win") &&
    isFixedSwissRound23Edge(fromRound, toRound)
  ) {
    return true;
  }
  if (
    fromSlot != null &&
    toSlot != null &&
    isFixedSwissR23Upper18ForkEdge(
      fromRound,
      toRound,
      fromSlot,
      toSlot,
      matchCount,
    ) &&
    fromCol === 1 &&
    toCol === 2
  ) {
    return true;
  }
  if (
    fromSlot != null &&
    toSlot != null &&
    isFixedSwissShortAdjacentWinEdge(
      fromRound,
      fromSlot,
      toRound,
      toSlot,
      matchCount,
    ) &&
    isFixedSwissAdjacentWinEdge(fromCol, toCol)
  ) {
    return true;
  }
  if (
    fromSlot != null &&
    toSlot != null &&
    isFixedSwissCrossToLowerWinEdge(
      fromRound,
      fromSlot,
      toRound,
      toSlot,
      matchCount,
    ) &&
    fromCol === -2 &&
    toCol === -3
  ) {
    return true;
  }
  if (
    fromSlot != null &&
    toSlot != null &&
    isFixedSwissLowerTour3To4WinEdge(
      fromRound,
      fromSlot,
      toRound,
      toSlot,
      matchCount,
    ) &&
    fromCol === -3 &&
    toCol === -4
  ) {
    return true;
  }
  if (
    fromSlot != null &&
    toSlot != null &&
    isFixedSwissQuarterSemiWinEdge(
      fromRound,
      fromSlot,
      toRound,
      toSlot,
      matchCount,
    ) &&
    fromCol === 2 &&
    toCol === 3 &&
    (!isFixedSwissTsLargeCurrentGrid(matchCount) ||
      (isFixedSwissTs32CurrentGrid(matchCount) && fromSlot >= 9 && fromSlot <= 12) ||
      (isFixedSwissTs64CurrentGrid(matchCount) &&
        fromSlot >= 25 &&
        fromSlot <= 32))
  ) {
    return true;
  }
  if (
    fromSlot != null &&
    toSlot != null &&
    isFixedSwissSemiFinalWinEdge(
      fromRound,
      fromSlot,
      toRound,
      toSlot,
      matchCount,
    ) &&
    ((fromCol === 3 && toCol === 4) || (fromCol === 4 && toCol === 5))
  ) {
    return true;
  }
  return false;
}

/** Победа нижней R2 → крест (нижняя, тур 2). */
export function isFixedSwissR23LowerWinEdge(
  fromCol: number,
  toCol: number,
  kind: SwissEdgeKind,
): boolean {
  return kind === "win" && fromCol === -1 && toCol === -2;
}

/** Линия проигрыша R1 → нижняя, тур 1. */
export function isFixedSwissR1LowerLossEdge(
  fromCol: number,
  toCol: number,
  kind: SwissEdgeKind,
): boolean {
  return kind === "loss" && fromCol === 0 && toCol === -1;
}

/** Проигрыш верхней тура 2 → крест (тур 3). */
export function isFixedSwissR23UpperLossEdge(
  fromCol: number,
  toCol: number,
  kind: SwissEdgeKind,
): boolean {
  return kind === "loss" && fromCol === 1 && toCol === -2;
}

/** Рисовать линию проигрыша (R12 + R23). */
export function shouldDrawFixedSwissLossEdge(
  fromCol: number,
  toCol: number,
  isPhantomBye: boolean,
  fromRound: number,
  toRound: number,
): boolean {
  if (isFixedSwissRound12Edge(fromRound, toRound)) {
    return fromCol === 0 && toCol === -1;
  }
  if (isFixedSwissRound23Edge(fromRound, toRound)) {
    return false;
  }
  return false;
}

/** Подписи «место …» для актуальной TS-сетки 27 (#13–#27). */
export function fixedSwissTs27PlacementByMatchNo(no: number): string | null {
  if (no >= 13 && no <= 16) return "место 13–16";
  if (no >= 17 && no <= 20) return "место 9–12";
  if (no >= 21 && no <= 24) return "место 5–8";
  if (no === 25 || no === 26) return "место 3–4";
  if (no === 27) return "место 1–2";
  return null;
}

export function fixedSwissTs32MatchCol(round: number, slot: number): number {
  const half1 = 8;
  if (round === 1) return 0;
  if (round === 2 && slot <= half1) return -1;
  if (round === 2) return 1;
  if (round === 3 && slot <= half1) return -2;
  if (round === 3 && slot <= half1 + half1 / 2) return 2;
  if (round === 3) return -4;
  if (round === 4) return -3;
  if (round === 5) return 3;
  if (round === 6) return 4;
  return 5;
}

/** Колонки устаревшей 32→16 (55/56, 6 туров). */
export function fixedSwissTs32OutdatedMatchCol(round: number, slot: number): number {
  const half1 = 8;
  if (round === 1) return 0;
  if (round === 2 && slot <= half1) return -1;
  if (round === 2) return 1;
  if (round === 3 && slot <= half1) return -2;
  if (round === 3) return 2;
  if (round === 4) return 3;
  if (round === 5) return 4;
  return 5;
}

export function fixedSwissTs32ColumnLabel(col: number): string {
  const labels: Record<number, string> = {
    [-4]: "Нижняя, тур 4",
    [-3]: "Нижняя, тур 3",
    [-2]: "Нижняя, тур 2",
    [-1]: "Нижняя, тур 1",
    0: "Первый тур",
    1: "Верхняя, тур 1",
    2: "1/8 финала",
    3: "1/4 финала",
    4: "Полуфинал",
    5: "Финал",
  };
  return labels[col] ?? gridFixedColumnLabel(col);
}

export function fixedSwissTs64MatchCol(round: number, slot: number): number {
  const half1 = 16;
  if (round === 1) return 0;
  if (round === 2 && slot <= half1) return -1;
  if (round === 2) return 1;
  if (round === 3 && slot <= half1) return -2;
  if (round === 3 && slot <= half1 + half1 / 2) return 2;
  if (round === 3) return -4;
  if (round === 4) return -3;
  if (round === 5) return 3;
  if (round === 6) return 4;
  return 5;
}

export function fixedSwissTs64ColumnLabel(col: number): string {
  return fixedSwissTs32ColumnLabel(col);
}

export function fixedSwissTs64PlacementByMatchNo(
  no: number,
  withBronze: boolean,
): string | null {
  if (withBronze && no === 112) return "матч за 3–4 место";
  if (withBronze && (no === 109 || no === 110)) return "полуфинал";
  if (no === 111) return "место 1–2";
  if (no >= 33 && no <= 48) return "место 49–64";
  if (no >= 65 && no <= 80) return "место 33–48";
  if (no >= 89 && no <= 96) return "место 17–24";
  if (no >= 97 && no <= 104) return "место 9–16";
  if (no >= 105 && no <= 108) return "место 5–8";
  if (no === 109 || no === 110) return "место 3–4";
  return null;
}

export function fixedSwissTs32PlacementByMatchNo(
  no: number,
  withBronze: boolean,
): string | null {
  if (withBronze && no === 60) return "матч за 3–4 место";
  if (withBronze && (no === 57 || no === 58)) return "полуфинал";
  if (no === 59) return "место 1–2";
  if (no >= 17 && no <= 24) return "место 25–32";
  if (no >= 33 && no <= 40) return "место 17–24";
  if (no >= 45 && no <= 48) return "место 13–16";
  if (no >= 49 && no <= 52) return "место 9–12";
  if (no >= 53 && no <= 56) return "место 5–8";
  if (no === 57 || no === 58) return "место 3–4";
  return null;
}

export function fixedSwissTs28PlacementByMatchNo(no: number): string | null {
  if (no >= 13 && no <= 16) return "место 13–16";
  if (no >= 17 && no <= 20) return "место 9–12";
  if (no >= 21 && no <= 24) return "место 5–8";
  if (no === 25 || no === 26) return "полуфинал";
  if (no === 28) return "матч за 3–4 место";
  if (no === 27) return "место 1–2";
  return null;
}

/** Подпись «место X–Y» / этап — как tournamentservice.net. */
export function fixedSwissPlacementLabel(
  round: number,
  slot: number,
  maxRound: number,
  matchesPerRound: number,
  matchCount?: number,
  /** Номер на карточке (#N) — при 27 встречах надёжнее round/slot + maxRound. */
  matchNumber?: number,
): string | null {
  if (matchCount === 28) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount, maxRound);
    return fixedSwissTs28PlacementByMatchNo(no);
  }

  if (matchCount === 60) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount, maxRound);
    return fixedSwissTs32PlacementByMatchNo(no, true);
  }

  if (matchCount === 112) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount, maxRound);
    return fixedSwissTs64PlacementByMatchNo(no, true);
  }

  if (matchCount === 111) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount, maxRound);
    return fixedSwissTs64PlacementByMatchNo(no, false);
  }

  if (matchCount === 59) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount, maxRound);
    return fixedSwissTs32PlacementByMatchNo(no, false);
  }

  if (matchCount === 56 || matchCount === 55 || matchCount === 63) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount, maxRound);
    return fixedSwissTs32PlacementByMatchNo(no, false);
  }

  if (matchCount === 27) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount, maxRound);
    return fixedSwissTs27PlacementByMatchNo(no);
  }

  if (
    matchCount !== undefined &&
    (isFixedSwissTsMatchCount(matchCount, maxRound) ||
      isFixedSwissTsLegacy29MatchCount(matchCount) ||
      isFixedSwissTsLegacy27SixRound(matchCount, maxRound))
  ) {
    const no = fixedSwissMatchNo(round, slot, matchCount, maxRound);
    if (no >= 13 && no <= 16) return "место 13–16";
    if (no >= 17 && no <= 20) return "место 9–12";
    if (isFixedSwissTsLegacy27SixRound(matchCount, maxRound)) {
      if (no >= 23 && no <= 24) return "место 5–6";
      if (no === 25 || no === 26) return "полуфинал";
      if (no === 27) return "финал";
    } else if (isFixedSwissTsLegacy29MatchCount(matchCount)) {
      if (no >= 23 && no <= 24) return "место 7–8";
      if (no >= 25 && no <= 26) return "место 5–6";
      if (no === 27 || no === 28) return "полуфинал";
      if (no === 29) return "финал";
    } else {
      if (no >= 21 && no <= 24) return "место 5–8";
      if (no === 25 || no === 26) return "место 3–4";
      if (no === 27) return "место 1–2";
    }
    return null;
  }

  if (
    matchCount !== undefined &&
    isFixedSwiss168LegacyMatchCount(matchCount, maxRound)
  ) {
    const no = fixedSwiss168MatchNo(round, slot);
    if (no >= 13 && no <= 16) return "место 13–16";
    if (no >= 17 && no <= 20) return "место 9–12";
    if (no >= 21 && no <= 24) return "место 5–8";
    if (no === 25 || no === 26) return "место 3–4";
    if (no === 27) return "место 1–2";
    return null;
  }

  if (round !== maxRound) return null;
  const gridSize = matchesPerRound * 2;
  const placesPerMatch = gridSize / matchesPerRound;
  const from = (slot - 1) * placesPerMatch + 1;
  const to = slot * placesPerMatch;
  return `место ${from}–${to}`;
}

export function fixedSwiss168ColumnLabel(col: number): string {
  const labels: Record<number, string> = {
    [-2]: "Крест",
    [-1]: "Нижняя, тур 1",
    0: "Первый тур",
    1: "Верхняя, тур 1",
    2: "1/4 финала",
    3: "Полуфинал",
    4: "Финал",
  };
  return labels[col] ?? gridFixedColumnLabel(col);
}

export function fixedSwissTsColumnLabel(col: number): string {
  const labels: Record<number, string> = {
    [-2]: "Нижняя, тур 2",
    [-1]: "Нижняя, тур 1",
    0: "Первый тур",
    1: "Верхняя, тур 1",
    2: "1/4 финала",
    3: "Полуфинал",
    4: "Финал",
  };
  return labels[col] ?? gridFixedColumnLabel(col);
}

export function fixedSwissTsLegacy29ColumnLabel(col: number): string {
  const labels: Record<number, string> = {
    [-4]: "Нижняя, тур 4",
    [-3]: "Нижняя, тур 3",
    [-2]: "Нижняя, тур 2",
    [-1]: "Нижняя, тур 1",
    0: "Первый тур",
    1: "Верхняя, тур 1",
    2: "Верхняя, тур 2",
    3: "Полуфинал",
    4: "Финал",
  };
  return labels[col] ?? gridFixedColumnLabel(col);
}

export function fixedSwissColumnLabel(
  col: number,
  matchCount: number,
  maxRound?: number,
): string {
  if (isFixedSwissTsLegacy29MatchCount(matchCount)) {
    return fixedSwissTsLegacy29ColumnLabel(col);
  }
  if (isFixedSwissTs32MatchCount(matchCount) || isFixedSwissTs32BronzeMatchCount(matchCount) || isOutdatedFixedSwiss32Bracket(matchCount)) {
    return fixedSwissTs32ColumnLabel(col);
  }
  if (isFixedSwissTs64MatchCount(matchCount) || isFixedSwissTs64BronzeMatchCount(matchCount)) {
    return fixedSwissTs64ColumnLabel(col);
  }
  if (
    isFixedSwissTsMatchCount(matchCount, maxRound) ||
    isFixedSwissTsLegacy27SixRound(matchCount, maxRound)
  ) {
    return fixedSwissTsColumnLabel(col);
  }
  return fixedSwiss168ColumnLabel(col);
}

