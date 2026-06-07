import { formatRating } from "@/lib/rating";
import type { PlayerSelectSource } from "@/lib/player-select-label";
import { formatPlayerSelectLabel } from "@/lib/player-select-label";

export type TournamentRatingSource = "CLUB" | "SYSTEM";

export const TOURNAMENT_RATING_SOURCE_OPTIONS: {
  value: TournamentRatingSource;
  label: string;
}[] = [
  { value: "CLUB", label: "Рейтинг клуба" },
  { value: "SYSTEM", label: "Общий рейтинг" },
];

export function tournamentRatingSourceLabel(
  source: TournamentRatingSource = "CLUB",
): string {
  return source === "CLUB" ? "рейтинг клуба" : "общий рейтинг";
}

export function tournamentRatingSourceHint(
  source: TournamentRatingSource = "CLUB",
): string {
  return source === "CLUB"
    ? "Сначала рейтинг в клубе, при отсутствии — общий."
    : "Только общий рейтинг игрока, клубный не учитывается.";
}

/** Рейтинг для лимита турнира с учётом выбранного источника. */
export function effectiveTournamentPlayerRating(
  systemRating: number,
  clubRating: number | null | undefined,
  source: TournamentRatingSource = "CLUB",
): number {
  if (source === "SYSTEM") return systemRating;
  return clubRating ?? systemRating;
}

export function playerExceedsTournamentRatingMax(
  systemRating: number,
  ratingMax: number | null | undefined,
  clubRating?: number | null,
  source: TournamentRatingSource = "CLUB",
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
  source: TournamentRatingSource = "CLUB",
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
  ratingSource?: TournamentRatingSource;
}): string {
  const parts: string[] = [];
  if (tournament.ratingMax != null) {
    parts.push(
      `макс. ${tournamentRatingSourceLabel(tournament.ratingSource ?? "CLUB")} ${formatRating(tournament.ratingMax)}`,
    );
  } else {
    parts.push("без лимита по рейтингу");
  }
  parts.push(
    tournament.handicapHalfStep !== false
      ? "фора с учётом шага 0,5"
      : "фора без шага 0,5 (рейтинг вниз до целого)",
  );
  return parts.join(" · ");
}
