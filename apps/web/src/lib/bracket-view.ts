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

/** Подпись этапа для карточки (матч за 3–4 в финальном туре). */
export function olympicMatchPlacementLabel(
  round: number,
  slot: number,
  maxRound: number,
  withBronzeMatch: boolean,
): string | null {
  if (!withBronzeMatch) return null;
  if (round === maxRound && slot === 2) return "матч за 3–4 место";
  if (round === maxRound && slot === 1) return "место 1–2";
  return null;
}
