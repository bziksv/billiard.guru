import { formatE164Display } from "@/lib/phone";
import { formatRating } from "@/lib/rating";

export type PlayerSelectSource = {
  firstName: string;
  lastName: string;
  rating: number;
  phone?: string | null;
  city?: { nameRu: string; country?: { nameRu: string } | null } | null;
};

/** Подпись игрока в SearchableSelect / SearchableMultiSelect. */
export function formatPlayerSelectLabel(player: PlayerSelectSource): string {
  const name = `${player.lastName} ${player.firstName}`.trim();
  const chunks: string[] = [name];

  if (player.city?.nameRu) {
    chunks.push(player.city.nameRu);
  }

  if (player.phone) {
    chunks.push(formatE164Display(player.phone, player.city?.country?.nameRu));
  }

  chunks.push(`рейтинг ${formatRating(player.rating)}`);
  return chunks.join(" · ");
}
