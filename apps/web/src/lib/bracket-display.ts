import type { BracketMatchView } from "@/lib/bracket-view";
import type { TeamPlayer, TeamWithPlayers } from "@/lib/pair-tournament";

/** Имя в ячейке сетки: #Фамилия Имя */
export function bracketPlayerLabel(player: TeamPlayer): string {
  return `#${player.lastName} ${player.firstName}`;
}

/** Подпись команды/игрока в карточке встречи. */
export function bracketTeamLabel(team: TeamWithPlayers): string {
  if (team.name?.trim()) return `#${team.name.trim()}`;
  if (!team.player2) return bracketPlayerLabel(team.player1);
  return `#${team.player1.lastName} / #${team.player2.lastName}`;
}

export function bracketMatchHasPlayer(
  match: BracketMatchView,
  playerId: string,
): boolean {
  const inTeam = (team: TeamWithPlayers | null | undefined) =>
    team != null &&
    (team.player1.id === playerId || team.player2?.id === playerId);
  return inTeam(match.team1) || inTeam(match.team2);
}

export function bracketPlayerLabelById(
  matches: BracketMatchView[],
  playerId: string,
): string | null {
  for (const match of matches) {
    for (const team of [match.team1, match.team2]) {
      if (!team) continue;
      if (team.player1.id === playerId) return bracketPlayerLabel(team.player1);
      if (team.player2?.id === playerId) return bracketPlayerLabel(team.player2);
    }
  }
  return null;
}
