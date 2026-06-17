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
  fixedSwissTsOlympicToQuarterTarget,
  isFixedSwissTs32BronzeMatchCount,
  isFixedSwissTs32MatchCount,
  isFixedSwissTs32R8ElimAtEighthMatchCount,
  isFixedSwissTs32R8ElimAtEighthBronzeMatchCount,
  isFixedSwissTs32R8ElimAtEighthFamily,
  isFixedSwissTs64R8ElimAtEighthMatchCount,
  isFixedSwissTs64R8ElimAtEighthBronzeMatchCount,
  isFixedSwissTs64R8ElimAtEighthFamily,
  isFixedSwissTs64R8ElimAtEighthFromMatches,
  isFixedSwissTs128R8ElimAtEighthMatchCount,
  isFixedSwissTs128R8ElimAtEighthBronzeMatchCount,
  isFixedSwissTs128R8ElimAtEighthFamily,
  isFixedSwissTs128R8ElimAtEighthFromMatches,
  isFixedSwissTs128BronzeMatchCount,
  isFixedSwissTs128MatchCount,
  isFixedSwissTs64BronzeMatchCount,
  isFixedSwissTs64MatchCount,
  fixedSwissTsUpperTour2Slot,
  isFixedSwissTs84BronzeMatchCount,
  isFixedSwissTs84MatchCount,
  isOutdatedFixedSwiss32Bracket,
  tsMaxRound,
  tsPostR3SlotCount,
} from "@/lib/fixed-swiss-ts-grid";
import { describeHandicapShort } from "@/lib/handicap";
import { teamRating } from "@/lib/pair-tournament";
import {
  GRID_LABEL_OFFSET,
  GRID_META_H,
  GRID_PAD,
  GRID_ROW_H,
  gridCardHeight,
  teamDividerY,
  type SwissBracketEdge,
  type SwissBracketLayout,
  type SwissEdgeKind,
  type SwissMatchPosition,
} from "@/lib/swiss-bracket-layout";

/** Эталон layout/UI 16→8 — docs/BRACKET_REFERENCE_16_8.md */
export const BRACKET_REFERENCE_VARIANT = "fixed-swiss-16-8-27" as const;

export const FIXED_SWISS_COL_W = 228;
export const FIXED_SWISS_CARD_W = 208;
/** Зазор между gutter и левым краем карточки — линия не «наезжает» на блок. */
const FIXED_SWISS_LINE_ENTRY_GAP = 12;
/** Высота строки «Фора» / подвала на карточке (px). */
export const FIXED_SWISS_COMPACT_ROW_H = 18;

/** Высота карточки по фактическому содержимому (для отрисовки). */
export function fixedSwissMatchCardHeight(
  hasHandicap: boolean,
  footerRowCount: number,
  hasMatchNumber = true,
): number {
  return (
    (hasMatchNumber ? GRID_META_H : 0) +
    GRID_ROW_H * 2 +
    (hasHandicap ? FIXED_SWISS_COMPACT_ROW_H : 0) +
    footerRowCount * FIXED_SWISS_COMPACT_ROW_H +
    CARD_LAYOUT_BUFFER
  );
}

/** Базовая высота в формулах раскладки: мета + 2 строки + 1 строка подвала. */
export const FIXED_SWISS_CARD_H =
  GRID_META_H + GRID_ROW_H * 2 + FIXED_SWISS_COMPACT_ROW_H;

/** Вертикальный шаг (fallback, если нет покомпонентной раскладки 1-го тура). */
export const FIXED_SWISS_BRACKET_UNIT = FIXED_SWISS_CARD_H + 8;
/** Верхний отступ карточки 1-го тура в ячейке сетки (px). */
const FIXED_SWISS_ROUND1_Y_INSET = 4;
/** Зазор между карточками 1-го тура (px). */
const FIXED_SWISS_ROUND1_GAP = 8;
/** Запас на border/subpixel в расчёте высоты карточки. */
const CARD_LAYOUT_BUFFER = 4;

let layoutCardHeights: Map<string, number> | undefined;
let layoutRound1SlotY: Map<number, number> | undefined;

export function fixedSwissCardMetaH(
  display?: FixedSwissDisplayOpts,
): number {
  return display?.showCardMatchNumber !== false ? GRID_META_H : 0;
}

export function fixedSwissTeamDividerY(
  cardTop: number,
  display?: FixedSwissDisplayOpts,
): number {
  return cardTop + fixedSwissCardMetaH(display) + GRID_ROW_H;
}

function fixedSwissRound1SlotY(slot: number, unit = FIXED_SWISS_BRACKET_UNIT): number {
  if (layoutRound1SlotY?.has(slot)) return layoutRound1SlotY.get(slot)!;
  return (slot - 1) * unit + FIXED_SWISS_ROUND1_Y_INSET;
}

function layoutMatchCardHeight(matchId: string, fallback = FIXED_SWISS_CARD_H): number {
  return layoutCardHeights?.get(matchId) ?? fallback;
}

function matchHasHandicap(
  match: BracketMatchView,
  halfStep = true,
): boolean {
  if (!match.team1 || !match.team2) return false;
  const short = describeHandicapShort(
    Math.max(teamRating(match.team1), teamRating(match.team2)),
    Math.min(teamRating(match.team1), teamRating(match.team2)),
    { halfStep },
  );
  return Boolean(short);
}

export type FixedSwissDisplayOpts = {
  showCardMatchNumber?: boolean;
  showCardHandicap?: boolean;
  showCardPlacement?: boolean;
  handicapHalfStep?: boolean;
};

function estimateFixedSwissFooterRowCount(
  match: BracketMatchView,
  edges: SwissBracketEdge[],
  opts?: {
    matchCount?: number;
    matchNumber?: number;
    maxRound?: number;
    matchesPerRound?: number;
    showCardPlacement?: boolean;
  },
): number {
  let rows = 0;
  if (opts?.showCardPlacement !== false) {
    const hasWin = edges.some(
      (e) => e.fromId === match.id && (e.kind === "win" || e.kind === "bye"),
    );
    const hasLoss = edges.some(
      (e) => e.fromId === match.id && e.kind === "loss",
    );
    const placement =
      opts?.matchCount != null && opts?.maxRound != null
        ? fixedSwissPlacementLabel(
            match.round,
            match.slot,
            opts.maxRound,
            opts.matchesPerRound ?? inferFixedSwissGridSize(opts.matchCount) / 2,
            opts.matchCount,
            opts.matchNumber,
          )
        : null;

    if (placement && hasWin && hasLoss) {
      rows = 2;
    } else if (placement || hasWin || hasLoss) {
      rows = 1;
    }
  }
  if (match.status === "WALKOVER") rows += 1;
  return rows;
}

/** Оценка высоты карточки для раскладки (с фактической форой и подвалом). */
export function estimateFixedSwissCardHeight(
  match: BracketMatchView,
  edges: SwissBracketEdge[],
  opts?: {
    matchCount?: number;
    matchNumber?: number;
    maxRound?: number;
    showCardMatchNumber?: boolean;
    showCardHandicap?: boolean;
    showCardPlacement?: boolean;
    handicapHalfStep?: boolean;
  },
): number {
  const matchesPerRound =
    opts?.matchCount != null
      ? inferFixedSwissGridSize(opts.matchCount) / 2
      : undefined;
  const hasHandicap =
    opts?.showCardHandicap !== false &&
    matchHasHandicap(match, opts?.handicapHalfStep !== false);
  const hasMatchNumber = opts?.showCardMatchNumber !== false;
  return fixedSwissMatchCardHeight(
    hasHandicap,
    estimateFixedSwissFooterRowCount(match, edges, {
      ...opts,
      matchesPerRound,
    }),
    hasMatchNumber,
  );
}

function buildFixedSwissRound1SlotY(
  matches: BracketMatchView[],
  cardHeights: Map<string, number>,
  maxSlot: number,
): Map<number, number> {
  const bySlot = new Map<number, BracketMatchView>();
  for (const m of matches) {
    if (m.round === 1) bySlot.set(m.slot, m);
  }
  const map = new Map<number, number>();
  let y = FIXED_SWISS_ROUND1_Y_INSET;
  for (let slot = 1; slot <= maxSlot; slot++) {
    map.set(slot, y);
    const m = bySlot.get(slot);
    const h = m ? (cardHeights.get(m.id) ?? FIXED_SWISS_CARD_H) : FIXED_SWISS_CARD_H;
    y += h + FIXED_SWISS_ROUND1_GAP;
  }
  return map;
}

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
  if (
    isFixedSwiss168MatchCount(matchCount) ||
    isFixedSwissTs64MatchCount(matchCount) ||
    isFixedSwissTs64BronzeMatchCount(matchCount) ||
    isFixedSwissTs64R8ElimAtEighthFamily(matchCount, maxRound) ||
    isFixedSwissTs64R8ElimAtEighthFromMatches(matches) ||
    isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound) ||
    isFixedSwissTs128R8ElimAtEighthFromMatches(matches) ||
    isFixedSwissTs128MatchCount(matchCount) ||
    isFixedSwissTs128BronzeMatchCount(matchCount) ||
    isFixedSwissTs32MatchCount(matchCount) ||
    isFixedSwissTs32BronzeMatchCount(matchCount) ||
    isFixedSwissTs32R8ElimAtEighthFamily(matchCount, maxRound)
  ) {
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

/** Колонки TS 27/13 встреч (масштаб half2=8 / 4). */
export function fixedSwissTsMatchCol(
  round: number,
  slot: number,
  matchCount?: number,
): number {
  if (matchCount !== undefined && isFixedSwissTsLegacy29MatchCount(matchCount)) {
    return fixedSwissTsLegacy29MatchCol(round, slot);
  }
  const half1 =
    matchCount === 13 || matchCount === 14 ? 2 : 4;
  if (round === 1) return 0;
  if (round === 2 && slot <= half1) return -1;
  if (round === 2) return 1;
  if (round === 3 && slot <= half1) return -2;
  if (round === 3) return 2;
  if (matchCount === 13 || matchCount === 14) return 3;
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

/** Подвал карточки: верхняя ветка и 1-й тур — слева проигравший, справа победитель; нижняя — наоборот. */
export function fixedSwissDestSplit(
  bracketCol: number,
  loserLine: string | null,
  winnerLine: string | null,
): { left: string; right: string } {
  const loser = loserLine ?? "—";
  const winner = winnerLine ?? "—";
  if (bracketCol < 0) {
    return { left: winner, right: loser };
  }
  return { left: loser, right: winner };
}

export function fixedSwissMatchColForCount(
  round: number,
  slot: number,
  matchCount: number,
  maxRound?: number,
): number {
  if (
    isFixedSwissTs32MatchCount(matchCount) ||
    isFixedSwissTs32BronzeMatchCount(matchCount) ||
    isFixedSwissTs32R8ElimAtEighthFamily(matchCount, maxRound)
  ) {
    return fixedSwissTs32MatchCol(round, slot);
  }
  if (
    isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound ?? 0)
  ) {
    return fixedSwissTs128MatchCol(round, slot);
  }
  if (
    isFixedSwissTs64R8ElimAtEighthFamily(matchCount, maxRound ?? 0)
  ) {
    return fixedSwissTs64MatchCol(round, slot);
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
  if (
    isFixedSwissTs84BronzeMatchCount(matchCount) ||
    isFixedSwissTs84MatchCount(matchCount, maxRound) ||
    isFixedSwissTsMatchCount(matchCount, maxRound)
  ) {
    return fixedSwissTsMatchCol(round, slot, matchCount);
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
  h1 = cardH,
  h2 = cardH,
  hc = cardH,
): number {
  return (y1 + h1 / 2 + y2 + h2 / 2) / 2 - hc / 2;
}

function matchLayoutCardH(
  match: BracketMatchView | undefined,
  fallback: number,
): number {
  return match ? layoutMatchCardHeight(match.id, fallback) : fallback;
}

function centerBetweenSlots(
  parentRound: number,
  parentSlotA: number,
  parentSlotB: number,
  childRound: number,
  childSlot: number,
  slotY: Map<string, number>,
  byRoundSlot: Map<string, BracketMatchView>,
  fallbackCardH: number,
): number {
  const parentA = byRoundSlot.get(`${parentRound}:${parentSlotA}`);
  const parentB = byRoundSlot.get(`${parentRound}:${parentSlotB}`);
  const child = byRoundSlot.get(`${childRound}:${childSlot}`);
  return centerBetweenParents(
    yAt(parentRound, parentSlotA, slotY),
    yAt(parentRound, parentSlotB, slotY),
    fallbackCardH,
    matchLayoutCardH(parentA, fallbackCardH),
    matchLayoutCardH(parentB, fallbackCardH),
    matchLayoutCardH(child, fallbackCardH),
  );
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
    return fixedSwissRound1SlotY(slot, unit);
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
        lastBottom = y + layoutMatchCardHeight(m.id, cardH);
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
      lastBottom = y + layoutMatchCardHeight(m.id, cardH);
    }
  }
}

function resolveAllColumnOverlaps(
  positions: Map<string, SwissMatchPosition>,
  cardHeights: Map<string, number>,
  fallbackCardH: number,
  gap = COL_COLLISION_GAP,
) {
  const byCol = new Map<number, string[]>();
  for (const [id, pos] of positions) {
    const list = byCol.get(pos.col) ?? [];
    list.push(id);
    byCol.set(pos.col, list);
  }

  for (const ids of byCol.values()) {
    const sorted = [...ids].sort(
      (a, b) => positions.get(a)!.y - positions.get(b)!.y,
    );
    let lastBottom = -Infinity;
    for (const id of sorted) {
      const pos = positions.get(id)!;
      let y = pos.y;
      if (y < lastBottom + gap) {
        y = lastBottom + gap;
        positions.set(id, { ...pos, y });
      }
      const h = cardHeights.get(id) ?? fallbackCardH;
      lastBottom = y + h;
    }
  }
}

export function fixedSwissBracketHeight(
  matchesPerRound: number,
  cardH: number = FIXED_SWISS_CARD_H,
): number {
  const unit = FIXED_SWISS_BRACKET_UNIT;
  return (matchesPerRound - 1) * unit + FIXED_SWISS_ROUND1_Y_INSET + cardH;
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
    lastBottom = y + layoutMatchCardHeight(id, cardH);
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
    lastBottom = y + layoutMatchCardHeight(id, cardH);
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
    const y = fixedSwissRound1SlotY(slot, unit);
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
  if (isFixedSwissTs128R8ElimAtEighthFromMatches(matches)) {
    if (matchCount === 216) {
      return buildTsPositionsLargeR8ElimAtEighthBronze(matches, cardH, 64);
    }
    return buildTsPositionsLargeR8ElimAtEighth(matches, cardH, 64);
  }
  if (isFixedSwissTs64R8ElimAtEighthFromMatches(matches)) {
    if (matchCount === 112) {
      return buildTsPositionsLargeR8ElimAtEighthBronze(matches, cardH, 32);
    }
    return buildTsPositionsLargeR8ElimAtEighth(matches, cardH, 32);
  }
  if (isFixedSwissTs32BronzeMatchCount(matchCount)) {
    return buildTsPositions32Bronze(matches, cardH);
  }
  if (isFixedSwissTs32MatchCount(matchCount)) {
    return buildTsPositions32(matches, cardH);
  }
  if (isFixedSwissTs32R8ElimAtEighthBronzeMatchCount(matchCount, maxRound)) {
    return buildTsPositions32R8ElimAtEighthBronze(matches, cardH);
  }
  if (isFixedSwissTs32R8ElimAtEighthMatchCount(matchCount, maxRound)) {
    return buildTsPositions32R8ElimAtEighth(matches, cardH);
  }
  if (isFixedSwissTs128R8ElimAtEighthBronzeMatchCount(matchCount, maxRound)) {
    return buildTsPositionsLargeR8ElimAtEighthBronze(matches, cardH, 64);
  }
  if (isFixedSwissTs128R8ElimAtEighthMatchCount(matchCount, maxRound)) {
    return buildTsPositionsLargeR8ElimAtEighth(matches, cardH, 64);
  }
  if (isFixedSwissTs64R8ElimAtEighthBronzeMatchCount(matchCount, maxRound)) {
    return buildTsPositionsLargeR8ElimAtEighthBronze(matches, cardH, 32);
  }
  if (isFixedSwissTs64R8ElimAtEighthMatchCount(matchCount, maxRound)) {
    return buildTsPositionsLargeR8ElimAtEighth(matches, cardH, 32);
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
  if (isFixedSwissTs84BronzeMatchCount(matchCount)) {
    return buildTsPositionsBronzeForHalf2(matches, cardH, 4);
  }
  if (isFixedSwissTsBronzeMatchCount(matchCount)) {
    return buildTsPositionsBronzeForHalf2(matches, cardH, 8);
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
    const y = fixedSwissRound1SlotY(slot, unit);
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

/** TS large-grid R8 elim: без нижней тур 4 — вылет с 1/8 на места (half1+1)–(half1+half1/2). */
function buildTsPositionsLargeR8ElimAtEighth(
  matches: BracketMatchView[],
  cardH: number,
  half2: 32 | 64,
): Map<string, SwissMatchPosition> {
  const half1 = half2 / 2;
  const positions = new Map<string, SwissMatchPosition>();
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }

  const slotY = new Map<string, number>();
  const unit = FIXED_SWISS_BRACKET_UNIT;

  for (let slot = 1; slot <= half2; slot++) {
    const y = fixedSwissRound1SlotY(slot, unit);
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

  for (let slot = 1; slot <= half1; slot++) {
    const y = yAt(2, slot, slotY);
    slotY.set(`3:${slot}`, y);
    const m = byRoundSlot.get(`3:${slot}`);
    if (m) {
      const col = half2 > 32 && slot > half1 / 2 ? -3 : -2;
      positions.set(m.id, { col, y });
    }
  }
  if (half2 > 32) {
    resolveFixedColCollisionsInOrder(
      positions,
      slotY,
      Array.from({ length: half1 / 2 }, (_, i) =>
        byRoundSlot.get(`3:${i + 1}`)!.id,
      ),
      cardH,
      COL_COLLISION_GAP,
    );
    resolveFixedColCollisionsInOrder(
      positions,
      slotY,
      Array.from({ length: half1 / 2 }, (_, i) =>
        byRoundSlot.get(`3:${i + half1 / 2 + 1}`)!.id,
      ),
      cardH,
      COL_COLLISION_GAP,
    );
  } else {
    resolveFixedColCollisionsInOrder(
      positions,
      slotY,
      Array.from({ length: half1 }, (_, i) => byRoundSlot.get(`3:${i + 1}`)!.id),
      cardH,
      COL_COLLISION_GAP,
    );
  }

  const upperTour2Ids: string[] = [];
  const upperTourPairCount =
    half2 <= 32 ? half1 / 2 : (3 * half1) / 8;
  for (let k = 1; k <= upperTourPairCount; k++) {
    const slotA = half1 + 2 * k - 1;
    const slotB = half1 + 2 * k;
    const upperTour2Slot = fixedSwissTsUpperTour2Slot(half2, k);
    if (upperTour2Slot == null) continue;
    const upperY = centerBetweenParents(
      yAt(2, slotA, slotY),
      yAt(2, slotB, slotY),
      cardH,
    );
    slotY.set(`3:${upperTour2Slot}`, upperY);
    const upper = byRoundSlot.get(`3:${upperTour2Slot}`);
    if (upper) {
      positions.set(upper.id, { col: 2, y: upperY });
      upperTour2Ids.push(upper.id);
    }
  }

  const eighthIds: string[] = [];
  for (let k = half1 / 4 + 1; k <= half1 / 2; k++) {
    const slotA = half1 + 2 * k - 1;
    const slotB = half1 + 2 * k;
    const eighthSlot = half1 + (half1 / 2 + 1 - k);
    const eighthY = centerBetweenParents(
      yAt(2, slotA, slotY),
      yAt(2, slotB, slotY),
      cardH,
    );
    slotY.set(`3:${eighthSlot}`, eighthY);
    const eighth = byRoundSlot.get(`3:${eighthSlot}`);
    if (eighth) {
      positions.set(eighth.id, { col: 4, y: eighthY });
      eighthIds.push(eighth.id);
    }
  }

  resolveFixedColCollisionsInOrder(
    positions,
    slotY,
    [
      ...Array.from({ length: half1 / 4 }, (_, i) =>
        byRoundSlot.get(`3:${half2 + i + 1}`)?.id,
      ),
      ...Array.from({ length: half1 / 4 }, (_, i) =>
        byRoundSlot.get(`3:${half1 + half1 / 4 + 1 + i}`)?.id,
      ),
    ].filter((id): id is string => id != null),
    cardH,
    COL_COLLISION_GAP,
  );
  resolveFixedColCollisions(positions, slotY, eighthIds, cardH, COL_COLLISION_GAP);

  const lowerTour3Ids: string[] = [];
  for (let slot = 1; slot <= half1 / 2; slot++) {
    let y: number;
    if (slot <= half1 / 4) {
      const crossA = 2 * slot - 1;
      y = centerBetweenParents(
        yAt(3, crossA, slotY),
        yAt(3, crossA + 1, slotY),
        cardH,
      );
    } else if (slot <= half1 / 2) {
      const bridgeA = half1 / 2 + 2 * (slot - half1 / 4) - 1;
      y = centerBetweenParents(
        yAt(3, bridgeA, slotY),
        yAt(3, bridgeA + 1, slotY),
        cardH,
      );
    } else {
      throw new Error(`Unexpected lower tour 3 slot ${slot}`);
    }
    slotY.set(`4:${slot}`, y);
    const lowerR3 = byRoundSlot.get(`4:${slot}`);
    if (lowerR3) {
      const col = half2 > 32 && slot > half1 / 4 ? -5 : half2 > 32 ? -4 : -3;
      positions.set(lowerR3.id, { col, y });
      lowerTour3Ids.push(lowerR3.id);
    }
  }
  if (half2 > 32) {
    resolveFixedColCollisionsInOrder(
      positions,
      slotY,
      Array.from({ length: half1 / 4 }, (_, i) =>
        byRoundSlot.get(`4:${i + 1}`)!.id,
      ),
      cardH,
      COL_COLLISION_GAP,
    );
    resolveFixedColCollisionsInOrder(
      positions,
      slotY,
      Array.from({ length: half1 / 4 }, (_, i) =>
        byRoundSlot.get(`4:${i + half1 / 4 + 1}`)!.id,
      ),
      cardH,
      COL_COLLISION_GAP,
    );
  } else {
    resolveFixedColCollisionsInOrder(
      positions,
      slotY,
      Array.from({ length: half1 / 2 }, (_, i) =>
        byRoundSlot.get(`4:${i + 1}`)!.id,
      ),
      cardH,
      COL_COLLISION_GAP,
    );
  }

  const upperTour3Count = half1 / 2;
  for (let k = 1; k <= upperTourPairCount; k++) {
    const upperTour2Slot = fixedSwissTsUpperTour2Slot(half2, k)!;
    const y = yAt(3, upperTour2Slot, slotY);
    slotY.set(`5:${k}`, y);
    const quarter = byRoundSlot.get(`5:${k}`);
    if (quarter) positions.set(quarter.id, { col: 3, y });
  }
  if (half2 > 32) {
    for (let k = 13; k <= half1 / 2; k++) {
      const r5Slot = half1 / 2 - half1 / 8 + 1 + (k - 13);
      const slotA = half1 + 2 * k - 1;
      const slotB = half1 + 2 * k;
      const y = centerBetweenParents(
        yAt(2, slotA, slotY),
        yAt(2, slotB, slotY),
        cardH,
      );
      slotY.set(`5:${r5Slot}`, y);
      const quarter = byRoundSlot.get(`5:${r5Slot}`);
      if (quarter) positions.set(quarter.id, { col: 3, y });
    }
  }
  resolveFixedColCollisionsInOrder(
    positions,
    slotY,
    Array.from({ length: upperTour3Count }, (_, i) =>
      byRoundSlot.get(`5:${i + 1}`)!.id,
    ),
    cardH,
    COL_COLLISION_GAP,
  );

  for (let slot = 1; slot <= half1 / 4; slot++) {
    const r3QuarterSlot = half1 + slot;
    const r5A = 2 * slot - 1;
    const r5B = 2 * slot;
    const quarterMatch = byRoundSlot.get(`3:${r3QuarterSlot}`);
    if (quarterMatch) {
      const yQ = centerBetweenParents(yAt(5, r5A, slotY), yAt(5, r5B, slotY), cardH);
      slotY.set(`3:${r3QuarterSlot}`, yQ);
      positions.set(quarterMatch.id, { col: 4, y: yQ });
    }
  }

  const thirdGroupSize = half1 / 8;
  const semi1Y = centerBetweenParents(
    yAt(3, half1 + 1, slotY),
    yAt(3, half1 + thirdGroupSize, slotY),
    cardH,
  );
  slotY.set(`6:1`, semi1Y);
  const semi1 = byRoundSlot.get("6:1");
  if (semi1) positions.set(semi1.id, { col: 5, y: semi1Y });

  const semi2Y = centerBetweenParents(
    yAt(3, half1 + thirdGroupSize + 1, slotY),
    yAt(3, half1 + half1 / 4, slotY),
    cardH,
  );
  slotY.set(`6:2`, semi2Y);
  const semi2 = byRoundSlot.get("6:2");
  if (semi2) positions.set(semi2.id, { col: 5, y: semi2Y });

  const finalY = centerBetweenParents(yAt(6, 1, slotY), yAt(6, 2, slotY), cardH);
  const fin = byRoundSlot.get("7:1");
  if (fin) positions.set(fin.id, { col: 6, y: finalY });

  return positions;
}

/** TS large-grid R8 elim + бронза под финалом. */
function buildTsPositionsLargeR8ElimAtEighthBronze(
  matches: BracketMatchView[],
  cardH: number,
  half2: 32 | 64,
): Map<string, SwissMatchPosition> {
  const positions = buildTsPositionsLargeR8ElimAtEighth(matches, cardH, half2);
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
    y:
      finPos.y +
      layoutMatchCardHeight(fin.id, cardH) +
      FIXED_SWISS_BRONZE_BELOW_GAP,
  });
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
    const y = fixedSwissRound1SlotY(slot, unit);
    slotY.set(`1:${slot}`, y);
    const m = byRoundSlot.get(`1:${slot}`);
    if (m) positions.set(m.id, { col: 0, y });
  }

  for (let slot = 1; slot <= half1; slot++) {
    const y = centerBetweenSlots(
      1,
      2 * slot - 1,
      2 * slot,
      2,
      slot,
      slotY,
      byRoundSlot,
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
      const olympicY = centerBetweenSlots(
        2,
        parentA,
        parentB,
        3,
        olympicSlot,
        slotY,
        byRoundSlot,
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
      const olympicY = centerBetweenSlots(
        3,
        parentA,
        parentB,
        3,
        olympicSlot,
        slotY,
        byRoundSlot,
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
          ? centerBetweenSlots(
              3,
              parentA,
              parentB,
              round,
              slot,
              slotY,
              byRoundSlot,
              cardH,
            )
          : centerBetweenSlots(
              round - 1,
              2 * slot - 1,
              2 * slot,
              round,
              slot,
              slotY,
              byRoundSlot,
              cardH,
            );
      slotY.set(`${round}:${slot}`, y);
      const m = byRoundSlot.get(`${round}:${slot}`);
      if (m) positions.set(m.id, { col, y });
    }
    col++;
  }

  const finalY = centerBetweenSlots(
    maxRound - 1,
    1,
    2,
    maxRound,
    1,
    slotY,
    byRoundSlot,
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

/** TS 28/14 встреч — как 27/13, матч за 3–4 под финалом. */
function buildTsPositionsBronzeForHalf2(
  matches: BracketMatchView[],
  cardH: number,
  half2: number,
): Map<string, SwissMatchPosition> {
  const positions = buildTsPositionsScaled(matches, cardH, half2);
  const maxRound = tsMaxRound(half2);
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }
  const fin = byRoundSlot.get(`${maxRound}:1`);
  const bronze = byRoundSlot.get(`${maxRound}:2`);
  if (!fin || !bronze) return positions;
  const finPos = positions.get(fin.id);
  if (!finPos) return positions;
  positions.set(bronze.id, {
    col: finPos.col,
    y:
      finPos.y +
      layoutMatchCardHeight(fin.id, cardH) +
      FIXED_SWISS_BRONZE_BELOW_GAP,
  });
  return positions;
}

/** @deprecated — используйте buildTsPositionsBronzeForHalf2(..., 8). */
function buildTsPositions28Bronze(
  matches: BracketMatchView[],
  cardH: number,
): Map<string, SwissMatchPosition> {
  return buildTsPositionsBronzeForHalf2(matches, cardH, 8);
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
    const y = fixedSwissRound1SlotY(slot, unit);
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

/** TS 32→16 (55 встреч): без нижней тур 4 — вылет с 1/8 на места 9–12. */
function buildTsPositions32R8ElimAtEighth(
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
    const y = fixedSwissRound1SlotY(slot, unit);
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

/** TS 32→16 R8 elim (56): матч за 3–4 (#60) под финалом. */
function buildTsPositions32R8ElimAtEighthBronze(
  matches: BracketMatchView[],
  cardH: number,
): Map<string, SwissMatchPosition> {
  const positions = buildTsPositions32R8ElimAtEighth(matches, cardH);
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
    y:
      finPos.y +
      layoutMatchCardHeight(fin.id, cardH) +
      FIXED_SWISS_BRONZE_BELOW_GAP,
  });
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
    y:
      finPos.y +
      layoutMatchCardHeight(fin.id, cardH) +
      FIXED_SWISS_BRONZE_BELOW_GAP,
  });
  return positions;
}

/** TS 64→32 (111 встреч) — масштаб buildTsPositions32. */
function buildTsPositions64(
  matches: BracketMatchView[],
  cardH: number,
): Map<string, SwissMatchPosition> {
  const half1 = 16;
  const half2 = 32;
  const positions = new Map<string, SwissMatchPosition>();
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }

  const slotY = new Map<string, number>();
  const unit = FIXED_SWISS_BRACKET_UNIT;

  for (let slot = 1; slot <= 32; slot++) {
    const y = fixedSwissRound1SlotY(slot, unit);
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

  // Нижняя тур 2 (#80↓#65): слот в слот с нижней тур 1 (#33–#48).
  for (let slot = 1; slot <= half1; slot++) {
    const y = yAt(2, slot, slotY);
    slotY.set(`3:${slot}`, y);
    const m = byRoundSlot.get(`3:${slot}`);
    if (m) {
      positions.set(m.id, { col: -2, y });
    }
  }
  resolveFixedColCollisionsInOrder(
    positions,
    slotY,
    Array.from({ length: half1 }, (_, i) => byRoundSlot.get(`3:${i + 1}`)!.id),
    cardH,
    COL_COLLISION_GAP,
  );

  const upperTour2Ids: string[] = [];
  for (let k = 1; k <= half1 / 2; k++) {
    const slotA = half1 + 2 * k - 1;
    const slotB = half1 + 2 * k;
    const upperTour2Slot = k <= half1 / 4 ? half2 + k : 16 + k;
    const upperY = centerBetweenParents(
      yAt(2, slotA, slotY),
      yAt(2, slotB, slotY),
      cardH,
    );
    slotY.set(`3:${upperTour2Slot}`, upperY);
    const upper = byRoundSlot.get(`3:${upperTour2Slot}`);
    if (upper) {
      positions.set(upper.id, { col: 2, y: upperY });
      upperTour2Ids.push(upper.id);
    }
  }

  const eighthIds: string[] = [];
  for (let k = 5; k <= 8; k++) {
    const slotA = half1 + 2 * k - 1;
    const slotB = half1 + 2 * k;
    const eighthSlot = half1 + (9 - k);
    const eighthY = centerBetweenParents(
      yAt(2, slotA, slotY),
      yAt(2, slotB, slotY),
      cardH,
    );
    slotY.set(`3:${eighthSlot}`, eighthY);
    const eighth = byRoundSlot.get(`3:${eighthSlot}`);
    if (eighth) {
      positions.set(eighth.id, { col: 4, y: eighthY });
      eighthIds.push(eighth.id);
    }
  }

  resolveFixedColCollisionsInOrder(
    positions,
    slotY,
    [
      ...Array.from({ length: half1 / 4 }, (_, i) =>
        byRoundSlot.get(`3:${half2 + i + 1}`)?.id,
      ),
      ...Array.from({ length: half1 / 4 }, (_, i) =>
        byRoundSlot.get(`3:${half1 + 5 + i}`)?.id,
      ),
    ].filter((id): id is string => id != null),
    cardH,
    COL_COLLISION_GAP,
  );
  resolveFixedColCollisions(positions, slotY, eighthIds, cardH, COL_COLLISION_GAP);

  const lowerTour3Ids: string[] = [];
  for (let slot = 1; slot <= half1 / 2; slot++) {
    let y: number;
    if (slot <= half1 / 4) {
      const crossA = 2 * slot - 1;
      y = centerBetweenParents(
        yAt(3, crossA, slotY),
        yAt(3, crossA + 1, slotY),
        cardH,
      );
    } else if (slot <= half1 / 4 + half1 / 8) {
      const bridgeA = 8 + 2 * (slot - half1 / 4) - 1;
      y = centerBetweenParents(
        yAt(3, bridgeA, slotY),
        yAt(3, bridgeA + 1, slotY),
        cardH,
      );
    } else if (slot === half1 / 4 + half1 / 8 + 1) {
      // R4 slot 7 (#90): между #68 и #67 (R3 слоты 13–14); #98 — та же Y.
      y = centerBetweenParents(
        yAt(3, 13, slotY),
        yAt(3, 14, slotY),
        cardH,
      );
    } else if (slot === half1 / 4 + half1 / 8 + 2) {
      // R4 slot 8 (#89): между #66 и #65 (R3 слоты 15–16); #97 — та же Y.
      y = centerBetweenParents(
        yAt(3, 15, slotY),
        yAt(3, 16, slotY),
        cardH,
      );
    } else {
      throw new Error(`Unexpected lower tour 3 slot ${slot}`);
    }
    slotY.set(`4:${slot}`, y);
    const lowerR3 = byRoundSlot.get(`4:${slot}`);
    if (lowerR3) {
      positions.set(lowerR3.id, { col: -3, y });
      lowerTour3Ids.push(lowerR3.id);
    }
  }
  resolveFixedColCollisionsInOrder(
    positions,
    slotY,
    Array.from({ length: half1 / 2 }, (_, i) =>
      byRoundSlot.get(`4:${i + 1}`)!.id,
    ),
    cardH,
    COL_COLLISION_GAP,
  );

  // Нижняя тур 4 (#104↓#97): R3 слоты 25–32, сверху вниз по убыванию #.
  const lowerTour4Ids: string[] = [];
  const lowerTour4Count = half1 / 2;
  for (let k = 1; k <= lowerTour4Count; k++) {
    const tour4Slot = half1 + half1 / 2 + k;
    let olympicY: number;
    if (k <= half1 / 4) {
      olympicY = centerBetweenParents(
        yAt(3, 2 * k - 1, slotY),
        yAt(3, 2 * k, slotY),
        cardH,
      );
    } else {
      const r4Slot = half1 / 4 + (k - half1 / 4);
      const r4Match = byRoundSlot.get(`4:${r4Slot}`);
      olympicY =
        r4Match && positions.has(r4Match.id)
          ? positions.get(r4Match.id)!.y
          : yAt(4, r4Slot, slotY);
    }
    slotY.set(`3:${tour4Slot}`, olympicY);
    const olympic = byRoundSlot.get(`3:${tour4Slot}`);
    if (olympic) {
      positions.set(olympic.id, { col: -4, y: olympicY });
      lowerTour4Ids.push(olympic.id);
    }
  }
  resolveFixedColCollisionsInOrder(
    positions,
    slotY,
    Array.from({ length: lowerTour4Count }, (_, i) => {
      const slot = half1 + half1 / 2 + i + 1;
      return byRoundSlot.get(`3:${slot}`)!.id;
    }),
    cardH,
    COL_COLLISION_GAP,
  );

  // Верхняя тур 3 (#105–#112): на одной Y с #81–#88 (R3 33–36 и 21–24; 17–20 — 1/8).
  const upperTour3Count = half1 / 2;
  for (let slot = 1; slot <= upperTour3Count; slot++) {
    const upperTour2Slot = slot <= half1 / 4 ? half2 + slot : 16 + slot;
    const y = yAt(3, upperTour2Slot, slotY);
    slotY.set(`5:${slot}`, y);
    const quarter = byRoundSlot.get(`5:${slot}`);
    if (quarter) {
      positions.set(quarter.id, { col: 3, y });
    }
  }
  resolveFixedColCollisionsInOrder(
    positions,
    slotY,
    Array.from({ length: upperTour3Count }, (_, i) =>
      byRoundSlot.get(`5:${i + 1}`)!.id,
    ),
    cardH,
    COL_COLLISION_GAP,
  );

  const match113 = byRoundSlot.get("3:17");
  if (match113) {
    const y113 = centerBetweenParents(
      yAt(5, 1, slotY),
      yAt(5, 2, slotY),
      cardH,
    );
    slotY.set("3:17", y113);
    positions.set(match113.id, { col: 4, y: y113 });
  }

  const match114 = byRoundSlot.get("3:18");
  if (match114) {
    const y114 = centerBetweenParents(
      yAt(5, 3, slotY),
      yAt(5, 4, slotY),
      cardH,
    );
    slotY.set("3:18", y114);
    positions.set(match114.id, { col: 4, y: y114 });
  }

  const match115 = byRoundSlot.get("3:19");
  if (match115) {
    const y115 = centerBetweenParents(
      yAt(5, 5, slotY),
      yAt(5, 6, slotY),
      cardH,
    );
    slotY.set("3:19", y115);
    positions.set(match115.id, { col: 4, y: y115 });
  }

  const match116 = byRoundSlot.get("3:20");
  if (match116) {
    const y116 = centerBetweenParents(
      yAt(5, 7, slotY),
      yAt(5, 8, slotY),
      cardH,
    );
    slotY.set("3:20", y116);
    positions.set(match116.id, { col: 4, y: y116 });
  }

  const semi1Y = centerBetweenParents(
    yAt(3, 17, slotY),
    yAt(3, 18, slotY),
    cardH,
  );
  slotY.set(`6:1`, semi1Y);
  const semi1 = byRoundSlot.get("6:1");
  if (semi1) positions.set(semi1.id, { col: 5, y: semi1Y });

  const semi2Y = centerBetweenParents(
    yAt(3, 19, slotY),
    yAt(3, 20, slotY),
    cardH,
  );
  slotY.set(`6:2`, semi2Y);
  const semi2 = byRoundSlot.get("6:2");
  if (semi2) positions.set(semi2.id, { col: 5, y: semi2Y });

  const finalY = centerBetweenParents(yAt(6, 1, slotY), yAt(6, 2, slotY), cardH);
  const fin = byRoundSlot.get("7:1");
  if (fin) positions.set(fin.id, { col: 6, y: finalY });

  return positions;
}

/** TS 120 встреч — матч за 3–4 (#120) под финалом (#119). */
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
    y:
      finPos.y +
      layoutMatchCardHeight(fin.id, cardH) +
      FIXED_SWISS_BRONZE_BELOW_GAP,
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
    const y = fixedSwissRound1SlotY(slot, unit);
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
  display?: FixedSwissDisplayOpts,
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
    isFixedSwissTs84BronzeMatchCount(matchCount) ||
    isFixedSwissTs84MatchCount(matchCount, maxRoundEarly) ||
    isFixedSwissTs32MatchCount(matchCount) ||
    isFixedSwissTs32BronzeMatchCount(matchCount) ||
    isFixedSwissTs32R8ElimAtEighthFamily(matchCount, maxRoundEarly) ||
    isFixedSwissTs64R8ElimAtEighthFamily(matchCount, maxRoundEarly) ||
    isFixedSwissTs64R8ElimAtEighthFromMatches(matches) ||
    isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRoundEarly) ||
    isFixedSwissTs128R8ElimAtEighthFromMatches(matches) ||
    isFixedSwissTs128MatchCount(matchCount) ||
    isFixedSwissTs128BronzeMatchCount(matchCount) ||
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
  const cardHeights = new Map<string, number>();
  for (const m of matches) {
    cardHeights.set(
      m.id,
      estimateFixedSwissCardHeight(m, edges, {
        matchCount,
        matchNumber: matchNumbers.get(m.id),
        maxRound: maxRoundEarly,
        showCardMatchNumber: display?.showCardMatchNumber,
        showCardHandicap: display?.showCardHandicap,
        showCardPlacement: display?.showCardPlacement,
        handicapHalfStep: display?.handicapHalfStep,
      }),
    );
  }
  const cardH =
    cardHeights.size > 0
      ? Math.min(...cardHeights.values())
      : FIXED_SWISS_CARD_H;
  layoutCardHeights = cardHeights;
  layoutRound1SlotY = buildFixedSwissRound1SlotY(matches, cardHeights, gridSize);

  if (rounds.length === 0) {
    layoutCardHeights = undefined;
    layoutRound1SlotY = undefined;
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
      cardHeights,
    };
  }

  const maxRound = Math.max(...rounds.map((r) => r.round));
  const positions = useTs
    ? buildTsPositions(matches, cardH, matchCount, maxRoundEarly)
    : useLegacy168
      ? build168Positions(matches, cardH)
      : buildClassicPositions(matches, matchesPerRound, maxRound, cardH);

  resolveAllColumnOverlaps(positions, cardHeights, cardH, FIXED_SWISS_ROUND1_GAP);

  let minCol = 0;
  let maxCol = 0;
  let maxY = 0;
  for (const [id, pos] of positions) {
    minCol = Math.min(minCol, pos.col);
    maxCol = Math.max(maxCol, pos.col);
    maxY = Math.max(maxY, pos.y + (cardHeights.get(id) ?? cardH));
  }

  layoutCardHeights = undefined;
  layoutRound1SlotY = undefined;

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
    cardHeights,
    cardDisplay: display,
  };
}

export function gridFixedColumnLabel(col: number): string {
  if (col === 0) return "Старт";
  if (col < 0) return `← ${Math.abs(col)}`;
  return `${col} →`;
}

/** Y выхода линии с карточки (эталон: разделитель строк игроков). */
export function fixedSwissEdgeFromY(
  cardTop: number,
  display?: FixedSwissDisplayOpts,
): number {
  return fixedSwissTeamDividerY(cardTop, display);
}

/**
 * Y входа линии в карточку — эталон: разделитель строк (одна линия на вилке).
 */
export function fixedSwissEdgeToY(
  _fromCardTop: number,
  toCardTop: number,
  _toTeamSlot: 1 | 2,
  kind: SwissEdgeKind,
  display?: FixedSwissDisplayOpts,
): number {
  if (kind === "loss") return fixedSwissTeamDividerY(toCardTop, display);
  return fixedSwissTeamDividerY(toCardTop, display);
}

export function gridFixedEdgePoints(
  fromPos: SwissMatchPosition,
  toPos: SwissMatchPosition,
  _fromTeamSlot: 1 | 2,
  toTeamSlot: 1 | 2,
  kind: SwissEdgeKind,
  minCol: number,
  display?: FixedSwissDisplayOpts,
) {
  const fromTop = fromPos.y + GRID_PAD + GRID_LABEL_OFFSET;
  const toTop = toPos.y + GRID_PAD + GRID_LABEL_OFFSET;
  const y = fixedSwissEdgeFromY(fromTop, display);
  const entryY = fixedSwissEdgeToY(fromTop, toTop, toTeamSlot, kind, display);
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

/** Смещение lane внутри gutter — только для переходов через 2+ колонки. */
function gutterLaneOffset(
  fromY: number,
  toY: number,
  laneKey = 0,
  fromCol?: number,
  toCol?: number,
): number {
  if (
    fromCol != null &&
    toCol != null &&
    Math.abs(fromCol - toCol) === 1
  ) {
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
  let firstGutter =
    fixedSwissColumnGutter(fromCol, fromCol + sign, minCol, colWidth) + lane;
  if (Math.abs(delta) === 1) {
    firstGutter =
      sign > 0 ? Math.max(firstGutter, from.x) : Math.min(firstGutter, from.x);
  }

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
  laneKey = 0,
): string {
  const sign = toCol > fromCol ? 1 : -1;
  const delta = Math.abs(toCol - fromCol);

  if (delta <= 1) {
    const sign = toCol > fromCol ? 1 : -1;
    const lane = gutterLaneOffset(from.y, to.y, laneKey, fromCol, toCol);
    let gutter =
      fixedSwissColumnGutter(fromCol, toCol, minCol, colWidth) + lane;
    gutter =
      sign > 0 ? Math.max(gutter, from.x) : Math.min(gutter, from.x);
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

/** Y ствола: середина Y входящих вилок из `fromRound` в одну встречу `toRound`. */
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
  matchById: Map<string, { round: number; slot?: number }>,
  matchCount?: number,
): Map<string, number> {
  const byTarget = new Map<string, number[]>();
  for (const edge of edges) {
    const from = matchById.get(edge.fromId);
    const to = matchById.get(edge.toId);
    if (!from || !to || from.round !== fromRound || to.round !== toRound) continue;
    if (edge.fromTeamSlot == null || edge.toTeamSlot == null) continue;
    if (matchCount != null) {
      const fromSlot = from.slot;
      const toSlot = to.slot;
      if (
        fromSlot == null ||
        toSlot == null ||
        !isFixedSwissForkEdge(
          fromRound,
          toRound,
          matchCount,
          fromSlot,
          toSlot,
        )
      ) {
        continue;
      }
    }
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

function isFixedSwissTs32CurrentGrid(
  matchCount?: number,
  maxRound?: number,
): boolean {
  return (
    matchCount !== undefined &&
    (isFixedSwissTs32MatchCount(matchCount) ||
      isFixedSwissTs32BronzeMatchCount(matchCount) ||
      isFixedSwissTs32R8ElimAtEighthFamily(matchCount, maxRound))
  );
}

function isFixedSwissTs128CurrentGrid(
  matchCount?: number,
  maxRound?: number,
): boolean {
  return (
    matchCount !== undefined &&
    (isFixedSwissTs128MatchCount(matchCount) ||
      isFixedSwissTs128BronzeMatchCount(matchCount) ||
      isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound))
  );
}

function isFixedSwissTs64CurrentGrid(
  matchCount?: number,
  maxRound?: number,
): boolean {
  return (
    matchCount !== undefined &&
    (isFixedSwissTs64MatchCount(matchCount) ||
      isFixedSwissTs64BronzeMatchCount(matchCount) ||
      isFixedSwissTs64R8ElimAtEighthFamily(matchCount, maxRound))
  );
}

function isFixedSwissTsLargeCurrentGrid(
  matchCount?: number,
  maxRound?: number,
): boolean {
  return (
    isFixedSwissTs32CurrentGrid(matchCount, maxRound) ||
    isFixedSwissTs64CurrentGrid(matchCount) ||
    isFixedSwissTs128CurrentGrid(matchCount, maxRound)
  );
}

function half1ForLargeGrid(matchCount?: number, maxRound?: number): number {
  if (matchCount === 13 || matchCount === 14) return 2;
  if (isFixedSwissTs128CurrentGrid(matchCount, maxRound)) return 32;
  if (isFixedSwissTs64CurrentGrid(matchCount)) return 16;
  if (isFixedSwissTs32CurrentGrid(matchCount, maxRound)) return 8;
  return 4;
}

function isFixedSwissTs32AnyGrid(
  matchCount?: number,
  maxRound?: number,
): boolean {
  return (
    isFixedSwissTs32CurrentGrid(matchCount, maxRound) ||
    (matchCount !== undefined &&
      isOutdatedFixedSwiss32Bracket(matchCount, maxRound))
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
  maxRound?: number,
): boolean {
  if (fromRound === 3 && toRound === 4) {
    const half1 = half1ForLargeGrid(matchCount, maxRound);
    return fromSlot == null || fromSlot <= half1;
  }
  if (isFixedSwissTs64CurrentGrid(matchCount)) {
    return false;
  }
  if (isFixedSwissTs32CurrentGrid(matchCount, maxRound)) {
    return false;
  }
  return fromRound === 3 && toRound === 5;
}

export function isFixedSwissSemiFinalForkEdge(
  fromRound: number,
  toRound: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (isFixedSwissTsLargeCurrentGrid(matchCount, maxRound)) {
    if (isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound)) {
      return (
        (fromRound === 5 && toRound === 3) ||
        (fromRound === 3 && toRound === 6) ||
        (fromRound === 4 && toRound === 5) ||
        (fromRound === 6 && toRound === 7)
      );
    }
    if (isFixedSwissTs64CurrentGrid(matchCount)) {
      return (
        (fromRound === 5 && toRound === 3) ||
        (fromRound === 3 && toRound === 6) ||
        (fromRound === 6 && toRound === 7)
      );
    }
    return (
      (fromRound === 5 && toRound === 6) ||
      (fromRound === 6 && toRound === 7)
    );
  }
  if (isFixedSwissTs32AnyGrid(matchCount, maxRound)) {
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
  maxRound?: number,
): boolean {
  return (
    isFixedSwissRound12Edge(fromRound, toRound) ||
    isFixedSwissR23Upper18ForkEdge(
      fromRound,
      toRound,
      fromSlot,
      toSlot,
      matchCount,
      maxRound,
    ) ||
    isFixedSwissQuarterSemiForkEdge(
      fromRound,
      toRound,
      matchCount,
      fromSlot,
      maxRound,
    ) ||
    isFixedSwissSemiFinalForkEdge(fromRound, toRound, matchCount, maxRound)
  );
}

/** 64→32: мост R3→нижняя тур 3 (#68+#67→#90, #72+#71→#92 …). */
export function isFixedSwissTs64BridgeToLowerTour3WinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
): boolean {
  if (!isFixedSwissTs64CurrentGrid(matchCount)) return false;
  if (fromRound !== 3 || toRound !== 4) return false;
  const half1 = half1ForLargeGrid(matchCount);
  if (fromSlot >= 9 && fromSlot <= 12) {
    const pair = Math.ceil((fromSlot - 8) / 2);
    return toSlot === half1 / 4 + pair;
  }
  if (fromSlot === 13 || fromSlot === 14) {
    return toSlot === half1 / 4 + 3;
  }
  if (fromSlot === 15 || fromSlot === 16) {
    return toSlot === half1 / 4 + 4;
  }
  return false;
}

/** 64→32: нижняя тур 1 #41–#44 → мост #72–#69 (R3 слоты 21–24). */
export function isFixedSwissTs64LowerTour1BridgeWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
): boolean {
  if (!isFixedSwissTs64CurrentGrid(matchCount)) return false;
  if (fromRound !== 2 || toRound !== 3) return false;
  if (fromSlot >= 9 && fromSlot <= 12) return toSlot === 12 + fromSlot;
  return false;
}

/** 64→32: нижняя тур 1 #45–#46 → верхняя тур 2 #85–#86 (мост). */
export function isFixedSwissTs64LowerTour1ToUpperTour2BridgeEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
): boolean {
  if (!isFixedSwissTs64CurrentGrid(matchCount)) return false;
  if (fromRound !== 2 || toRound !== 3) return false;
  if (fromSlot !== 13 && fromSlot !== 14) return false;
  return toSlot === fromSlot + 8;
}

/** Горизонталь на Y источника, затем вертикаль у цели (без «шины» на Y цели). */
export function isFixedSwissCrossAtSourceYEdge(
  fromRound: number,
  toRound: number,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
): boolean {
  if (isFixedSwissCrossToQuarterEdge(fromRound, toRound)) return true;
  if (fromSlot == null || toSlot == null) return false;
  return isFixedSwissTs64LowerTour1ToUpperTour2BridgeEdge(
    fromRound,
    fromSlot,
    toRound,
    toSlot,
    matchCount,
  );
}

/** #105–#112→#113–#116 (парами): 1/4 → переигровка за 3-е (R5→R3) на 64→32 и 128→64. */
export function isFixedSwissTsLargeUpperTour3ToThirdPlaceWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (fromRound !== 5 || toRound !== 3) return false;
  if (!isFixedSwissTsLargeCurrentGrid(matchCount, maxRound)) return false;
  const half1 = half1ForLargeGrid(matchCount, maxRound);
  return toSlot === half1 + Math.ceil(fromSlot / 2);
}

/** @deprecated — см. isFixedSwissTsLargeUpperTour3ToThirdPlaceWinEdge */
export function isFixedSwissTs64UpperTour3ToEighthWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  return isFixedSwissTsLargeUpperTour3ToThirdPlaceWinEdge(
    fromRound,
    fromSlot,
    toRound,
    toSlot,
    matchCount,
    maxRound,
  );
}

/** #21/#22→#25; на 32→16 — 1/8→1/4 (R3→R4 устаревшая, R3→R5 актуальная). */
export function isFixedSwissQuarterSemiWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  const half1 = half1ForLargeGrid(matchCount, maxRound);
  const olympicToRound = isFixedSwissTsLargeCurrentGrid(matchCount, maxRound) ? 5 : 4;
  if (isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound)) {
    if (fromRound !== 3 || toRound !== 5) return false;
    const target = fixedSwissTsOlympicToQuarterTarget(32, fromSlot);
    return target?.toRound === 5 && target.toSlot === toSlot;
  }
  if (isFixedSwissTs64CurrentGrid(matchCount)) {
    if (fromRound !== 3 || toRound !== 5) return false;
    const target = fixedSwissTs64OlympicToQuarterTarget(fromSlot);
    return target?.toRound === 5 && target.toSlot === toSlot;
  }
  if (fromRound !== 3 || toRound !== olympicToRound) return false;
  if (fromSlot < half1 + 1 || fromSlot > half1 * 2) return false;
  if (isFixedSwissTs32CurrentGrid(matchCount, maxRound)) {
    const target = fixedSwissTs32OlympicToQuarterTarget(fromSlot);
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
  maxRound?: number,
): boolean {
  if (!isFixedSwissTsLargeCurrentGrid(matchCount, maxRound)) return false;
  if (fromRound !== 3 || toRound !== 4) return false;
  const half1 = half1ForLargeGrid(matchCount, maxRound);
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
  maxRound?: number,
): boolean {
  if (!isFixedSwissTsLargeCurrentGrid(matchCount, maxRound)) return false;
  if (isFixedSwissTs64R8ElimAtEighthFamily(matchCount, maxRound)) return false;
  if (isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound)) return false;
  if (fromRound !== 4 || toRound !== 3) return false;
  const half1 = half1ForLargeGrid(matchCount, maxRound);
  const lowerTour4Start = half1 + half1 / 2 + 1;
  if (isFixedSwissTs32CurrentGrid(matchCount, maxRound)) {
    for (let slot = 1; slot <= half1 / 2; slot++) {
      if (fromSlot === slot && toSlot === lowerTour4Start + slot - 1) return true;
    }
    return false;
  }
  for (let slot = 1; slot <= half1 / 4; slot++) {
    if (fromSlot === slot && toSlot === lowerTour4Start + slot - 1) return true;
  }
  if (isFixedSwissTs64CurrentGrid(matchCount)) {
    if (fromSlot >= half1 / 4 + 1 && fromSlot <= half1 / 2) {
      return toSlot === lowerTour4Start + fromSlot - 1;
    }
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
    return false;
  }
  if (fromSlot === half1 / 2 + 1 && toSlot === 1) return true;
  if (fromSlot === half1 / 2 + 2 && toSlot === 1) return true;
  if (fromSlot === half1 / 2 + 3 && toSlot === 2) return true;
  if (fromSlot === half1 / 2 + 4 && toSlot === 2) return true;
  return false;
}

/** 64→32 / 128→64 R8: R3 за 3-е (#113–#116 / #225–#232) → полуфинал. */
export function isFixedSwissTsLargeThirdToSemiWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (fromRound !== 3 || toRound !== 6) return false;
  if (isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound)) {
    const half1 = 32;
    const thirdStart = half1 + 1;
    const thirdEnd = half1 + half1 / 4;
    if (fromSlot < thirdStart || fromSlot > thirdEnd) return false;
    const groupSlot = fromSlot - half1;
    return toSlot === Math.ceil(groupSlot / (half1 / 8));
  }
  return isFixedSwissTs64EighthToQuarterWinEdge(
    fromRound,
    fromSlot,
    toRound,
    toSlot,
    matchCount,
  );
}

/** @deprecated — см. isFixedSwissTsLargeThirdToSemiWinEdge */
export function isFixedSwissTs64EighthToQuarterWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
): boolean {
  if (!isFixedSwissTs64CurrentGrid(matchCount)) return false;
  if (fromRound !== 3 || toRound !== 6) return false;
  if (fromSlot === 17 && toSlot === 1) return true;
  if (fromSlot === 18 && toSlot === 1) return true;
  if (fromSlot === 19 && toSlot === 2) return true;
  if (fromSlot === 20 && toSlot === 2) return true;
  return false;
}

/** 128→64 R8: R2 #121–#128 → 1/4 #221–#224 (минуя 1/8). */
export function isFixedSwissTs128R2DirectQuarterWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (!isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound)) return false;
  if (fromRound !== 2 || toRound !== 5) return false;
  const half1 = 32;
  for (let k = 13; k <= half1 / 2; k++) {
    const expectedToSlot = half1 / 2 - half1 / 8 + 1 + (k - 13);
    const slotA = half1 + 2 * k - 1;
    const slotB = half1 + 2 * k;
    if (toSlot === expectedToSlot && (fromSlot === slotA || fromSlot === slotB)) {
      return true;
    }
  }
  return false;
}

export function isFixedSwissSemiFinalWinEdge(
  fromRound: number,
  fromSlot: number,
  toRound: number,
  toSlot: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (isFixedSwissTsLargeCurrentGrid(matchCount, maxRound)) {
    if (isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound)) {
      if (fromRound === 4 && toRound === 5) {
        const half1 = 32;
        const r3Slot = half1 + half1 / 2 + fromSlot;
        const target = fixedSwissTsOlympicToQuarterTarget(half1, r3Slot);
        return target?.toRound === 5 && target.toSlot === toSlot;
      }
      if (
        isFixedSwissTsLargeThirdToSemiWinEdge(
          fromRound,
          fromSlot,
          toRound,
          toSlot,
          matchCount,
          maxRound,
        )
      ) {
        return true;
      }
      if (fromRound === 6 && toRound === 7) {
        return toSlot === 1 && (fromSlot === 1 || fromSlot === 2);
      }
      return false;
    }
    if (isFixedSwissTs64CurrentGrid(matchCount, maxRound)) {
      if (isFixedSwissTs64R8ElimAtEighthFamily(matchCount, maxRound)) {
        if (fromRound === 4 && toRound === 5) {
          const half1 = 16;
          const r3Slot = half1 + half1 / 2 + fromSlot;
          const target = fixedSwissTs64OlympicToQuarterTarget(r3Slot);
          return target?.toRound === 5 && target.toSlot === toSlot;
        }
        if (
          isFixedSwissTsLargeThirdToSemiWinEdge(
            fromRound,
            fromSlot,
            toRound,
            toSlot,
            matchCount,
            maxRound,
          )
        ) {
          return true;
        }
        if (fromRound === 6 && toRound === 7) {
          return toSlot === 1 && (fromSlot === 1 || fromSlot === 2);
        }
        return false;
      }
      if (
        isFixedSwissTsLargeThirdToSemiWinEdge(
          fromRound,
          fromSlot,
          toRound,
          toSlot,
          matchCount,
        )
      ) {
        return true;
      }
      if (fromRound === 6 && toRound === 7) {
        return toSlot === 1 && (fromSlot === 1 || fromSlot === 2);
      }
      return false;
    }
    if (fromRound === 5 && toRound === 6) {
      return toSlot === Math.ceil(fromSlot / 2);
    }
    if (fromRound === 6 && toRound === 7) {
      return toSlot === 1 && (fromSlot === 1 || fromSlot === 2);
    }
    return false;
  }
  if (isFixedSwissTs32AnyGrid(matchCount, maxRound)) {
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
  maxRound?: number,
): boolean {
  if (
    fromSlot == null ||
    toSlot == null ||
    !isFixedSwissTsLargeCurrentGrid(matchCount, maxRound)
  ) {
    return false;
  }
  if (fromRound !== 2 || toRound !== 3) return false;
  const half1 = half1ForLargeGrid(matchCount, maxRound);
  if (fromSlot <= half1) return false;
  if (isFixedSwissTs128CurrentGrid(matchCount, maxRound)) {
    const pairCount = (3 * half1) / 8;
    for (let k = 1; k <= pairCount; k++) {
      const olympicSlot = fixedSwissTsUpperTour2Slot(64, k);
      if (olympicSlot == null) continue;
      if (toSlot !== olympicSlot) continue;
      const slotA = half1 + 2 * k - 1;
      const slotB = half1 + 2 * k;
      if (fromSlot === slotA || fromSlot === slotB) return true;
    }
    return false;
  }
  for (let k = 1; k <= half1 / 2; k++) {
    const olympicSlot = isFixedSwissTs64CurrentGrid(matchCount)
      ? k <= half1 / 4
        ? half1 * 2 + k
        : half1 + k
      : half1 + k;
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
  maxRound?: number,
): boolean {
  if (fromRound !== 2 || toRound !== 3) return false;
  if (isFixedSwissTsLargeCurrentGrid(matchCount, maxRound)) {
    const half1 = half1ForLargeGrid(matchCount, maxRound);
    if (isFixedSwissTs64CurrentGrid(matchCount)) {
      return (
        (fromSlot === toSlot && fromSlot >= 1 && fromSlot <= half1 / 2) ||
        (fromSlot >= half1 / 2 + 1 &&
          fromSlot <= half1 &&
          toSlot === fromSlot)
      );
    }
    return fromSlot === toSlot && fromSlot >= 1 && fromSlot <= half1;
  }
  if (matchCount !== undefined && isOutdatedFixedSwiss32Bracket(matchCount, maxRound)) {
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

function isFixedSwissCrossToLowerSvgCols(
  fromCol: number,
  toCol: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (isFixedSwissTs128CurrentGrid(matchCount, maxRound)) {
    return (
      (fromCol === -2 && toCol === -4) ||
      (fromCol === -3 && toCol === -5)
    );
  }
  return fromCol === -2 && toCol === -3;
}

function isFixedSwissLowerTour3To4SvgCols(
  fromCol: number,
  toCol: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (isFixedSwissTs128CurrentGrid(matchCount, maxRound)) {
    return (
      (fromCol === -4 && toCol === -5) ||
      (fromCol === -5 && toCol === -6)
    );
  }
  return fromCol === -3 && toCol === -4;
}

function isFixedSwissLowerTour3DirectQuarterSvgCols(
  fromCol: number,
  toCol: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (isFixedSwissTs128CurrentGrid(matchCount, maxRound)) {
    return (fromCol === -4 || fromCol === -5) && toCol === 3;
  }
  return fromCol === -3 && toCol === 3;
}

/** SVG: вилки R1→R2 (0→±1) + явные короткие победы R2→R3 (см. isFixedSwissShortAdjacentWinEdge).
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
  maxRound?: number,
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
      maxRound,
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
      maxRound,
    ) &&
    (isFixedSwissAdjacentWinEdge(fromCol, toCol) ||
      (isFixedSwissTs128CurrentGrid(matchCount, maxRound) &&
        fromCol === -1 &&
        (toCol === -2 || toCol === -3)))
  ) {
    return true;
  }
  if (
    fromSlot != null &&
    toSlot != null &&
    (isFixedSwissCrossToLowerWinEdge(
      fromRound,
      fromSlot,
      toRound,
      toSlot,
      matchCount,
      maxRound,
    ) ||
      isFixedSwissTs64BridgeToLowerTour3WinEdge(
        fromRound,
        fromSlot,
        toRound,
        toSlot,
        matchCount,
      )) &&
    isFixedSwissCrossToLowerSvgCols(
      fromCol,
      toCol,
      matchCount,
      maxRound,
    )
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
      maxRound,
    ) &&
    isFixedSwissLowerTour3To4SvgCols(
      fromCol,
      toCol,
      matchCount,
      maxRound,
    )
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
      maxRound,
    ) &&
    fromCol === 2 &&
    toCol === 3 &&
    (!isFixedSwissTsLargeCurrentGrid(matchCount, maxRound) ||
      (isFixedSwissTs32CurrentGrid(matchCount, maxRound) &&
        fromSlot >= 9 &&
        fromSlot <= 12) ||
      (isFixedSwissTs64CurrentGrid(matchCount) &&
        ((fromSlot >= 21 && fromSlot <= 24) ||
          (fromSlot >= 33 && fromSlot <= 36))) ||
      (isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound) &&
        ((fromSlot >= 41 && fromSlot <= 48) ||
          (fromSlot >= 65 && fromSlot <= 68))))
  ) {
    return true;
  }
  if (
    fromSlot != null &&
    toSlot != null &&
    isFixedSwissTs128R2DirectQuarterWinEdge(
      fromRound,
      fromSlot,
      toRound,
      toSlot,
      matchCount,
      maxRound,
    ) &&
    fromCol === 1 &&
    toCol === 3
  ) {
    return true;
  }
  if (
    fromSlot != null &&
    toSlot != null &&
    isFixedSwissTs64LowerTour1BridgeWinEdge(
      fromRound,
      fromSlot,
      toRound,
      toSlot,
      matchCount,
    ) &&
    fromCol === -1 &&
    toCol === -2
  ) {
    return true;
  }
  if (
    fromSlot != null &&
    toSlot != null &&
    isFixedSwissTs64UpperTour3ToEighthWinEdge(
      fromRound,
      fromSlot,
      toRound,
      toSlot,
      matchCount,
    ) &&
    fromCol === 3 &&
    toCol === 4
  ) {
    return true;
  }
  if (
    fromSlot != null &&
    toSlot != null &&
    isFixedSwissTsLargeThirdToSemiWinEdge(
      fromRound,
      fromSlot,
      toRound,
      toSlot,
      matchCount,
      maxRound,
    ) &&
    fromCol === 4 &&
    toCol === 5
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
      maxRound,
    ) &&
    ((fromCol === 3 && toCol === 4) ||
      (fromCol === 4 && toCol === 5) ||
      (fromCol === 5 && toCol === 6) ||
      isFixedSwissLowerTour3DirectQuarterSvgCols(
        fromCol,
        toCol,
        matchCount,
        maxRound,
      ))
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

/** Рисовать линию проигрыша: R1→нижняя тур 1 (вилка). R2→крест — только подпись. */
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
  return false;
}

/** R8 elim: нижняя тур 4 → 1/8 — только подпись в Excel, не автоподстановка. */
export function isFixedSwissLowerTour4FooterWinEdge(
  link: {
    fromRound: number;
    fromSlot: number;
    toRound: number;
    toSlot: number;
    kind: "win" | "loss";
  },
  matchCount: number,
  maxRound?: number,
): boolean {
  if (link.kind !== "win") return false;
  if (
    !isFixedSwissTs64R8ElimAtEighthFamily(matchCount, maxRound) &&
    !isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound) &&
    !isFixedSwissTs32R8ElimAtEighthFamily(matchCount, maxRound)
  ) {
    return false;
  }
  if (link.fromRound !== 3 || link.toRound !== 5) return false;
  const fromCol = fixedSwissMatchColForCount(
    link.fromRound,
    link.fromSlot,
    matchCount,
    maxRound,
  );
  if (isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound)) {
    return fromCol === -5 || fromCol === -6;
  }
  return fromCol === -4;
}

/** Win-link только для подписи — не автоподстановка и не «победитель на #…» в UI. */
export function isFixedSwissWinLinkFooterOnly(
  link: {
    fromRound: number;
    fromSlot: number;
    toRound: number;
    toSlot: number;
    kind: "win" | "loss";
  },
  matchCount: number,
  maxRound?: number,
): boolean {
  if (link.kind !== "win") return false;
  return (
    isFixedSwissTs64LowerTour1ToUpperTour2BridgeEdge(
      link.fromRound,
      link.fromSlot,
      link.toRound,
      link.toSlot,
      matchCount,
    ) || isFixedSwissLowerTour4FooterWinEdge(link, matchCount, maxRound)
  );
}

/** @deprecated используйте isFixedSwissWinLinkFooterOnly / обратную логику в shouldAutoAdvance */
export function isFixedSwissLowerTour3DirectQuarterWinEdge(
  link: {
    fromRound: number;
    fromSlot: number;
    toRound: number;
    toSlot: number;
    kind: "win" | "loss";
  },
  matchCount: number,
  maxRound?: number,
): boolean {
  if (link.kind === "win" && isFixedSwissWinLinkFooterOnly(link, matchCount, maxRound)) {
    return false;
  }
  if (link.kind !== "win") return false;
  if (
    !isFixedSwissTs64R8ElimAtEighthFamily(matchCount, maxRound) &&
    !isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound) &&
    !isFixedSwissTs32R8ElimAtEighthFamily(matchCount, maxRound)
  ) {
    return false;
  }
  if (link.fromRound !== 4 || link.toRound !== 5) return false;
  const fromCol = fixedSwissMatchColForCount(
    link.fromRound,
    link.fromSlot,
    matchCount,
    maxRound,
  );
  if (isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound)) {
    return fromCol === -4 || fromCol === -5;
  }
  return fromCol === -3;
}

/**
 * Автоподстановка в слот при сохранении результата.
 * Почти все links из шаблона — реальные; исключения: мост #45→#85 и подписи нижней тур 4.
 */
export function shouldAutoAdvanceFixedSwissLink(
  link: {
    fromRound: number;
    fromSlot: number;
    toRound: number;
    toSlot: number;
    kind: "win" | "loss";
  },
  matchCount: number,
  maxRound?: number,
): boolean {
  if (link.kind === "loss") return true;
  return !isFixedSwissWinLinkFooterOnly(link, matchCount, maxRound);
}

/** Подписи «место …» для актуальной TS-сетки 27 (#13–#27). */
export function fixedSwissTs27PlacementByMatchNo(no: number): string | null {
  if (no >= 13 && no <= 16) return "место 13–16";
  if (no >= 17 && no <= 20) return "место 9–12";
  if (no >= 21 && no <= 24) return "место 5–8";
  if (no === 25 || no === 26) return "3-е место";
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
  if (round === 3 && slot <= 20) return 4;
  if (round === 3 && slot <= 24) return 2;
  if (round === 3 && slot <= 32) return -4;
  if (round === 3) return 2;
  if (round === 4) return -3;
  if (round === 5) return 3;
  if (round === 6) return 5;
  return 6;
}

export function fixedSwissTs128MatchCol(round: number, slot: number): number {
  const half1 = 32;
  const half2 = 64;
  if (round === 1) return 0;
  if (round === 2 && slot <= half1) return -1;
  if (round === 2) return 1;
  if (round === 3 && slot <= half1 / 2) return -2;
  if (round === 3 && slot <= half1) return -3;
  if (round === 3 && slot <= half1 + half1 / 4) return 4;
  if (round === 3 && slot <= half1 + half1 / 2) return 2;
  if (round === 3 && slot <= half2 - half1 / 4) return -5;
  if (round === 3 && slot <= half2) return -6;
  if (round === 3 && slot <= half2 + half1 / 4) return 2;
  if (round === 4 && slot <= half1 / 4) return -4;
  if (round === 4) return -5;
  if (round === 5) return 3;
  if (round === 6) return 5;
  return 6;
}

export function fixedSwissTs128ColumnLabel(col: number): string {
  const labels: Record<number, string> = {
    [-6]: "Нижняя, тур 6",
    [-5]: "Нижняя, тур 5",
    [-4]: "Нижняя, тур 4",
    [-3]: "Нижняя, тур 3",
    [-2]: "Нижняя, тур 2",
    [-1]: "Нижняя, тур 1",
    0: "Первый тур",
    1: "Верхняя, тур 1",
    2: "Верхняя, тур 2",
    3: "Верхняя, тур 3 · 1/8",
    4: "1/4 финала",
    5: "Полуфинал",
    6: "Финал",
  };
  return labels[col] ?? gridFixedColumnLabel(col);
}

export function fixedSwissTs64ColumnLabel(col: number): string {
  const labels: Record<number, string> = {
    [-4]: "Нижняя, тур 4",
    [-3]: "Нижняя, тур 3",
    [-2]: "Нижняя, тур 2",
    [-1]: "Нижняя, тур 1",
    0: "Первый тур",
    1: "Верхняя, тур 1",
    2: "Верхняя, тур 2",
    /** #105–#112 — верхняя, тур 3 = 1/8 (одна колонка). */
    3: "Верхняя, тур 3 · 1/8",
    4: "1/4 финала",
    /** #117–#118. */
    5: "Полуфинал",
    6: "Финал",
  };
  return labels[col] ?? gridFixedColumnLabel(col);
}

export function fixedSwissTs64PlacementByMatchNo(
  no: number,
  withBronze: boolean,
): string | null {
  if (withBronze && no === 120) return "матч за 3–4 место";
  if (no === 119) return "место 1–2";
  if (no === 117 || no === 118) return withBronze ? "полуфинал" : "3-е место";
  if (no >= 33 && no <= 48) return "место 49–64";
  if (no >= 65 && no <= 80) return "место 33–48";
  if (no >= 89 && no <= 96) return "место 25–32";
  if (no >= 97 && no <= 104) return "место 17–24";
  if (no >= 105 && no <= 112) return "место 9–16";
  if (no >= 113 && no <= 116) return "место 5–8";
  return null;
}

export function fixedSwissTs128R8ElimPlacementByMatchNo(
  no: number,
  withBronze: boolean,
): string | null {
  const half1 = 32;
  const finalNo = 3 * half1 * 2 + half1 + half1 / 4 + 3;
  const bronzeNo = finalNo + 1;
  const eighthStart = 2 * half1 + half1 / 4 + 1;
  const eighthEnd = 2 * half1 + half1 / 2;
  const upperTour3Start = 3 * half1 + half1 / 2 + 1;
  const upperTour3End = 3 * half1 + half1;
  const quarterStart = 3 * half1 + half1 / 4 + 1;
  const quarterEnd = 3 * half1 + half1 / 2;
  const semi1 = finalNo - 2;
  const semi2 = finalNo - 1;

  if (withBronze && no === bronzeNo) return "матч за 3–4 место";
  if (no === finalNo) return "место 1–2";
  if (no >= eighthStart && no <= eighthEnd) {
    return `место ${half1 + 1}–${half1 + half1 / 2}`;
  }
  if (no >= 1 && no <= half1) return `место ${3 * half1 + 1}–${4 * half1}`;
  if (no >= half1 + 1 && no <= 2 * half1) {
    return `место ${2 * half1 + 1}–${3 * half1}`;
  }
  if (no >= 2 * half1 + 1 && no <= 3 * half1) {
    return `место ${half1 + half1 / 2 + 1}–${2 * half1}`;
  }
  if (no >= upperTour3Start && no <= upperTour3End) {
    return `место ${half1 / 2 + 1}–${half1}`;
  }
  if (no >= quarterStart && no <= quarterEnd) return "место 5–8";
  if (withBronze && (no === semi1 || no === semi2)) return "полуфинал";
  if (!withBronze && (no === semi1 || no === semi2)) return "3-е место";
  return null;
}

export function fixedSwissTs64R8ElimPlacementByMatchNo(
  no: number,
  withBronze: boolean,
): string | null {
  if (withBronze && no === 120) return "матч за 3–4 место";
  if (no === 119) return "место 1–2";
  if (no >= 81 && no <= 88) return "место 17–24";
  if (no >= 33 && no <= 48) return "место 49–64";
  if (no >= 65 && no <= 80) return "место 33–48";
  if (no >= 89 && no <= 96) return "место 25–32";
  if (no >= 105 && no <= 112) return "место 9–16";
  if (no >= 113 && no <= 116) return "место 5–8";
  if (withBronze && (no === 117 || no === 118)) return "полуфинал";
  if (!withBronze && (no === 117 || no === 118)) return "3-е место";
  return null;
}

export function fixedSwissTs32R8ElimPlacementByMatchNo(
  no: number,
  withBronze: boolean,
): string | null {
  if (withBronze && no === 60) return "матч за 3–4 место";
  if (no === 59) return "место 1–2";
  if (no >= 41 && no <= 44) return "место 9–12";
  if (no >= 17 && no <= 24) return "место 25–32";
  if (no >= 33 && no <= 40) return "место 17–24";
  if (no >= 45 && no <= 48) return "место 13–16";
  if (no >= 53 && no <= 56) return "место 5–8";
  if (withBronze && (no === 57 || no === 58)) return "полуфинал";
  if (!withBronze && (no === 57 || no === 58)) return "3-е место";
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
  if (!withBronze && (no === 57 || no === 58)) return "3-е место";
  if (no === 57 || no === 58) return "место 3–4";
  return null;
}

export function fixedSwissTs14PlacementByMatchNo(no: number): string | null {
  if (no >= 7 && no <= 10) return "место 5–8";
  if (no === 11 || no === 12) return "1/4 финала";
  if (no === 14) return "матч за 3–4 место";
  if (no === 13) return "место 1–2";
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
  if (matchCount === 14) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount, maxRound);
    return fixedSwissTs14PlacementByMatchNo(no);
  }

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

  if (isFixedSwissTs128R8ElimAtEighthMatchCount(matchCount ?? 0, maxRound)) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount ?? 0, maxRound);
    return fixedSwissTs128R8ElimPlacementByMatchNo(no, false);
  }

  if (isFixedSwissTs128R8ElimAtEighthBronzeMatchCount(matchCount ?? 0, maxRound)) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount ?? 0, maxRound);
    return fixedSwissTs128R8ElimPlacementByMatchNo(no, true);
  }

  if (isFixedSwissTs64R8ElimAtEighthMatchCount(matchCount ?? 0, maxRound)) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount ?? 0, maxRound);
    return fixedSwissTs64R8ElimPlacementByMatchNo(no, false);
  }

  if (isFixedSwissTs64R8ElimAtEighthBronzeMatchCount(matchCount ?? 0, maxRound)) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount ?? 0, maxRound);
    return fixedSwissTs64R8ElimPlacementByMatchNo(no, true);
  }

  if (matchCount === 120 || matchCount === 116 || matchCount === 112) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount, maxRound);
    return fixedSwissTs64PlacementByMatchNo(no, true);
  }

  if (
    matchCount === 111 ||
    matchCount === 114 ||
    matchCount === 115 ||
    matchCount === 119
  ) {
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

  if (isFixedSwissTs32R8ElimAtEighthMatchCount(matchCount ?? 0, maxRound)) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount ?? 0, maxRound);
    return fixedSwissTs32R8ElimPlacementByMatchNo(no, false);
  }

  if (isFixedSwissTs32R8ElimAtEighthBronzeMatchCount(matchCount ?? 0, maxRound)) {
    const no =
      matchNumber ??
      fixedSwissMatchNo(round, slot, matchCount ?? 0, maxRound);
    return fixedSwissTs32R8ElimPlacementByMatchNo(no, true);
  }

  if (matchCount === 56 || matchCount === 63 || matchCount === 55) {
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

export function fixedSwissTs84ColumnLabel(col: number): string {
  const labels: Record<number, string> = {
    [-2]: "Нижняя, тур 2",
    [-1]: "Нижняя, тур 1",
    0: "Первый тур",
    1: "Верхняя, тур 1",
    2: "1/4 финала",
    3: "Финал",
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
  if (
    isFixedSwissTs128R8ElimAtEighthFamily(matchCount, maxRound) ||
    isFixedSwissTs128MatchCount(matchCount) ||
    isFixedSwissTs128BronzeMatchCount(matchCount)
  ) {
    return fixedSwissTs128ColumnLabel(col);
  }
  if (isFixedSwissTs64MatchCount(matchCount) || isFixedSwissTs64BronzeMatchCount(matchCount)) {
    return fixedSwissTs64ColumnLabel(col);
  }
  if (
    isFixedSwissTs84BronzeMatchCount(matchCount) ||
    isFixedSwissTs84MatchCount(matchCount, maxRound)
  ) {
    return fixedSwissTs84ColumnLabel(col);
  }
  if (
    isFixedSwissTsMatchCount(matchCount, maxRound) ||
    isFixedSwissTsLegacy27SixRound(matchCount, maxRound)
  ) {
    return fixedSwissTsColumnLabel(col);
  }
  return fixedSwiss168ColumnLabel(col);
}

