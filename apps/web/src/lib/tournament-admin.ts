import {
  fixedSwissMatchNo,
  fixedSwissProtocolPlace,
} from "@/lib/fixed-swiss-grid";
import {
  isFixedSwissFormat,
  isOlympicBronzeFormat,
  isPairFormat,
  isSoloFormat,
  isSwissPairFormat,
  OLYMPIC_BRONZE_MATCH_SLOT,
  teamLabel,
  teamRating,
  type TeamWithPlayers,
} from "@/lib/pair-tournament";
import type { BracketParticipantRules } from "@/lib/bracket-participant-rules";
type PlayerWithCity = {
  city?: { nameRu: string } | null;
};

export interface AdminTournamentParticipant {
  id: string;
  status: string;
  source?: string;
  feePaid?: boolean;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
    phone: string;
    telegramUsername?: string | null;
    city?: { nameRu: string } | null;
  };
}

export interface AdminTournamentTeam {
  id: string;
  status: string;
  feePaid?: boolean;
  seed?: number | null;
  swissPoints?: number;
  /** Переопределённый рейтинг пары (сыгранные пары); null — сумма рейтингов игроков. */
  ratingOverride?: number | null;
  player1: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
    phone: string;
    telegramUsername?: string | null;
    city?: { nameRu: string } | null;
  };
  player2?: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
    phone: string;
    telegramUsername?: string | null;
    city?: { nameRu: string } | null;
  } | null;
  name?: string | null;
}

export interface AdminTournamentMatch {
  id: string;
  round: number;
  slot: number;
  status: string;
  team1Id?: string | null;
  team2Id?: string | null;
  winnerTeamId?: string | null;
  team1Score?: number | null;
  team2Score?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  tableId?: string | null;
  team1: AdminTournamentTeam | null;
  team2: AdminTournamentTeam | null;
  winnerTeam: AdminTournamentTeam | null;
}

export interface AdminTournament {
  id: string;
  name: string;
  description?: string | null;
  format: string;
  /** Дисциплина (тип стола) и подвид (тип игры). */
  discipline?: string | null;
  gameType?: string | null;
  /** Парный режим поверх обычной сетки (регистрация по одному, пары собирает организатор). */
  isPair?: boolean;
  /** Подпись из /admin/brackets (если загружена с сервера) */
  formatLabel?: string;
  status: string;
  clubId: string;
  ratingMax?: number | null;
  ratingSource?: "CLUB" | "SYSTEM";
  handicapHalfStep?: boolean;
  suppressNotifications?: boolean;
  tableIds?: unknown;
  tableStreams?: unknown;
  startsAt?: string | null;
  club: {
    name: string;
    id?: string;
    phone?: string;
    telegramId?: string | null;
    floorPlan?: unknown;
    tableCounts?: unknown;
    city?: { id: string; nameRu: string; country: { id: string; nameRu: string } };
  };
  registrations: AdminTournamentParticipant[];
  teams: AdminTournamentTeam[];
  matches: AdminTournamentMatch[];
  /** Лимиты участников для формата (из /admin/brackets). */
  participantRules?: BracketParticipantRules;
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

export function isTournamentBracketComplete(t: AdminTournament): boolean {
  if (t.matches.length === 0) return false;
  return t.matches.every(
    (m) =>
      m.status === "FINISHED" ||
      m.status === "WALKOVER" ||
      !!m.winnerTeam,
  );
}

export function canFinishTournament(t: AdminTournament): boolean {
  return t.status === "ACTIVE" && isTournamentBracketComplete(t);
}

export interface TournamentStandingRow {
  teamId?: string;
  place: number | null;
  /** Верхняя граница диапазона мест (если отличается от place). */
  placeTo?: number | null;
  label: string;
  city: string;
  rating: number;
  points?: number;
  note?: string;
}

/** Подпись места в протоколе: «5» или «9–12». */
export function formatTournamentStandingPlace(row: TournamentStandingRow): string {
  if (row.place == null) return "—";
  if (row.placeTo != null && row.placeTo !== row.place) {
    return `${row.place}–${row.placeTo}`;
  }
  return String(row.place);
}

/** Город для протокола: из профиля игрока или город клуба турнира. */
function protocolPlayerCity(
  t: AdminTournament,
  player: PlayerWithCity,
): string {
  return player.city?.nameRu ?? t.club.city?.nameRu ?? "—";
}

function protocolTeamCity(t: AdminTournament, team: AdminTournamentTeam): string {
  const c1 = protocolPlayerCity(t, team.player1);
  const c2 = team.player2 ? protocolPlayerCity(t, team.player2) : null;
  if (!c2 || c1 === c2) return c1;
  if (c1 === "—") return c2;
  return `${c1} / ${c2}`;
}

/** Команда из матча (без city в select) → полная из t.teams с городом. */
function teamForProtocol(
  t: AdminTournament,
  team: AdminTournamentTeam,
): AdminTournamentTeam {
  return t.teams.find((row) => row.id === team.id) ?? team;
}

function standingFromTeam(
  t: AdminTournament,
  team: AdminTournamentTeam,
  place: number | null,
  note?: string,
  placeTo?: number | null,
): TournamentStandingRow {
  const full = teamForProtocol(t, team);
  return {
    teamId: team.id,
    place,
    placeTo: placeTo ?? null,
    label: teamLabel(full as TeamWithPlayers),
    city: protocolTeamCity(t, full),
    rating: teamRating(full as TeamWithPlayers),
    note,
  };
}

function standingFromRegistration(
  t: AdminTournament,
  r: AdminTournamentParticipant,
  place: number | null,
  note?: string,
  placeTo?: number | null,
): TournamentStandingRow {
  return {
    place,
    placeTo: placeTo ?? null,
    label: `${r.player.lastName} ${r.player.firstName}`,
    city: protocolPlayerCity(t, r.player),
    rating: r.player.rating,
    note,
  };
}

/** Регистрации без solo-команды (после сетки или до ensureSoloTeams). */
function appendSoloRegistrationsWithoutTeams(
  t: AdminTournament,
  standings: TournamentStandingRow[],
): TournamentStandingRow[] {
  if (!isSoloFormat(t.format)) return standings;
  // В парном режиме участники турнира — пары (TournamentTeam), а регистрации —
  // отдельные игроки внутри пар. Не добавляем их в зачёт как «вне сетки».
  if (t.isPair) return standings;

  const inBracket = new Set(
    t.teams
      .filter((team) => team.status === "CONFIRMED")
      .map((team) => team.player1.id),
  );
  const extra = t.registrations
    .filter((r) => r.status === "CONFIRMED" && !inBracket.has(r.player.id))
    .sort((a, b) => b.player.rating - a.player.rating);

  if (extra.length === 0) return standings;

  const maxPlace =
    standings.reduce((max, row) => Math.max(max, row.place ?? 0), 0) || 0;
  let place = maxPlace + 1;
  const note =
    t.matches.length > 0 ? "вне сетки (нет команды в турнире)" : undefined;

  for (const r of extra) {
    standings.push(standingFromRegistration(t, r, place, note));
    place++;
  }
  return standings;
}

/** Итоговая таблица мест для протокола турнира. */
export function computeTournamentStandings(t: AdminTournament): TournamentStandingRow[] {
  if (isFixedSwissFormat(t.format)) {
    return computeFixedSwissStandings(t);
  }

  if (isPairFormat(t.format)) {
    if (isSwissPairFormat(t.format)) {
      return computeSwissStandings(t);
    }
    return computeOlympicStandings(t);
  }

  if (t.format === "SWISS") {
    return computeSwissStandings(t);
  }

  if (t.format === "OLYMPIC" || t.format === "OLYMPIC_1L_BRONZE") {
    return computeOlympicStandings(t);
  }

  const players = [...t.registrations.filter((r) => r.status === "CONFIRMED")].sort(
    (a, b) => b.player.rating - a.player.rating,
  );

  const hasBracket = t.matches.length > 0;
  return players.map((r, index) =>
    standingFromRegistration(
      t,
      r,
      index + 1,
      hasBracket ? undefined : "предварительно по рейтингу",
    ),
  );
}

function isFinishedMatch(m: AdminTournamentMatch): boolean {
  return m.status === "FINISHED" || m.status === "WALKOVER";
}

function matchLoserIds(m: AdminTournamentMatch): string[] {
  const winnerId = m.winnerTeamId ?? m.winnerTeam?.id;
  if (!winnerId) return [];
  const losers: string[] = [];
  const team1Id = m.team1Id ?? m.team1?.id;
  const team2Id = m.team2Id ?? m.team2?.id;
  if (team1Id && team1Id !== winnerId) losers.push(team1Id);
  if (team2Id && team2Id !== winnerId) losers.push(team2Id);
  return losers;
}

function prelimTeamsByRating(t: AdminTournament, note: string): TournamentStandingRow[] {
  return [...t.teams.filter((team) => team.status === "CONFIRMED")]
    .sort(
      (a, b) =>
        teamRating(b as TeamWithPlayers) - teamRating(a as TeamWithPlayers),
    )
    .map((team, index) => standingFromTeam(t, team, index + 1, note));
}

function computeFixedSwissStandings(t: AdminTournament): TournamentStandingRow[] {
  const matchCount = t.matches.length;
  const maxRound = t.matches.reduce((max, m) => Math.max(max, m.round), 0);

  if (matchCount === 0) {
    return prelimTeamsByRating(t, "предварительно по рейтингу");
  }

  const placed = new Map<string, { place: number; placeTo?: number }>();

  for (const m of t.matches) {
    const winnerTeamId = m.winnerTeamId ?? m.winnerTeam?.id;
    if (!isFinishedMatch(m) || !winnerTeamId) continue;

    let matchNo: number;
    try {
      matchNo = fixedSwissMatchNo(m.round, m.slot, matchCount, maxRound);
    } catch {
      continue;
    }

    const winnerPlace = fixedSwissProtocolPlace(matchNo, "winner", matchCount, maxRound);
    const loserPlace = fixedSwissProtocolPlace(matchNo, "loser", matchCount, maxRound);

    if (winnerPlace !== null) {
      placed.set(winnerTeamId, winnerPlace);
    }
    if (loserPlace !== null) {
      for (const loserId of matchLoserIds(m)) {
        placed.set(loserId, loserPlace);
      }
    }
  }

  const confirmed = t.teams.filter((team) => team.status === "CONFIRMED");
  const standings: TournamentStandingRow[] = [];

  for (const team of confirmed) {
    const result = placed.get(team.id);
    if (result !== undefined) {
      standings.push(
        standingFromTeam(t, team, result.place, undefined, result.placeTo ?? null),
      );
    }
  }

  standings.sort((a, b) => (a.place ?? 999) - (b.place ?? 999));

  const unplaced = confirmed
    .filter((team) => !placed.has(team.id))
    .sort(
      (a, b) =>
        teamRating(b as TeamWithPlayers) - teamRating(a as TeamWithPlayers),
    );

  for (const team of unplaced) {
    standings.push(standingFromTeam(t, team, null, "в игре"));
  }

  return appendSoloRegistrationsWithoutTeams(t, standings);
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
    return players.map((r, index) =>
      standingFromRegistration(t, r, index + 1, "предварительно по рейтингу"),
    );
  }

  const rows = teams.map((team, index) => ({
    ...standingFromTeam(t, team, index + 1),
    points: team.swissPoints ?? 0,
  }));
  return appendSoloRegistrationsWithoutTeams(t, rows);
}

function computeOlympicStandings(t: AdminTournament): TournamentStandingRow[] {
  const maxRound = t.matches.reduce((max, m) => Math.max(max, m.round), 0);
  if (maxRound === 0) {
    const prelim = [...t.teams.filter((team) => team.status === "CONFIRMED")]
      .sort(
        (a, b) =>
          teamRating(b as TeamWithPlayers) - teamRating(a as TeamWithPlayers),
      )
      .map((team, index) =>
        standingFromTeam(t, team, index + 1, "предварительно по рейтингу"),
      );
    return appendSoloRegistrationsWithoutTeams(t, prelim);
  }

  const standings: TournamentStandingRow[] = [];
  const placed = new Set<string>();

  function pushPlace(team: AdminTournamentTeam, place: number) {
    if (placed.has(team.id)) return;
    placed.add(team.id);
    standings.push(standingFromTeam(t, team, place));
  }

  const hasBronze = isOlympicBronzeFormat(t.format);

  const finalMatch = t.matches.find(
    (m) =>
      m.round === maxRound &&
      m.slot === 1 &&
      m.winnerTeam &&
      m.team1 &&
      m.team2,
  );
  if (finalMatch?.winnerTeam && finalMatch.team1 && finalMatch.team2) {
    pushPlace(finalMatch.winnerTeam, 1);
    const loser =
      finalMatch.winnerTeam.id === finalMatch.team1.id
        ? finalMatch.team2
        : finalMatch.team1;
    pushPlace(loser, 2);
  }

  if (hasBronze) {
    const bronzeMatch = t.matches.find(
      (m) =>
        m.round === maxRound &&
        m.slot === OLYMPIC_BRONZE_MATCH_SLOT &&
        m.winnerTeam &&
        m.team1 &&
        m.team2 &&
        isFinishedMatch(m),
    );
    if (bronzeMatch?.winnerTeam && bronzeMatch.team1 && bronzeMatch.team2) {
      pushPlace(bronzeMatch.winnerTeam, 3);
      const bronzeLoser =
        bronzeMatch.winnerTeam.id === bronzeMatch.team1.id
          ? bronzeMatch.team2
          : bronzeMatch.team1;
      pushPlace(bronzeLoser, 4);
    }
  }

  let nextPlace = standings.length + 1;
  const loserRoundStart = hasBronze ? maxRound - 2 : maxRound - 1;
  for (let round = loserRoundStart; round >= 1; round--) {
    const roundMatches = t.matches.filter(
      (m) =>
        m.round === round &&
        m.winnerTeam &&
        m.team1 &&
        m.team2 &&
        (m.status === "FINISHED" || m.status === "WALKOVER"),
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

  return appendSoloRegistrationsWithoutTeams(t, standings);
}

export const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Черновик" },
  { value: "PENDING_CLUB_APPROVAL", label: "Ожидает подтверждения клуба" },
  { value: "OPEN", label: "Открыта регистрация" },
  { value: "ACTIVE", label: "Идёт" },
  { value: "FINISHED", label: "Завершён" },
];

const playerWithCity = { include: { city: true } };

/** Без city — сотни вложенных join на сетке из 27–96 встреч сильно раздувают ответ API. */
const bracketPlayerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  middleName: true,
  rating: true,
  phone: true,
  telegramUsername: true,
} as const;

const bracketTeamInclude = {
  include: {
    player1: { select: bracketPlayerSelect },
    player2: { select: bracketPlayerSelect },
  },
};

export const tournamentAdminInclude = {
  club: { include: { city: { include: { country: true } } } },
  registrations: { include: { player: playerWithCity } },
  teams: {
    include: {
      player1: playerWithCity,
      player2: playerWithCity,
      club: true,
    },
    orderBy: [{ seed: "asc" as const }, { createdAt: "asc" as const }],
  },
  matches: {
    include: {
      team1: bracketTeamInclude,
      team2: bracketTeamInclude,
      winnerTeam: bracketTeamInclude,
    },
    orderBy: [{ round: "asc" as const }, { slot: "asc" as const }],
  },
};
