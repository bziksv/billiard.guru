import type { AdminTournament } from "@/lib/tournament-admin";

export function bracketAdminStatusLabel(tournament: AdminTournament): string {
  const total = tournament.matches.length;
  if (total === 0) return "Сетка не сформирована";
  const finished = tournament.matches.filter(
    (m) => m.status === "FINISHED" || m.status === "WALKOVER" || m.winnerTeam,
  ).length;
  if (finished >= total) return `Завершена · ${total} встреч`;
  return `${finished} / ${total} встреч`;
}

export function isBracketAdminCandidate(tournament: AdminTournament): boolean {
  if (tournament.status === "ACTIVE") return true;
  if (tournament.matches.length > 0) return true;
  return ["OPEN", "PENDING_CLUB_APPROVAL"].includes(tournament.status);
}
