import { isMatchResolved } from "@/lib/match-result";
import type { TeamWithPlayers } from "@/lib/pair-tournament";

export type BracketTeamView = TeamWithPlayers & { id: string };

export type BracketMatchView = {
  id: string;
  round: number;
  slot: number;
  status: string;
  team1: BracketTeamView | null;
  team2: BracketTeamView | null;
  winnerTeamId: string | null;
  team1Score?: number | null;
  team2Score?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  tableId?: string | null;
  streamUrl?: string | null;
  tableLabel?: string | null;
};

export type SwissStandingView = BracketTeamView & {
  swissPoints: number;
  seed?: number | null;
  place?: number | null;
  placeTo?: number | null;
};

/** Автопроход (×): только 1-й тур, один участник без пары. Иначе — «ожидание». */
export function matchAutopassBye(match: BracketMatchView): {
  isBye: boolean;
  /** Строка с × (1 — верх, 2 — низ) */
  phantomRow: 1 | 2 | null;
} {
  if (match.round !== 1) {
    return { isBye: false, phantomRow: null };
  }
  if (match.team1 && !match.team2) {
    return { isBye: true, phantomRow: 2 };
  }
  if (!match.team1 && match.team2) {
    return { isBye: true, phantomRow: 1 };
  }
  return { isBye: false, phantomRow: null };
}

/** Можно вводить счёт и фиксировать результат (оба игрока или автопроход 1-го тура). */
export function isMatchReadyForResult(match: BracketMatchView): boolean {
  const { isBye: roundOneBye } = matchAutopassBye(match);
  if (roundOneBye) return true;
  return !!(match.team1 && match.team2);
}

/** Встреча ещё идёт: можно играть, результат не зафиксирован. */
export function isActiveBracketMatch(match: BracketMatchView): boolean {
  if (isMatchResolved(match.status, match.winnerTeamId)) return false;
  return isMatchReadyForResult(match);
}

export function groupMatchesByRound(matches: BracketMatchView[]) {
  const map = new Map<number, BracketMatchView[]>();
  for (const match of matches) {
    const list = map.get(match.round) ?? [];
    list.push(match);
    map.set(match.round, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, roundMatches]) => ({
      round,
      matches: roundMatches.sort((a, b) => a.slot - b.slot),
    }));
}

import { describeHandicapShort } from "@/lib/handicap";
import { OLYMPIC_BRONZE_MATCH_SLOT, teamRating } from "@/lib/pair-tournament";
import {
  GRID_FOOTER_LINE_H,
  GRID_META_H,
} from "@/lib/swiss-bracket-layout";

/** Отступ под заголовки колонок (px). */
export const OLYMPIC_LABEL_OFFSET = 28;
/** Зазор между карточками 1-го тура (px). */
export const OLYMPIC_ROUND1_GAP = 4;
/** Зазор между финалом и матчем за 3–4 в одной колонке */
export const OLYMPIC_BRONZE_BELOW_GAP = 12;
/** Строка участника с рейтингом — sync с `.bracket-match-row` в BracketMatchCard. */
const OLYMPIC_PLAYER_ROW_H = 45;
/** Блок «Фора» — sync с `.bracket-match-meta` (handicap). */
const OLYMPIC_HANDICAP_H = 43;
/** Одна строка подвала — sync с CardFooter (GRID_FOOTER_LINE_H). */
const OLYMPIC_FOOTER_ROW_H = GRID_FOOTER_LINE_H;
/** Запас на border-top подвала (px). */
const OLYMPIC_FOOTER_BORDER = 1;
/** Минимальный зазор при раздвижке колонок (px). */
const OLYMPIC_COL_COLLISION_GAP = 4;
/** sync с `.bracket-match-card` min-height в globals.css */
const OLYMPIC_CARD_MIN_H = 124;
/** sync с `.bracket-match-card--compact` min-height (6.5rem) */
const OLYMPIC_CARD_COMPACT_MIN_H = 104;

function olympicCardMinHeight(
  match: BracketMatchView,
  opts: OlympicDisplayOpts,
): number {
  const showMeta = opts.showCardMatchNumber !== false;
  const showHandicap =
    opts.showCardHandicap !== false &&
    olympicMatchHasHandicap(match, opts.handicapHalfStep !== false);
  if (!showMeta && !showHandicap) return OLYMPIC_CARD_COMPACT_MIN_H;
  return OLYMPIC_CARD_MIN_H;
}

/** @deprecated Используйте buildOlympicBracketLayout */
export const OLYMPIC_BRACKET_UNIT = 212;
/** @deprecated Используйте estimateOlympicCardHeight */
export const OLYMPIC_CARD_H = 172;

/** Оценка высоты карточки с шапкой # и подвалом «место …» */
export function olympicStackedCardHeight(): number {
  return OLYMPIC_CARD_H + GRID_META_H + 40;
}

/** Вертикальная позиция матча в олимпийской сетке (px). */
export function olympicMatchTop(
  round: number,
  slot: number,
  maxRound: number,
  unit = OLYMPIC_BRACKET_UNIT,
  cardHeight = OLYMPIC_CARD_H,
  withBronzeMatch = false,
): number {
  if (
    withBronzeMatch &&
    round === maxRound &&
    slot === OLYMPIC_BRONZE_MATCH_SLOT
  ) {
    const finalTop = olympicMatchTop(
      round,
      1,
      maxRound,
      unit,
      cardHeight,
      false,
    );
    return finalTop + olympicStackedCardHeight() + OLYMPIC_BRONZE_BELOW_GAP;
  }
  const span = 2 ** (round - 1);
  return (slot - 1) * span * unit + (span * unit - cardHeight) / 2;
}

export function olympicBracketHeight(
  maxRound: number,
  unit = OLYMPIC_BRACKET_UNIT,
  withBronzeMatch = false,
) {
  const treeH = 2 ** (maxRound - 1) * unit;
  if (!withBronzeMatch) return treeH;
  const finalTop = olympicMatchTop(maxRound, 1, maxRound, unit, OLYMPIC_CARD_H, false);
  const bronzeBottom =
    finalTop +
    olympicStackedCardHeight() +
    OLYMPIC_BRONZE_BELOW_GAP +
    olympicStackedCardHeight();
  return Math.max(treeH, bronzeBottom);
}

export type OlympicDisplayOpts = {
  showCardMatchNumber?: boolean;
  showCardHandicap?: boolean;
  showCardPlacement?: boolean;
  handicapHalfStep?: boolean;
  withBronzeMatch?: boolean;
};

export type OlympicBracketLayout = {
  tops: Map<string, number>;
  heights: Map<string, number>;
  totalHeight: number;
};

function olympicMatchHasHandicap(
  match: BracketMatchView,
  halfStep = true,
): boolean {
  if (!match.team1 || !match.team2) return false;
  const short = describeHandicapShort(
    Math.max(teamRating(match.team1), teamRating(match.team2)),
    Math.min(teamRating(match.team1), teamRating(match.team2)),
    { halfStep },
  );
  return Boolean(short && short !== "Без форы");
}

function olympicTeamBlockHeight(_match: BracketMatchView): number {
  return OLYMPIC_PLAYER_ROW_H * 2;
}

/** Оценка высоты карточки олимпийки для раскладки и линий. */
export function estimateOlympicCardHeight(
  match: BracketMatchView,
  footerRowCount: number,
  opts: OlympicDisplayOpts = {},
): number {
  let h = 0;
  if (opts.showCardMatchNumber !== false) h += GRID_META_H;
  h += olympicTeamBlockHeight(match);
  if (
    opts.showCardHandicap !== false &&
    olympicMatchHasHandicap(match, opts.handicapHalfStep !== false)
  ) {
    h += OLYMPIC_HANDICAP_H;
  }
  if (footerRowCount > 0) {
    h += OLYMPIC_FOOTER_BORDER + footerRowCount * OLYMPIC_FOOTER_ROW_H;
  }
  return Math.max(h, olympicCardMinHeight(match, opts));
}

function resolveOlympicColumnOverlaps(
  matches: BracketMatchView[],
  tops: Map<string, number>,
  heights: Map<string, number>,
  gap = OLYMPIC_COL_COLLISION_GAP,
) {
  const byRound = new Map<number, string[]>();
  for (const m of matches) {
    const list = byRound.get(m.round) ?? [];
    list.push(m.id);
    byRound.set(m.round, list);
  }

  for (const ids of byRound.values()) {
    const sorted = [...ids].sort(
      (a, b) => (tops.get(a) ?? 0) - (tops.get(b) ?? 0),
    );
    let lastBottom = -Infinity;
    for (const id of sorted) {
      const pos = tops.get(id) ?? 0;
      let top = pos;
      if (top < lastBottom + gap) {
        top = lastBottom + gap;
        tops.set(id, top);
      }
      lastBottom = top + (heights.get(id) ?? 0);
    }
  }
}

function olympicMetaHeight(opts: OlympicDisplayOpts): number {
  return opts.showCardMatchNumber !== false ? GRID_META_H : 0;
}

/** Центр блока двух строк игроков от верха карточки (без labelOffset). */
function olympicTeamCenterFromCardTop(opts: OlympicDisplayOpts): number {
  return olympicMetaHeight(opts) + OLYMPIC_PLAYER_ROW_H;
}

function olympicTeamCenterY(
  matchId: string,
  tops: Map<string, number>,
  opts: OlympicDisplayOpts,
  labelOffset = OLYMPIC_LABEL_OFFSET,
): number {
  const top = tops.get(matchId) ?? 0;
  return top + labelOffset + olympicTeamCenterFromCardTop(opts);
}

function olympicCardTopForTeamCenter(
  teamCenterY: number,
  opts: OlympicDisplayOpts,
  labelOffset = OLYMPIC_LABEL_OFFSET,
): number {
  return teamCenterY - labelOffset - olympicTeamCenterFromCardTop(opts);
}

function olympicCenterBetweenTeamBlocks(
  p1Id: string,
  p2Id: string,
  tops: Map<string, number>,
  opts: OlympicDisplayOpts,
  labelOffset = OLYMPIC_LABEL_OFFSET,
): number {
  const c1 = olympicTeamCenterY(p1Id, tops, opts, labelOffset);
  const c2 = olympicTeamCenterY(p2Id, tops, opts, labelOffset);
  const mid = (c1 + c2) / 2;
  return olympicCardTopForTeamCenter(mid, opts, labelOffset);
}

function olympicFooterRowCount(
  match: BracketMatchView,
  matches: BracketMatchView[],
  matchNumbers: Map<string, number>,
  maxRound: number,
  opts: OlympicDisplayOpts,
): number {
  if (opts.showCardPlacement === false) return 0;
  return olympicMatchFooterRows(
    match,
    matches,
    matchNumbers,
    maxRound,
    !!opts.withBronzeMatch,
  ).length;
}

/** Компактная раскладка олимпийки: минимальный зазор в 1-м туре, родители по фактической высоте. */
export function buildOlympicBracketLayout(
  matches: BracketMatchView[],
  matchNumbers: Map<string, number>,
  maxRound: number,
  opts: OlympicDisplayOpts = {},
): OlympicBracketLayout {
  const tops = new Map<string, number>();
  const heights = new Map<string, number>();
  const byKey = new Map<string, BracketMatchView>();
  for (const m of matches) byKey.set(`${m.round}:${m.slot}`, m);

  for (const m of matches) {
    heights.set(
      m.id,
      estimateOlympicCardHeight(
        m,
        olympicFooterRowCount(m, matches, matchNumbers, maxRound, opts),
        opts,
      ),
    );
  }

  const slotsR1 = 2 ** (maxRound - 1);
  let y = 0;
  for (let slot = 1; slot <= slotsR1; slot++) {
    const m = byKey.get(`1:${slot}`);
    if (m) tops.set(m.id, y);
    const h = m
      ? heights.get(m.id)!
      : estimateOlympicCardHeight(
          { round: 1, slot, team1: null, team2: null } as BracketMatchView,
          0,
          opts,
        );
    y += h + OLYMPIC_ROUND1_GAP;
  }

  for (let round = 2; round <= maxRound; round++) {
    const slots = 2 ** (maxRound - round);
    for (let slot = 1; slot <= slots; slot++) {
      const m = byKey.get(`${round}:${slot}`);
      if (!m) continue;
      const p1 = byKey.get(`${round - 1}:${2 * slot - 1}`);
      const p2 = byKey.get(`${round - 1}:${2 * slot}`);
      let top = 0;
      if (p1 && p2) {
        top = olympicCenterBetweenTeamBlocks(p1.id, p2.id, tops, opts);
      } else if (p1) {
        top = olympicCardTopForTeamCenter(
          olympicTeamCenterY(p1.id, tops, opts),
          opts,
        );
      } else if (p2) {
        top = olympicCardTopForTeamCenter(
          olympicTeamCenterY(p2.id, tops, opts),
          opts,
        );
      }
      tops.set(m.id, top);
    }
  }

  if (opts.withBronzeMatch) {
    const fin = byKey.get(`${maxRound}:1`);
    const bronze = byKey.get(`${maxRound}:${OLYMPIC_BRONZE_MATCH_SLOT}`);
    if (fin && bronze) {
      tops.set(
        bronze.id,
        tops.get(fin.id)! + heights.get(fin.id)! + OLYMPIC_BRONZE_BELOW_GAP,
      );
    }
  }

  resolveOlympicColumnOverlaps(matches, tops, heights);

  let totalHeight = 0;
  for (const m of matches) {
    const bottom = (tops.get(m.id) ?? 0) + (heights.get(m.id) ?? 0);
    totalHeight = Math.max(totalHeight, bottom);
  }

  return { tops, heights, totalHeight };
}

/** Y центра блока игроков для SVG-линии (px). */
export function olympicConnectorY(
  matchId: string,
  layout: OlympicBracketLayout,
  opts: OlympicDisplayOpts = {},
  labelOffset = OLYMPIC_LABEL_OFFSET,
): number {
  return olympicTeamCenterY(matchId, layout.tops, opts, labelOffset);
}

/** Этап олимпийской сетки (1/8, полуфинал, финал…). */
export function olympicRoundStageLabel(round: number, maxRound: number): string | null {
  if (maxRound <= 0) return null;
  const fromFinal = maxRound - round;
  if (fromFinal === 0) return "Финал";
  if (fromFinal === 1) return "Полуфинал";
  if (fromFinal === 2) return "1/4 финала";
  if (fromFinal === 3) return "1/8 финала";
  if (fromFinal === 4) return "1/16 финала";
  if (fromFinal === 5) return "1/32 финала";
  return `Тур ${round}`;
}

/** Диапазон мест для проигравшего в матче олимпийки (без матча за бронзу). */
export function olympicLoserPlaceRange(
  round: number,
  maxRound: number,
): { from: number; to: number } | null {
  if (maxRound <= 0 || round >= maxRound) return null;
  const from = 2 ** (maxRound - round) + 1;
  const to = 2 ** (maxRound - round + 1);
  return { from, to };
}

/** Подпись места для карточки олимпийской сетки (без «1/8 финала» — этап в заголовке колонки). */
export function olympicMatchPlacementLabel(
  round: number,
  slot: number,
  maxRound: number,
  withBronzeMatch: boolean,
): string | null {
  if (withBronzeMatch && round === maxRound && slot === 2) {
    return "матч за 3–4 место";
  }
  if (round === maxRound && slot === 1) {
    return "место 1–2";
  }
  const places = olympicLoserPlaceRange(round, maxRound);
  if (places) {
    return `место ${places.from}–${places.to}`;
  }
  return null;
}

export type BracketCardFooterRow =
  | { kind: "text"; text: string }
  | { kind: "split"; left: string; right: string };

/** Номер встречи, куда уходит победитель (следующий тур олимпийки). */
export function olympicWinnerDestMatchNo(
  match: Pick<BracketMatchView, "round" | "slot">,
  matches: BracketMatchView[],
  matchNumbers: Map<string, number>,
  maxRound: number,
): number | undefined {
  if (match.round >= maxRound) return undefined;
  const nextSlot = Math.ceil(match.slot / 2);
  const dest = matches.find(
    (m) => m.round === match.round + 1 && m.slot === nextSlot,
  );
  if (!dest) return undefined;
  return matchNumbers.get(dest.id);
}

/** Номер встречи за бронзу для проигравшего полуфинала (OLYMPIC_1L_BRONZE). */
export function olympicLoserDestMatchNo(
  match: Pick<BracketMatchView, "round" | "slot">,
  matches: BracketMatchView[],
  matchNumbers: Map<string, number>,
  maxRound: number,
  withBronzeMatch: boolean,
): number | undefined {
  if (!withBronzeMatch || match.round !== maxRound - 1) return undefined;
  const bronze = matches.find(
    (m) => m.round === maxRound && m.slot === OLYMPIC_BRONZE_MATCH_SLOT,
  );
  if (!bronze) return undefined;
  return matchNumbers.get(bronze.id);
}

/** Подвал карточки олимпийки: этап/места и «проигравший / победитель на #…». */
export function olympicMatchFooterRows(
  match: BracketMatchView,
  matches: BracketMatchView[],
  matchNumbers: Map<string, number>,
  maxRound: number,
  withBronzeMatch: boolean,
): BracketCardFooterRow[] {
  const placement = olympicMatchPlacementLabel(
    match.round,
    match.slot,
    maxRound,
    withBronzeMatch,
  );
  const { isBye: roundOneBye } = matchAutopassBye(match);
  const winnerToNo = olympicWinnerDestMatchNo(
    match,
    matches,
    matchNumbers,
    maxRound,
  );
  const loserToNo = olympicLoserDestMatchNo(
    match,
    matches,
    matchNumbers,
    maxRound,
    withBronzeMatch,
  );

  const winnerLine =
    winnerToNo !== undefined
      ? roundOneBye && match.round === 1
        ? `автопроход на #${winnerToNo}`
        : `победитель на #${winnerToNo}`
      : null;
  const loserLine =
    loserToNo !== undefined ? `проигравший на #${loserToNo}` : null;

  const footerRows: BracketCardFooterRow[] = [];

  if (winnerLine && loserLine) {
    if (placement) footerRows.push({ kind: "text", text: placement });
    footerRows.push({ kind: "split", left: loserLine, right: winnerLine });
  } else if (placement && winnerLine) {
    footerRows.push({ kind: "split", left: placement, right: winnerLine });
  } else if (placement && loserLine) {
    footerRows.push({ kind: "split", left: loserLine, right: placement });
  } else if (placement) {
    footerRows.push({ kind: "text", text: placement });
  } else if (winnerLine) {
    footerRows.push({ kind: "split", left: "—", right: winnerLine });
  } else if (loserLine) {
    footerRows.push({ kind: "split", left: loserLine, right: "—" });
  }

  if (match.status === "WALKOVER") {
    footerRows.push({ kind: "text", text: "тех. поражение" });
  }

  return footerRows;
}
