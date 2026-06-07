import type { FixedSwissLink } from "@/lib/fixed-swiss-grid-types";

export type FixedSwissSlotRow = {
  round: number;
  slot: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerTeamId?: string | null;
  status?: string;
};

/** Автопроход 1-го тура: один участник без пары. */
export function isRoundOneByeSlot(match: FixedSwissSlotRow): boolean {
  if (match.round !== 1) return false;
  return Boolean(
    (match.team1Id && !match.team2Id) || (!match.team1Id && match.team2Id),
  );
}

/**
 * Крест нижней R2 без реальных игроков: оба входа — × от завершённых bye 1-го тура.
 * Такая встреча не играется, но должна закрыться и дать × на следующий этап.
 */
export function isVoidFixedSwissCrossMatch(
  match: FixedSwissSlotRow,
  allMatches: FixedSwissSlotRow[],
  links: FixedSwissLink[],
): boolean {
  if (match.round <= 1) return false;
  if (match.team1Id || match.team2Id) return false;
  if (match.winnerTeamId) return false;

  const incomingLosses = links.filter(
    (l) =>
      l.kind === "loss" &&
      l.toRound === match.round &&
      l.toSlot === match.slot,
  );
  if (incomingLosses.length === 0) return false;

  for (const link of incomingLosses) {
    const source = allMatches.find(
      (m) => m.round === link.fromRound && m.slot === link.fromSlot,
    );
    if (!source || !isRoundOneByeSlot(source) || !source.winnerTeamId) {
      return false;
    }
  }
  return true;
}

function isPhantomFeederSlot(
  source: FixedSwissSlotRow,
  allMatches: FixedSwissSlotRow[],
  links: FixedSwissLink[],
): boolean {
  if (isRoundOneByeSlot(source)) return true;
  return (
    source.status === "FINISHED" &&
    isVoidFixedSwissCrossMatch(source, allMatches, links)
  );
}

/** Слот с ×: loss/win от bye 1-го тура или пустого креста. */
export function isIncomingFixedSwissPhantomForTeam(
  match: FixedSwissSlotRow,
  teamSlot: 1 | 2,
  allMatches: FixedSwissSlotRow[],
  links: FixedSwissLink[],
): boolean {
  for (const link of links) {
    if (
      link.toRound !== match.round ||
      link.toSlot !== match.slot ||
      link.toTeam !== teamSlot
    ) {
      continue;
    }

    const source = allMatches.find(
      (m) => m.round === link.fromRound && m.slot === link.fromSlot,
    );
    if (source && isPhantomFeederSlot(source, allMatches, links)) {
      return true;
    }
  }
  return false;
}

export function incomingFixedSwissPhantomTeamSlot(
  match: FixedSwissSlotRow,
  allMatches: FixedSwissSlotRow[],
  links: FixedSwissLink[],
): 1 | 2 | null {
  for (const teamSlot of [1, 2] as const) {
    if (isIncomingFixedSwissPhantomForTeam(match, teamSlot, allMatches, links)) {
      return teamSlot;
    }
  }
  return null;
}
