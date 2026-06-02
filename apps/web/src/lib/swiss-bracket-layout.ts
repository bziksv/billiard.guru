import {
  groupMatchesByRound,
  matchAutopassBye,
  type BracketMatchView,
} from "@/lib/bracket-view";

export type SwissEdgeKind = "win" | "loss" | "bye";

export type SwissBracketEdge = {
  fromId: string;
  toId: string;
  teamId: string;
  kind: SwissEdgeKind;
  /** Фикс. швейцарка: строка источника (1 — верх, 2 — низ) */
  fromTeamSlot?: 1 | 2;
  /** Фикс. швейцарка: строка назначения */
  toTeamSlot?: 1 | 2;
};

export type SwissMatchPosition = {
  col: number;
  y: number;
};

export type SwissBracketLayout = {
  rounds: ReturnType<typeof groupMatchesByRound>;
  positions: Map<string, SwissMatchPosition>;
  edges: SwissBracketEdge[];
  matchNumbers: Map<string, number>;
  minCol: number;
  maxCol: number;
  minRound: number;
  totalWidth: number;
  totalHeight: number;
  centerX: number;
  /** Фикс. швейцарка: ширина колонки/карточки (если отличается от GRID_*). */
  colWidth?: number;
  cardWidth?: number;
  cardHeight?: number;
};

export const GRID_COL_W = 280;
export const GRID_CARD_W = 220;
export const GRID_ROW_H = 28;
export const GRID_META_H = 24;
export const GRID_FOOTER_H = 22;
/** Высота одной строки подвала (место / переходы). */
export const GRID_FOOTER_LINE_H = 12;
export const GRID_GAP_Y = 20;
export const GRID_PAD = 24;
/** Отступ под заголовки колонок — как OLYMPIC_LABEL_OFFSET в bracket-view */
export const GRID_LABEL_OFFSET = 18;

export function gridCardInset() {
  return (GRID_COL_W - GRID_CARD_W) / 2;
}

export function gridCardLeft(col: number, minCol: number) {
  return gridColLeft(col, minCol) + gridCardInset();
}

export function gridFooterHeight(lines = 2): number {
  if (lines <= 1) return GRID_FOOTER_H;
  return lines * GRID_FOOTER_LINE_H + 8;
}

export function gridCardHeight(hasHandicap = false, footerLines = 2) {
  return (
    GRID_META_H +
    GRID_ROW_H * 2 +
    gridFooterHeight(footerLines) +
    (hasHandicap ? 18 : 0)
  );
}

function matchTeams(match: BracketMatchView): string[] {
  return [match.team1?.id, match.team2?.id].filter(Boolean) as string[];
}

function findTeamMatchInRound(
  teamId: string,
  round: number,
  matches: BracketMatchView[],
) {
  return matches.find(
    (m) =>
      m.round === round &&
      (m.team1?.id === teamId || m.team2?.id === teamId),
  );
}

function buildMatchNumbers(matches: BracketMatchView[]) {
  const sorted = [...matches].sort(
    (a, b) => a.round - b.round || a.slot - b.slot,
  );
  const map = new Map<string, number>();
  sorted.forEach((m, i) => map.set(m.id, i + 1));
  return map;
}

function buildEdges(matches: BracketMatchView[]): SwissBracketEdge[] {
  const edges: SwissBracketEdge[] = [];

  for (const match of matches) {
    if (!match.winnerTeamId) continue;

    const winnerId = match.winnerTeamId;
    const isBye = Boolean(
      (match.team1 && !match.team2) || (!match.team1 && match.team2),
    );
    const loserId =
      match.team1?.id === winnerId ? match.team2?.id : match.team1?.id;

    const nextRound = match.round + 1;
    const winnerNext = findTeamMatchInRound(winnerId, nextRound, matches);
    if (winnerNext) {
      edges.push({
        fromId: match.id,
        toId: winnerNext.id,
        teamId: winnerId,
        kind: isBye ? "bye" : "win",
      });
    }

    if (loserId) {
      const loserNext = findTeamMatchInRound(loserId, nextRound, matches);
      if (loserNext) {
        edges.push({
          fromId: match.id,
          toId: loserNext.id,
          teamId: loserId,
          kind: "loss",
        });
      }
    }
  }

  return edges;
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

function matchRoundCol(match: BracketMatchView, minRound: number) {
  return match.round - minRound;
}

/**
 * Горизонталь = номер тура (слева направо). Внутри тура — вертикаль по связям.
 * Так не смешиваются встречи разных туров в одной колонке «Старт».
 */
export function buildSwissBracketLayout(
  matches: BracketMatchView[],
): SwissBracketLayout {
  const rounds = groupMatchesByRound(matches);
  const positions = new Map<string, SwissMatchPosition>();
  const edges = buildEdges(matches);
  const matchNumbers = buildMatchNumbers(matches);
  const cardHeights = new Map<string, number>();
  for (const m of matches) {
    cardHeights.set(m.id, gridCardHeight(Boolean(m.team1 && m.team2)));
  }

  const minRound = rounds[0]?.round ?? 1;

  if (rounds.length === 0) {
    return {
      rounds,
      positions,
      edges,
      matchNumbers,
      minCol: 0,
      maxCol: 0,
      minRound,
      totalWidth: GRID_COL_W,
      totalHeight: gridCardHeight() + GRID_PAD * 2,
      centerX: GRID_PAD,
    };
  }

  const teamY = new Map<string, number>();
  const matchById = new Map(matches.map((m) => [m.id, m]));

  const firstRound = rounds[0]!;
  let roundY = 0;

  for (const match of firstRound.matches) {
    const h = cardHeights.get(match.id)!;
    positions.set(match.id, { col: matchRoundCol(match, minRound), y: roundY });

    if (match.team1) {
      teamY.set(match.team1.id, roundY + GRID_META_H + GRID_ROW_H / 2);
    }
    if (match.team2) {
      teamY.set(
        match.team2.id,
        roundY + GRID_META_H + GRID_ROW_H + GRID_ROW_H / 2,
      );
    } else if (match.team1) {
      teamY.set(match.team1.id, roundY + GRID_META_H + GRID_ROW_H / 2);
    }

    roundY += h + GRID_GAP_Y;
  }

  for (let r = 1; r < rounds.length; r++) {
    const { matches: roundMatches } = rounds[r]!;

    for (const match of roundMatches) {
      const col = matchRoundCol(match, minRound);
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

  let minCol = 0;
  let maxCol = 0;
  let maxY = 0;
  for (const [id, pos] of positions) {
    minCol = Math.min(minCol, pos.col);
    maxCol = Math.max(maxCol, pos.col);
    const h = cardHeights.get(id) ?? gridCardHeight();
    maxY = Math.max(maxY, pos.y + h);
  }

  const colCount = maxCol - minCol + 1;
  const totalWidth = colCount * GRID_COL_W + GRID_PAD * 2;
  const totalHeight = maxY + GRID_PAD * 2;
  const centerCol = minCol + (maxCol - minCol) / 2;
  const centerX = gridColLeft(centerCol, minCol) + GRID_CARD_W / 2;

  return {
    rounds,
    positions,
    edges,
    matchNumbers,
    minCol,
    maxCol,
    minRound,
    totalWidth,
    totalHeight,
    centerX,
  };
}

export function gridColLeft(col: number, minCol: number) {
  return (col - minCol) * GRID_COL_W + GRID_PAD;
}

export function gridTeamRowY(
  match: BracketMatchView,
  teamId: string,
  cardTop: number,
) {
  return teamRowCenterY(match, teamId, cardTop);
}

export function teamRowCenterYBySlot(cardTop: number, teamSlot: 1 | 2): number {
  if (teamSlot === 1) {
    return cardTop + GRID_META_H + GRID_ROW_H / 2;
  }
  return cardTop + GRID_META_H + GRID_ROW_H + GRID_ROW_H / 2;
}

/** Y горизонтали между двумя строками игроков (эталон для линий fixed Swiss). */
export function teamDividerY(cardTop: number): number {
  return cardTop + GRID_META_H + GRID_ROW_H;
}

export function gridEdgePoints(
  fromMatch: BracketMatchView,
  toMatch: BracketMatchView,
  fromPos: SwissMatchPosition,
  toPos: SwissMatchPosition,
  teamId: string,
  _kind: SwissEdgeKind,
  minCol: number,
) {
  const fromTop = fromPos.y + GRID_PAD + GRID_LABEL_OFFSET;
  const toTop = toPos.y + GRID_PAD + GRID_LABEL_OFFSET;
  const y = gridTeamRowY(fromMatch, teamId, fromTop);
  const entryY = gridTeamRowY(toMatch, teamId, toTop);
  const fromLeft = gridCardLeft(fromPos.col, minCol);
  const toLeft = gridCardLeft(toPos.col, minCol);

  return {
    from: { x: fromLeft + GRID_CARD_W, y },
    to: { x: toLeft, y: entryY },
  };
}

export function gridConnectorPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  _kind: SwissEdgeKind,
) {
  const gap = Math.max(20, (to.x - from.x) / 2);
  const midX = from.x + gap;
  return `M ${from.x} ${from.y} H ${midX} V ${to.y} H ${to.x}`;
}

export function gridEdgeStroke(kind: SwissEdgeKind) {
  if (kind === "loss") return "rgb(113 113 122 / 0.55)";
  return "rgb(52 211 153 / 0.9)";
}

export function getMatchDestinations(
  matchId: string,
  edges: SwissBracketEdge[],
  matchNumbers: Map<string, number>,
) {
  const winnerEdge = edges.find(
    (e) => e.fromId === matchId && e.kind !== "loss",
  );
  const loserEdge = edges.find(
    (e) => e.fromId === matchId && e.kind === "loss",
  );

  return {
    winnerTo: winnerEdge ? matchNumbers.get(winnerEdge.toId) : undefined,
    loserTo: loserEdge ? matchNumbers.get(loserEdge.toId) : undefined,
    winnerKind: winnerEdge?.kind,
  };
}

export function gridColumnLabel(col: number, minRound = 1): string {
  return `Тур ${col + minRound}`;
}

/** × от bye 1-го тура показывается в матче назначения (слот toTeamSlot), как llb. */
export function incomingAutopassPhantomSlot(
  matchId: string,
  edges: SwissBracketEdge[],
  matchById: Map<string, BracketMatchView>,
): 1 | 2 | null {
  for (const edge of edges) {
    if (edge.toId !== matchId || edge.kind !== "loss" || !edge.toTeamSlot) {
      continue;
    }
    const from = matchById.get(edge.fromId);
    if (from && matchAutopassBye(from).isBye) {
      return edge.toTeamSlot;
    }
  }
  return null;
}
