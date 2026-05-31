import {
  groupMatchesByRound,
  type BracketMatchView,
} from "@/lib/bracket-view";
import {
  findFixedSwissLink,
  getFixedSwissLinksForGrid,
  inferFixedSwissGridSize,
} from "@/lib/fixed-swiss-grid";
import {
  GRID_CARD_W,
  GRID_COL_W,
  GRID_GAP_Y,
  GRID_META_H,
  GRID_PAD,
  GRID_ROW_H,
  gridCardHeight,
  gridColLeft,
  type SwissBracketEdge,
  type SwissBracketLayout,
  type SwissEdgeKind,
  type SwissMatchPosition,
} from "@/lib/swiss-bracket-layout";

function matchTeams(match: BracketMatchView): string[] {
  return [match.team1?.id, match.team2?.id].filter(Boolean) as string[];
}

function buildMatchNumbers(matches: BracketMatchView[]) {
  const sorted = [...matches].sort(
    (a, b) => a.round - b.round || a.slot - b.slot,
  );
  const map = new Map<string, number>();
  sorted.forEach((m, i) => map.set(m.id, i + 1));
  return map;
}

function buildTeamColumns(matches: BracketMatchView[]): Map<string, number> {
  const teamCol = new Map<string, number>();

  for (const match of matches) {
    if (match.team1 && !teamCol.has(match.team1.id)) teamCol.set(match.team1.id, 0);
    if (match.team2 && !teamCol.has(match.team2.id)) teamCol.set(match.team2.id, 0);
  }

  const sorted = [...matches].sort(
    (a, b) => a.round - b.round || a.slot - b.slot,
  );

  for (const match of sorted) {
    if (!match.winnerTeamId) continue;

    const matchCol = matchColumn(match, teamCol);
    const loserId =
      match.team1?.id === match.winnerTeamId
        ? match.team2?.id
        : match.team1?.id;

    teamCol.set(match.winnerTeamId, matchCol + 1);
    if (loserId) teamCol.set(loserId, matchCol - 1);
  }

  return teamCol;
}

function matchColumn(
  match: BracketMatchView,
  teamCol: Map<string, number>,
): number {
  const teams = matchTeams(match);
  if (teams.length === 0) return 0;
  const cols = teams.map((id) => teamCol.get(id) ?? 0);
  return cols[0] ?? 0;
}

function resolveColumnOverlaps(
  matchIds: string[],
  positions: Map<string, SwissMatchPosition>,
  cardHeights: Map<string, number>,
) {
  const sorted = [...matchIds].sort(
    (a, b) => (positions.get(a)?.y ?? 0) - (positions.get(b)?.y ?? 0),
  );

  for (let i = 1; i < sorted.length; i++) {
    const prevId = sorted[i - 1]!;
    const currId = sorted[i]!;
    const prev = positions.get(prevId)!;
    const curr = positions.get(currId)!;
    const prevH = cardHeights.get(prevId) ?? gridCardHeight();
    const minY = prev.y + prevH + GRID_GAP_Y;
    if (curr.y < minY) {
      positions.set(currId, { ...curr, y: minY });
    }
  }
}

function teamRowCenterY(
  match: BracketMatchView,
  teamId: string,
  cardTop: number,
): number {
  if (match.team1?.id === teamId) {
    return cardTop + GRID_META_H + GRID_ROW_H / 2;
  }
  if (match.team2?.id === teamId) {
    return cardTop + GRID_META_H + GRID_ROW_H + GRID_ROW_H / 2;
  }
  return cardTop + GRID_META_H + GRID_ROW_H / 2;
}

function buildFixedTemplateEdges(
  matches: BracketMatchView[],
  gridSize: number,
): SwissBracketEdge[] {
  const links = getFixedSwissLinksForGrid(gridSize);
  const byRoundSlot = new Map<string, BracketMatchView>();
  for (const m of matches) {
    byRoundSlot.set(`${m.round}:${m.slot}`, m);
  }

  const edges: SwissBracketEdge[] = [];
  for (const match of matches) {
    for (const kind of ["win", "loss"] as const) {
      const link = findFixedSwissLink(links, match.round, match.slot, kind);
      if (!link) continue;
      const to = byRoundSlot.get(`${link.toRound}:${link.toSlot}`);
      if (!to) continue;
      const teamId =
        kind === "win"
          ? match.team1?.id ?? match.team2?.id ?? `${match.id}-win`
          : match.team2?.id ?? match.team1?.id ?? `${match.id}-loss`;
      edges.push({
        fromId: match.id,
        toId: to.id,
        teamId,
        kind: kind === "loss" ? "loss" : "win",
      });
    }
  }
  return edges;
}

/** Фикс. швейцарка: старт в центре, победа → вправо, поражение → влево. */
export function buildFixedSwissBracketLayout(
  matches: BracketMatchView[],
): SwissBracketLayout {
  const rounds = groupMatchesByRound(matches);
  const positions = new Map<string, SwissMatchPosition>();
  const teamCol = buildTeamColumns(matches);
  const gridSize = inferFixedSwissGridSize(matches.length);
  const edges = buildFixedTemplateEdges(matches, gridSize);
  const matchNumbers = buildMatchNumbers(matches);
  const cardHeights = new Map<string, number>();
  for (const m of matches) {
    cardHeights.set(m.id, gridCardHeight(Boolean(m.team1 && m.team2)));
  }

  if (rounds.length === 0) {
    return {
      rounds,
      positions,
      edges,
      matchNumbers,
      minCol: 0,
      maxCol: 0,
      minRound: 1,
      totalWidth: GRID_COL_W,
      totalHeight: gridCardHeight() + GRID_PAD * 2,
      centerX: GRID_PAD,
    };
  }

  const teamY = new Map<string, number>();
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const firstRound = rounds[0]!;
  let round1Y = 0;

  for (const match of firstRound.matches) {
    const h = cardHeights.get(match.id)!;
    positions.set(match.id, { col: 0, y: round1Y });

    if (match.team1) {
      teamY.set(match.team1.id, round1Y + GRID_META_H + GRID_ROW_H / 2);
    }
    if (match.team2) {
      teamY.set(
        match.team2.id,
        round1Y + GRID_META_H + GRID_ROW_H + GRID_ROW_H / 2,
      );
    } else if (match.team1) {
      teamY.set(match.team1.id, round1Y + GRID_META_H + GRID_ROW_H / 2);
    }

    round1Y += h + GRID_GAP_Y;
  }

  for (let r = 1; r < rounds.length; r++) {
    const { matches: roundMatches } = rounds[r]!;

    for (const match of roundMatches) {
      const col = matchColumn(match, teamCol);
      const cardH = cardHeights.get(match.id) ?? gridCardHeight();
      const incoming = edges.filter((e) => e.toId === match.id);

      let y: number;
      if (incoming.length > 0) {
        y =
          incoming.reduce((sum, edge) => {
            const from = positions.get(edge.fromId);
            const fromMatch = matchById.get(edge.fromId);
            if (!from || !fromMatch) return sum;
            return sum + teamRowCenterY(fromMatch, edge.teamId, from.y);
          }, 0) /
            incoming.length -
          cardH / 2 +
          GRID_META_H +
          GRID_ROW_H;
      } else {
        y = (match.slot - 1) * (cardH + GRID_GAP_Y);
      }

      positions.set(match.id, { col, y: Math.max(0, y) });
    }

    const byCol = new Map<number, string[]>();
    for (const match of roundMatches) {
      const col = positions.get(match.id)!.col;
      const list = byCol.get(col) ?? [];
      list.push(match.id);
      byCol.set(col, list);
    }
    for (const ids of byCol.values()) {
      resolveColumnOverlaps(ids, positions, cardHeights);
    }

    for (const match of roundMatches) {
      const pos = positions.get(match.id)!;
      for (const teamId of matchTeams(match)) {
        teamY.set(teamId, teamRowCenterY(match, teamId, pos.y));
      }
    }
  }

  const allByCol = new Map<number, string[]>();
  for (const [id, pos] of positions) {
    const list = allByCol.get(pos.col) ?? [];
    list.push(id);
    allByCol.set(pos.col, list);
  }
  for (const ids of allByCol.values()) {
    resolveColumnOverlaps(ids, positions, cardHeights);
  }

  let minCol = 0;
  let maxCol = 0;
  let maxY = 0;
  for (const [id, pos] of positions) {
    minCol = Math.min(minCol, pos.col);
    maxCol = Math.max(maxCol, pos.col);
    const h = cardHeights.get(id) ?? gridCardHeight();
    maxY = Math.max(maxY, pos.y + h);
  }

  const totalWidth = (maxCol - minCol + 1) * GRID_COL_W + GRID_PAD * 2;
  const totalHeight = maxY + GRID_PAD * 2;
  const centerX = gridColLeft(0, minCol) + GRID_CARD_W / 2;

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
  };
}

export function gridFixedColumnLabel(col: number): string {
  if (col === 0) return "Старт";
  if (col < 0) return `← ${Math.abs(col)}`;
  return `${col} →`;
}

export function gridFixedEdgePoints(
  fromMatch: BracketMatchView,
  toMatch: BracketMatchView,
  fromPos: SwissMatchPosition,
  toPos: SwissMatchPosition,
  teamId: string,
  kind: SwissEdgeKind,
  minCol: number,
) {
  const fromTop = fromPos.y + GRID_PAD;
  const toTop = toPos.y + GRID_PAD;
  const y = teamRowCenterY(fromMatch, teamId, fromTop);
  const entryY = teamRowCenterY(toMatch, teamId, toTop);
  const fromLeft = gridColLeft(fromPos.col, minCol);
  const toLeft = gridColLeft(toPos.col, minCol);

  const from =
    kind === "loss"
      ? { x: fromLeft, y }
      : { x: fromLeft + GRID_CARD_W, y };

  const enteringFromRight = toPos.col > fromPos.col;
  const enteringFromLeft = toPos.col < fromPos.col;
  let to: { x: number; y: number };
  if (enteringFromRight) {
    to = { x: toLeft, y: entryY };
  } else if (enteringFromLeft) {
    to = { x: toLeft + GRID_CARD_W, y: entryY };
  } else {
    to =
      kind === "loss"
        ? { x: toLeft + GRID_CARD_W, y: entryY }
        : { x: toLeft, y: entryY };
  }

  return { from, to };
}

export function gridFixedConnectorPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  kind: SwissEdgeKind,
) {
  if (kind === "loss") {
    const stub = 18;
    const midX = Math.min(from.x, to.x) - stub;
    return `M ${from.x} ${from.y} H ${midX} V ${to.y} H ${to.x}`;
  }

  const gap = Math.max(20, Math.abs(to.x - from.x) / 2);
  const midX = to.x >= from.x ? from.x + gap : from.x - gap;
  return `M ${from.x} ${from.y} H ${midX} V ${to.y} H ${to.x}`;
}
