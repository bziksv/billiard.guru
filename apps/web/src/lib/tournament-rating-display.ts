import { formatRating } from "@/lib/rating";
import type { PlayerSelectSource } from "@/lib/player-select-label";
import { formatPlayerSelectLabel } from "@/lib/player-select-label";

/** Рейтинг для лимита турнира: клубный, если задан, иначе общий. */
export function effectiveTournamentPlayerRating(
  systemRating: number,
  clubRating?: number | null,
): number {
  return clubRating ?? systemRating;
}

export function playerExceedsTournamentRatingMax(
  systemRating: number,
  ratingMax: number | null | undefined,
  clubRating?: number | null,
): boolean {
  if (ratingMax == null) return false;
  return effectiveTournamentPlayerRating(systemRating, clubRating) > ratingMax;
}

/** Подпись игрока в селекте регистрации — с рейтингом, который реально проверяется. */
export function formatTournamentPlayerSelectLabel(
  player: PlayerSelectSource,
  clubRating?: number | null,
): string {
  const effective = effectiveTournamentPlayerRating(player.rating, clubRating);
  const base = formatPlayerSelectLabel({ ...player, rating: effective });
  if (clubRating != null && clubRating !== player.rating) {
    return `${base} · общий ${formatRating(player.rating)}`;
  }
  return base;
}

/** Краткое описание лимита рейтинга и правил форы турнира. */
export function formatTournamentRatingRulesSummary(tournament: {
  ratingMax?: number | null;
  handicapHalfStep?: boolean;
}): string {
  const parts: string[] = [];
  if (tournament.ratingMax != null) {
    parts.push(`макс. рейтинг ${formatRating(tournament.ratingMax)}`);
  } else {
    parts.push("без лимита по рейтингу");
  }
  parts.push(
    tournament.handicapHalfStep !== false
      ? "фора с учётом шага 0,5"
      : "фора без шага 0,5 (только целая часть разницы)",
  );
  return parts.join(" · ");
}
