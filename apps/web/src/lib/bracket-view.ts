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
};

export type SwissStandingView = BracketTeamView & {
  swissPoints: number;
  seed?: number | null;
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

import { OLYMPIC_BRONZE_MATCH_SLOT } from "@/lib/pair-tournament";
import { GRID_META_H } from "@/lib/swiss-bracket-layout";

/** Шаг и высота карточки для олимпийской сетки (px) — держать в sync с CSS .bracket-match-card */
export const OLYMPIC_BRACKET_UNIT = 168;
export const OLYMPIC_CARD_H = 124;
export const OLYMPIC_LABEL_OFFSET = 28;
/** Зазор между финалом и матчем за 3–4 в одной колонке */
export const OLYMPIC_BRONZE_BELOW_GAP = 12;

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
