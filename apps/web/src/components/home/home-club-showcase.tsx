import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedGeoName } from "@/lib/geo-display";
import type { AppLocale } from "@/i18n/routing";

type ClubItem = {
  id: string;
  name: string;
  isVerified: boolean;
  gamePrice?: string | null;
  city: { nameRu: string; nameEn?: string | null; country: { nameRu: string; nameEn?: string | null } };
  _count?: { tournaments: number };
};

function priceLabel(gamePrice: string | null | undefined) {
  if (!gamePrice?.trim()) return null;
  const firstLine = gamePrice.split("\n")[0]?.trim();
  if (!firstLine) return null;
  return firstLine.length > 48 ? `${firstLine.slice(0, 47)}…` : firstLine;
}

function tournamentLabel(
  count: number,
  t: Awaited<ReturnType<typeof getTranslations>>,
): string {
  if (count === 1) return t("home.clubs.tournamentOne");
  if (count >= 2 && count <= 4) return t("home.clubs.tournamentFew");
  return t("home.clubs.tournamentMany");
}

export async function HomeClubShowcase({ clubs }: { clubs: ClubItem[] }) {
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;

  if (clubs.length === 0) {
    return (
      <p className="home-content-card rounded-2xl px-6 py-12 text-center home-card-muted">
        {t("home.clubs.empty")}
      </p>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {clubs.map((club) => {
        const price = priceLabel(club.gamePrice);
        const tournamentCount = club._count?.tournaments ?? 0;

        return (
          <Link
            key={club.id}
            href={`/clubs/${club.id}`}
            className="home-content-card-solid home-card-glow group overflow-hidden rounded-2xl"
          >
            <div className="home-club-header relative h-36">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute left-6 top-6 h-16 w-16 rounded-full border border-emerald-300/40 bg-emerald-50/80" />
                <div className="absolute bottom-4 right-8 h-10 w-10 rounded-full border border-amber-300/40 bg-amber-50/80" />
              </div>
              <div className="home-club-header-fade absolute bottom-0 left-0 right-0 p-4 pt-12">
                <h3 className="home-card-title text-lg font-semibold group-hover:text-emerald-600">
                  {club.name}
                </h3>
                <p className="home-card-muted text-sm">
                  {localizedGeoName(club.city.nameRu, locale, club.city.nameEn)},{" "}
                  {localizedGeoName(club.city.country.nameRu, locale, club.city.country.nameEn)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-4 py-3">
              <div className="home-card-muted flex flex-wrap gap-3 text-xs">
                {price && <span>{price}</span>}
                {club.isVerified && (
                  <span className="text-emerald-600/90">{t("home.clubs.verified")}</span>
                )}
              </div>
              <div className="home-card-muted text-xs">
                {tournamentCount > 0 ? (
                  <span>
                    {tournamentCount} {tournamentLabel(tournamentCount, t)}
                  </span>
                ) : (
                  <span>{t("home.clubs.booking")}</span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
