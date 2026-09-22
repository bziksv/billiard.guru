import { teamLabel, type TeamWithPlayers } from "@/lib/pair-tournament";

export type VacantRoundOneSlot = {
  matchId: string;
  round: number;
  slot: number;
  emptyTeamSlot: 1 | 2;
  opponentTeamId: string;
  opponentLabel: string;
  /** Bye уже автозакрыт — при посадке будет откат автопрохода. */
  byeFinished: boolean;
};

function opponentLabelFromTeam(team: {
  name?: string | null;
  player1: { firstName: string; lastName: string };
  player2?: { firstName: string; lastName: string } | null;
}): string {
  return teamLabel(team as TeamWithPlayers);
}

/** Чистый хелпер для UI: R1 с ровно одной занятой стороной. */
export function vacantRoundOneSlotsFromMatches(
  matches: {
    id: string;
    round: number;
    slot: number;
    status: string;
    team1Id?: string | null;
    team2Id?: string | null;
    winnerTeamId?: string | null;
    team1?: {
      id: string;
      name?: string | null;
      player1: { firstName: string; lastName: string };
      player2?: { firstName: string; lastName: string } | null;
    } | null;
    team2?: {
      id: string;
      name?: string | null;
      player1: { firstName: string; lastName: string };
      player2?: { firstName: string; lastName: string } | null;
    } | null;
  }[],
): VacantRoundOneSlot[] {
  const result: VacantRoundOneSlot[] = [];
  for (const match of matches) {
    if (match.round !== 1) continue;
    const id1 = match.team1Id ?? match.team1?.id ?? null;
    const id2 = match.team2Id ?? match.team2?.id ?? null;
    const has1 = Boolean(id1);
    const has2 = Boolean(id2);
    if (has1 === has2) continue;

    const emptyTeamSlot: 1 | 2 = has1 ? 2 : 1;
    const opponent = has1 ? match.team1 : match.team2;
    const opponentTeamId = (has1 ? id1 : id2)!;
    if (!opponent) continue;

    result.push({
      matchId: match.id,
      round: match.round,
      slot: match.slot,
      emptyTeamSlot,
      opponentTeamId,
      opponentLabel: opponentLabelFromTeam(opponent),
      byeFinished:
        Boolean(match.winnerTeamId) || match.status === "FINISHED",
    });
  }
  return result;
}
