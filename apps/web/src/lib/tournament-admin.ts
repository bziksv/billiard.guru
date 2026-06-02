import {
  isPairFormat,
  isSwissFormat,
  isSwissPairFormat,
  teamLabel,
  teamRating,
  type TeamWithPlayers,
} from "@/lib/pair-tournament";
import { TOURNAMENT_FORMAT_LABELS } from "@/lib/validators";

export interface AdminTournamentParticipant {
  id: string;
  status: string;
  source?: string;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
    phone: string;
    telegramUsername?: string | null;
  };
}

export interface AdminTournamentTeam {
  id: string;
  status: string;
  seed?: number | null;
  swissPoints?: number;
  player1: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
    phone: string;
    telegramUsername?: string | null;
  };
  player2?: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
    phone: string;
    telegramUsername?: string | null;
  } | null;
  name?: string | null;
}

export interface AdminTournamentMatch {
  id: string;
  round: number;
  slot: number;
  status: string;
  team1Score?: number | null;
  team2Score?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  team1: AdminTournamentTeam | null;
  team2: AdminTournamentTeam | null;
  winnerTeam: AdminTournamentTeam | null;
}

export interface AdminTournament {
  id: string;
  name: string;
  description?: string | null;
  format: string;
  status: string;
  clubId: string;
  startsAt?: string | null;
  club: {
    name: string;
    id?: string;
    phone?: string;
    telegramId?: string | null;
    city?: { id: string; nameRu: string; country: { id: string; nameRu: string } };
  };
  registrations: AdminTournamentParticipant[];
  teams: AdminTournamentTeam[];
  matches: AdminTournamentMatch[];
}

export function countConfirmedParticipants(t: AdminTournament): number {
  if (isPairFormat(t.format)) {
    return t.teams.filter((team) => team.status === "CONFIRMED").length;
  }
  return t.registrations.filter((r) => r.status === "CONFIRMED").length;
}

export function countPendingApplications(t: AdminTournament): number {
  if (isPairFormat(t.format)) {
    return t.teams.filter((team) => team.status === "PENDING").length;
  }
  return t.registrations.filter((r) => r.status === "PENDING").length;
}

export function canStartTournament(t: AdminTournament): boolean {
  return t.status === "OPEN" && countConfirmedParticipants(t) >= 2;
}

export interface TournamentStandingRow {
  place: number;
  label: string;
  rating: number;
  points?: number;
  note?: string;
}

/** Итоговая таблица мест для протокола турнира. */
export function computeTournamentStandings(t: AdminTournament): TournamentStandingRow[] {
  if (isPairFormat(t.format)) {
    if (isSwissPairFormat(t.format)) {
      return computeSwissStandings(t);
    }
    return computeOlympicPairStandings(t);
  }

  if (t.format === "SWISS") {
    return computeSwissStandings(t);
  }

  const players = [...t.registrations.filter((r) => r.status === "CONFIRMED")].sort(
    (a, b) => b.player.rating - a.player.rating,
  );

  const hasBracket = t.matches.length > 0;
  return players.map((r, index) => ({
    place: index + 1,
    label: `${r.player.lastName} ${r.player.firstName}`,
    rating: r.player.rating,
    note: hasBracket ? undefined : "предварительно по рейтингу",
  }));
}

function computeSwissStandings(t: AdminTournament): TournamentStandingRow[] {
  const teams = [...t.teams.filter((team) => team.status === "CONFIRMED")].sort(
    (a, b) =>
      (b.swissPoints ?? 0) - (a.swissPoints ?? 0) ||
      teamRating(b as TeamWithPlayers) - teamRating(a as TeamWithPlayers),
  );

  if (teams.length === 0) {
    const players = [...t.registrations.filter((r) => r.status === "CONFIRMED")].sort(
      (a, b) => b.player.rating - a.player.rating,
    );
    return players.map((r, index) => ({
      place: index + 1,
      label: `${r.player.lastName} ${r.player.firstName}`,
      rating: r.player.rating,
      note: "предварительно по рейтингу",
    }));
  }

  return teams.map((team, index) => ({
    place: index + 1,
    label: teamLabel(team as TeamWithPlayers),
    rating: teamRating(team as TeamWithPlayers),
    points: team.swissPoints ?? 0,
  }));
}

function computeOlympicPairStandings(t: AdminTournament): TournamentStandingRow[] {
  const maxRound = t.matches.reduce((max, m) => Math.max(max, m.round), 0);
  if (maxRound === 0) {
    return [...t.teams.filter((team) => team.status === "CONFIRMED")]
      .sort(
        (a, b) =>
          teamRating(b as TeamWithPlayers) - teamRating(a as TeamWithPlayers),
      )
      .map((team, index) => ({
        place: index + 1,
        label: teamLabel(team as TeamWithPlayers),
        rating: teamRating(team as TeamWithPlayers),
        note: "предварительно по рейтингу",
      }));
  }

  const standings: TournamentStandingRow[] = [];
  const placed = new Set<string>();

  function pushPlace(team: AdminTournamentTeam, place: number) {
    if (placed.has(team.id)) return;
    placed.add(team.id);
    standings.push({
      place,
      label: teamLabel(team as TeamWithPlayers),
      rating: teamRating(team as TeamWithPlayers),
    });
  }

  const finalMatch = t.matches.find(
    (m) => m.round === maxRound && m.winnerTeam && m.team1 && m.team2,
  );
  if (finalMatch?.winnerTeam && finalMatch.team1 && finalMatch.team2) {
    pushPlace(finalMatch.winnerTeam, 1);
    const loser =
      finalMatch.winnerTeam.id === finalMatch.team1.id
        ? finalMatch.team2
        : finalMatch.team1;
    pushPlace(loser, 2);
  }

  let nextPlace = standings.length + 1;
  for (let round = maxRound - 1; round >= 1; round--) {
    const roundMatches = t.matches.filter(
      (m) =>
        m.round === round &&
        m.winnerTeam &&
        m.team1 &&
        m.team2 &&
        m.status === "FINISHED" || m.status === "WALKOVER",
    );
    const losers = roundMatches
      .map((m) =>
        m.winnerTeam!.id === m.team1!.id ? m.team2! : m.team1!,
      )
      .filter((team) => !placed.has(team.id));

    for (const team of losers) {
      pushPlace(team, nextPlace);
      nextPlace++;
    }
  }

  const unplaced = t.teams
    .filter((team) => team.status === "CONFIRMED" && !placed.has(team.id))
    .sort(
      (a, b) =>
        teamRating(b as TeamWithPlayers) - teamRating(a as TeamWithPlayers),
    );
  for (const team of unplaced) {
    pushPlace(team, nextPlace);
    nextPlace++;
  }

  return standings;
}

export const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Черновик" },
  { value: "PENDING_CLUB_APPROVAL", label: "Ожидает подтверждения клуба" },
  { value: "OPEN", label: "Открыта регистрация" },
  { value: "ACTIVE", label: "Идёт" },
  { value: "FINISHED", label: "Завершён" },
];

export const FORMAT_OPTIONS = [
  { value: "OLYMPIC", label: "Олимпийская (фикс. сетка, одиночный)" },
  { value: "SWISS", label: "Швейцарская (по турам, одиночный)" },
  { value: "FIXED_SWISS", label: TOURNAMENT_FORMAT_LABELS.FIXED_SWISS! },
  { value: "PAIR_OLYMPIC", label: "Парный (фикс. сетка)" },
  { value: "PAIR_SWISS", label: "Парный швейцарская (по турам)" },
  { value: "FIXED_PAIR_SWISS", label: TOURNAMENT_FORMAT_LABELS.FIXED_PAIR_SWISS! },
];

export const tournamentAdminInclude = {
  club: { include: { city: { include: { country: true } } } },
  registrations: { include: { player: true } },
  teams: {
    include: { player1: true, player2: true, club: true },
    orderBy: [{ seed: "asc" as const }, { createdAt: "asc" as const }],
  },
  matches: {
    include: {
      team1: { include: { player1: true, player2: true } },
      team2: { include: { player1: true, player2: true } },
      winnerTeam: { include: { player1: true, player2: true } },
    },
    orderBy: [{ round: "asc" as const }, { slot: "asc" as const }],
  },
};
