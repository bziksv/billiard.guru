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

/** Вертикальная позиция матча в олимпийской сетке (px). */
export function olympicMatchTop(
  round: number,
  slot: number,
  maxRound: number,
  unit = 88,
  cardHeight = 76,
) {
  const span = 2 ** (maxRound - round);
  return (slot - 1) * span * unit + (span * unit - cardHeight) / 2;
}

export function olympicBracketHeight(maxRound: number, unit = 88) {
  return 2 ** (maxRound - 1) * unit;
}
