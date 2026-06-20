import {
  computeTournamentStandings,
  formatTournamentStandingPlace,
  type AdminTournament,
  type TournamentStandingRow,
} from "@/lib/tournament-admin";
import { isPairFormat, playerName, PUBLIC_PARTICIPANT_STATUSES } from "@/lib/public-display";
import { formatRating } from "@/lib/rating";

export type PublicParticipantRow = {
  id: string;
  name: string;
  href: string;
  city?: string;
  ratingLabel?: string;
  note?: string;
};

export type PublicStandingRow = {
  key: string;
  placeLabel: string;
  placeSort: number;
  name: string;
  city: string;
  ratingLabel: string;
  playerHref?: string;
  secondPlayerHref?: string;
  note?: string;
};

export type PublicTournamentStandings = {
  rows: PublicStandingRow[];
  hasMatches: boolean;
  finished: boolean;
  preliminary: boolean;
  participantCount: number;
};

function placeSortValue(row: TournamentStandingRow): number {
  if (row.place == null) return 9999;
  return row.place;
}

function mapStandingRow(
  row: TournamentStandingRow,
  t: AdminTournament,
): PublicStandingRow {
  const team = row.teamId
    ? t.teams.find((x) => x.id === row.teamId)
    : undefined;
  const reg = !team
    ? t.registrations.find((r) => playerName(r.player) === row.label)
    : undefined;

  return {
    key: row.teamId ?? reg?.player.id ?? `${row.place}-${row.label}`,
    placeLabel: formatTournamentStandingPlace(row),
    placeSort: placeSortValue(row),
    name: row.label,
    city: row.city,
    ratingLabel: formatRating(row.rating),
    playerHref: team
      ? `/players/${team.player1.id}`
      : reg
        ? `/players/${reg.player.id}`
        : undefined,
    secondPlayerHref:
      team?.player2 != null ? `/players/${team.player2.id}` : undefined,
    note: row.note,
  };
}

/** Итоговый протокол для публичной страницы турнира. */
export function buildPublicTournamentStandings(
  tournament: AdminTournament,
): PublicTournamentStandings {
  const protocolRows = computeTournamentStandings(tournament);
  const rows = protocolRows.map((row) => mapStandingRow(row, tournament));
  const hasMatches = tournament.matches.length > 0;
  const finished = tournament.status === "FINISHED";
  const preliminary = rows.some((r) => r.note) && !finished;

  const publicParticipantStatuses = new Set<string>(PUBLIC_PARTICIPANT_STATUSES);
  const publicTeams = tournament.teams.filter((x) => publicParticipantStatuses.has(x.status));
  const publicRegistrations = tournament.registrations.filter((r) =>
    publicParticipantStatuses.has(r.status),
  );
  const participantCount = isPairFormat(tournament.format)
    ? publicTeams.length
    : hasMatches
      ? publicTeams.length || publicRegistrations.length
      : publicRegistrations.length;

  return {
    rows,
    hasMatches,
    finished,
    preliminary,
    participantCount,
  };
}

export function defaultPublicTournamentTab(
  standings: PublicTournamentStandings,
  registrationOpen: boolean,
): "results" | "participants" | "bracket" {
  if (standings.hasMatches) return "results";
  if (registrationOpen) return "participants";
  return standings.participantCount > 0 ? "participants" : "results";
}
