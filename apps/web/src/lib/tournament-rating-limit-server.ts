import { formatRating } from "@/lib/rating";
import { prisma } from "@/lib/prisma";
import {
  applyTournamentRatingsToPlayers,
  effectiveTournamentPlayerRating,
  type TournamentRatingSource,
} from "@/lib/tournament-rating-display";
import type { TeamWithPlayers } from "@/lib/pair-tournament";

export function playerRatingExceedsTournamentMax(
  effectiveRating: number,
  ratingMax: number | null | undefined,
): boolean {
  if (ratingMax == null) return false;
  return effectiveRating > ratingMax;
}

export function tournamentRatingLimitMessage(ratingMax: number): string {
  return `Рейтинг выше лимита турнира (до ${formatRating(ratingMax)}). Запись недоступна.`;
}

export async function getEffectivePlayerRatingForTournament(
  playerId: string,
  clubId: string,
  systemRating: number,
  source: TournamentRatingSource = "SYSTEM",
): Promise<number> {
  if (source === "SYSTEM") return systemRating;
  const row = await prisma.clubPlayerRating.findUnique({
    where: { clubId_playerId: { clubId, playerId } },
    select: { rating: true },
  });
  return effectiveTournamentPlayerRating(systemRating, row?.rating, source);
}

/** playerId → клубный рейтинг для турнира клуба. */
export async function loadClubPlayerRatingsMap(
  clubId: string,
  playerIds?: string[],
): Promise<Record<string, number>> {
  const rows = await prisma.clubPlayerRating.findMany({
    where: {
      clubId,
      ...(playerIds && playerIds.length > 0
        ? { playerId: { in: playerIds } }
        : {}),
    },
    select: { playerId: true, rating: true },
  });
  return Object.fromEntries(rows.map((r) => [r.playerId, r.rating]));
}

/** Для API управления турниром: эффективные рейтинги + карта клубных. */
export async function withTournamentEffectiveRatings<
  T extends {
    clubId: string;
    ratingSource?: TournamentRatingSource;
    registrations: { player: { id: string; rating: number } }[];
    teams: TeamWithPlayers[];
    matches: {
      team1: TeamWithPlayers | null;
      team2: TeamWithPlayers | null;
      winnerTeam: TeamWithPlayers | null;
    }[];
  },
>(tournament: T): Promise<T & { clubPlayerRatings: Record<string, number> }> {
  const clubPlayerRatings = await loadClubPlayerRatingsMap(tournament.clubId);
  const rated = applyTournamentRatingsToPlayers(tournament, clubPlayerRatings);
  return { ...rated, clubPlayerRatings };
}

export async function assertPlayerEligibleForTournamentRating(
  playerId: string,
  tournament: {
    clubId: string;
    ratingMax: number | null;
    ratingSource?: TournamentRatingSource;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (tournament.ratingMax == null) return { ok: true };

  const source = tournament.ratingSource ?? "SYSTEM";

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { rating: true, firstName: true, lastName: true },
  });
  if (!player) return { ok: false, error: "Игрок не найден" };

  const clubRow = await prisma.clubPlayerRating.findUnique({
    where: {
      clubId_playerId: { clubId: tournament.clubId, playerId },
    },
    select: { rating: true },
  });
  const effective = effectiveTournamentPlayerRating(
    player.rating,
    clubRow?.rating,
    source,
  );
  if (playerRatingExceedsTournamentMax(effective, tournament.ratingMax)) {
    const name = `${player.lastName} ${player.firstName}`.trim();
    const ratingPart =
      source === "SYSTEM"
        ? `общий рейтинг ${formatRating(effective)}`
        : clubRow != null && clubRow.rating !== player.rating
          ? `клубный рейтинг ${formatRating(effective)} (общий ${formatRating(player.rating)})`
          : `рейтинг ${formatRating(effective)}`;
    return {
      ok: false,
      error: `${name}: ${ratingPart} выше лимита турнира (до ${formatRating(tournament.ratingMax)}). Запись недоступна.`,
    };
  }
  return { ok: true };
}

type PlayerWithSystemRating = { id: string; rating: number };

/** Фильтр для рассылки «турнир рядом» и списков кандидатов. */
export async function filterPlayersByTournamentRatingMax<T extends PlayerWithSystemRating>(
  players: T[],
  clubId: string,
  ratingMax: number | null | undefined,
  source: TournamentRatingSource = "SYSTEM",
): Promise<{ eligible: T[]; skippedByRating: number }> {
  if (ratingMax == null || players.length === 0) {
    return { eligible: players, skippedByRating: 0 };
  }

  const clubRatings =
    source === "CLUB"
      ? await prisma.clubPlayerRating.findMany({
          where: {
            clubId,
            playerId: { in: players.map((p) => p.id) },
          },
          select: { playerId: true, rating: true },
        })
      : [];
  const clubRatingByPlayer = new Map(clubRatings.map((r) => [r.playerId, r.rating]));

  const eligible: T[] = [];
  let skippedByRating = 0;
  for (const player of players) {
    const effective = effectiveTournamentPlayerRating(
      player.rating,
      clubRatingByPlayer.get(player.id),
      source,
    );
    if (playerRatingExceedsTournamentMax(effective, ratingMax)) {
      skippedByRating += 1;
      continue;
    }
    eligible.push(player);
  }
  return { eligible, skippedByRating };
}
