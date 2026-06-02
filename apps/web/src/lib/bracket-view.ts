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

/** Шаг и высота карточки для олимпийской сетки (px) — держать в sync с CSS .bracket-match-card */
export const OLYMPIC_BRACKET_UNIT = 168;
export const OLYMPIC_CARD_H = 124;
export const OLYMPIC_LABEL_OFFSET = 28;

/** Вертикальная позиция матча в олимпийской сетке (px). */
export function olympicMatchTop(
  round: number,
  slot: number,
  _maxRound: number,
  unit = OLYMPIC_BRACKET_UNIT,
  cardHeight = OLYMPIC_CARD_H,
) {
  const span = 2 ** (round - 1);
  return (slot - 1) * span * unit + (span * unit - cardHeight) / 2;
}

export function olympicBracketHeight(maxRound: number, unit = OLYMPIC_BRACKET_UNIT) {
  return 2 ** (maxRound - 1) * unit;
}
