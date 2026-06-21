import { localizedGeoName } from "@/lib/geo-display";
import type { AppLocale } from "@/i18n/routing";
import type { PublicTournamentListItem } from "@/lib/tournament-public-read";

export function filterTournamentsByQuery(
  tournaments: PublicTournamentListItem[],
  query: string,
  formatLabels: Record<string, string>,
  locale: AppLocale = "ru",
): PublicTournamentListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return tournaments;

  return tournaments.filter((t) => {
    const cityRu = t.club.city.nameRu;
    const countryRu = t.club.city.country?.nameRu;
    const haystack = [
      t.name,
      t.description,
      t.club.name,
      cityRu,
      countryRu,
      localizedGeoName(cityRu, "en"),
      countryRu ? localizedGeoName(countryRu, "en") : null,
      formatLabels[t.format] ?? t.format,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}
