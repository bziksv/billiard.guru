import { formatRating } from "@/lib/rating";
import type { PlayerSelectSource } from "@/lib/player-select-label";
import { formatPlayerSelectLabel } from "@/lib/player-select-label";
import type { TeamWithPlayers } from "@/lib/pair-tournament";

export type TournamentRatingSource = "CLUB" | "SYSTEM";

export const TOURNAMENT_RATING_SOURCE_OPTIONS: {
  value: TournamentRatingSource;
  label: string;
}[] = [
  { value: "SYSTEM", label: "Общий рейтинг" },
  { value: "CLUB", label: "Рейтинг клуба" },
];

export function tournamentRatingSourceLabel(
  source: TournamentRatingSource = "SYSTEM",
): string {
  return source === "CLUB" ? "рейтинг клуба" : "общий рейтинг";
}

export function tournamentRatingSourceHint(
  source: TournamentRatingSource = "SYSTEM",
): string {
  return source === "CLUB"
    ? "Сначала рейтинг в клубе, при отсутствии — общий. Обычно лучше общий рейтинг."
    : "Только общий рейтинг игрока, клубный не учитывается.";
}

/** Рейтинг для лимита турнира с учётом выбранного источника. */
export function effectiveTournamentPlayerRating(
  systemRating: number,
  clubRating: number | null | undefined,
  source: TournamentRatingSource = "SYSTEM",
): number {
  if (source === "SYSTEM") return systemRating;
  return clubRating ?? systemRating;
}

/** Рейтинг команды/участника для форы с учётом источника рейтинга турнира. */
export function teamTournamentRating(
  team: TeamWithPlayers,
  ratingSource: TournamentRatingSource = "SYSTEM",
  clubPlayerRatings?: Record<string, number>,
): number {
  const r1 = effectiveTournamentPlayerRating(
    team.player1.rating,
    clubPlayerRatings?.[team.player1.id],
    ratingSource,
  );
  if (!team.player2) return r1;
  const r2 = effectiveTournamentPlayerRating(
    team.player2.rating,
    clubPlayerRatings?.[team.player2.id],
    ratingSource,
  );
  return r1 + r2;
}

export function applyTournamentRatingsToTeam<T extends TeamWithPlayers>(
  team: T | null,
  ratingSource: TournamentRatingSource = "SYSTEM",
  clubPlayerRatings?: Record<string, number>,
): T | null {
  if (!team) return null;
  const mapPlayer = <P extends TeamWithPlayers["player1"]>(player: P): P => ({
    ...player,
    rating: effectiveTournamentPlayerRating(
      player.rating,
      clubPlayerRatings?.[player.id],
      ratingSource,
    ),
  });
  return {
    ...team,
    player1: mapPlayer(team.player1),
    player2: team.player2 ? mapPlayer(team.player2) : team.player2,
  };
}

/** matchId → playerId → рейтинг на старте встречи (RatingChange.oldRating). */
export type MatchStartRatingsMap = Record<string, Record<string, number>>;

export type MatchStartRatingChangeRow = {
  matchId: string;
  playerId: string;
  oldRating: number;
  newRating: number;
  /** Время завершения/создания матча, по которому идёт запись. */
  atMs: number;
};

export type MatchPlayersForStartRating = {
  id: string;
  atMs: number;
  playerIds: string[];
};

/**
 * Для встреч без RatingChange (автопроход / bye) восстанавливает рейтинг
 * на момент слота из истории изменений в том же турнире.
 *
 * — если до этой встречи уже были rated-матчи → берём newRating последнего;
 * — иначе → oldRating первой rated-встречи игрока в турнире (как на старте).
 */
export function fillMissingMatchStartRatings(
  matches: MatchPlayersForStartRating[],
  changes: MatchStartRatingChangeRow[],
  existing: MatchStartRatingsMap = {},
): MatchStartRatingsMap {
  const out: MatchStartRatingsMap = {};
  for (const [matchId, byPlayer] of Object.entries(existing)) {
    out[matchId] = { ...byPlayer };
  }

  const byPlayer = new Map<string, MatchStartRatingChangeRow[]>();
  for (const row of changes) {
    const list = byPlayer.get(row.playerId);
    if (list) list.push(row);
    else byPlayer.set(row.playerId, [row]);
  }
  for (const list of byPlayer.values()) {
    list.sort((a, b) => a.atMs - b.atMs || a.matchId.localeCompare(b.matchId));
  }

  for (const match of matches) {
    const slot = (out[match.id] ??= {});
    for (const playerId of match.playerIds) {
      if (slot[playerId] != null) continue;
      const history = byPlayer.get(playerId);
      if (!history?.length) continue;

      let prior: MatchStartRatingChangeRow | undefined;
      for (const row of history) {
        if (row.matchId === match.id) continue;
        if (row.atMs < match.atMs) prior = row;
      }
      if (prior) {
        slot[playerId] = prior.newRating;
      } else {
        slot[playerId] = history[0]!.oldRating;
      }
    }
  }

  return out;
}

/**
 * Подставляет рейтинг на момент встречи (для сетки/форы по уже сыгранным матчам).
 * Для CLUB не трогаем — авторейтинг пишет общий Player.rating, не клубный.
 */
export function applyMatchStartRatingsToTeam<T extends TeamWithPlayers>(
  team: T | null,
  matchId: string,
  matchStartRatings?: MatchStartRatingsMap | null,
  ratingSource: TournamentRatingSource = "SYSTEM",
): T | null {
  if (!team || !matchStartRatings || ratingSource === "CLUB") return team;
  const byPlayer = matchStartRatings[matchId];
  if (!byPlayer) return team;

  const mapPlayer = <P extends TeamWithPlayers["player1"]>(player: P): P => {
    const start = byPlayer[player.id];
    return start == null ? player : { ...player, rating: start };
  };

  return {
    ...team,
    player1: mapPlayer(team.player1),
    player2: team.player2 ? mapPlayer(team.player2) : team.player2,
  };
}

/** Подставляет эффективный рейтинг турнира (клубный / общий) во всех игроках. */
export function applyTournamentRatingsToPlayers<
  T extends {
    registrations?: { player: { id: string; rating: number } }[];
    teams: TeamWithPlayers[];
    matches: {
      team1: TeamWithPlayers | null;
      team2: TeamWithPlayers | null;
      winnerTeam: TeamWithPlayers | null;
    }[];
    ratingSource?: TournamentRatingSource;
  },
>(tournament: T, clubPlayerRatings: Record<string, number> = {}): T {
  const source = tournament.ratingSource ?? "SYSTEM";
  const mapPlayer = <P extends { id: string; rating: number }>(player: P): P => ({
    ...player,
    rating: effectiveTournamentPlayerRating(
      player.rating,
      clubPlayerRatings[player.id],
      source,
    ),
  });
  const mapTeam = <Team extends TeamWithPlayers>(team: Team): Team =>
    applyTournamentRatingsToTeam(team, source, clubPlayerRatings) ?? team;

  return {
    ...tournament,
    registrations: (tournament.registrations ?? []).map((r) => ({
      ...r,
      player: mapPlayer(r.player),
    })),
    teams: tournament.teams.map(mapTeam),
    matches: tournament.matches.map((m) => ({
      ...m,
      team1: m.team1 ? mapTeam(m.team1) : null,
      team2: m.team2 ? mapTeam(m.team2) : null,
      winnerTeam: m.winnerTeam ? mapTeam(m.winnerTeam) : null,
    })),
  };
}

export function playerExceedsTournamentRatingMax(
  systemRating: number,
  ratingMax: number | null | undefined,
  clubRating?: number | null,
  source: TournamentRatingSource = "SYSTEM",
): boolean {
  if (ratingMax == null) return false;
  return (
    effectiveTournamentPlayerRating(systemRating, clubRating, source) > ratingMax
  );
}

/** Подпись игрока в селекте регистрации — с рейтингом, который реально проверяется. */
export function formatTournamentPlayerSelectLabel(
  player: PlayerSelectSource,
  clubRating: number | null | undefined,
  source: TournamentRatingSource = "SYSTEM",
): string {
  const effective = effectiveTournamentPlayerRating(
    player.rating,
    clubRating,
    source,
  );
  const base = formatPlayerSelectLabel({ ...player, rating: effective });
  if (source === "CLUB" && clubRating != null && clubRating !== player.rating) {
    return `${base} · общий ${formatRating(player.rating)}`;
  }
  if (
    source === "SYSTEM" &&
    clubRating != null &&
    clubRating !== player.rating
  ) {
    return `${base} · клуб ${formatRating(clubRating)}`;
  }
  return base;
}

/** Краткое описание лимита рейтинга и правил форы турнира. */
export function formatTournamentRatingRulesSummary(tournament: {
  ratingMax?: number | null;
  handicapHalfStep?: boolean;
  handicapEvenExtraCancelOnFirstLoss?: boolean;
  ratingSource?: TournamentRatingSource;
}): string {
  const parts: string[] = [];
  if (tournament.ratingMax != null) {
    parts.push(
      `макс. ${tournamentRatingSourceLabel(tournament.ratingSource ?? "SYSTEM")} ${formatRating(tournament.ratingMax)}`,
    );
  } else {
    parts.push("без лимита по рейтингу");
  }
  if (tournament.handicapHalfStep !== false) {
    parts.push(
      tournament.handicapEvenExtraCancelOnFirstLoss
        ? "фора с шагом 0,5; +1 в чётных снимается, если отдающий проиграет 1-ю"
        : "фора с учётом шага 0,5",
    );
  } else {
    parts.push("фора без шага 0,5 (рейтинг вниз до целого)");
  }
  return parts.join(" · ");
}
