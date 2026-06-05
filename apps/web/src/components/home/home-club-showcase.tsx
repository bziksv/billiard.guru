import Link from "next/link";

type ClubItem = {
  id: string;
  name: string;
  isVerified: boolean;
  gamePrice?: string | null;
  city: { nameRu: string; country: { nameRu: string } };
  _count?: { tournaments: number };
};

function priceLabel(gamePrice: string | null | undefined) {
  if (!gamePrice?.trim()) return null;
  const firstLine = gamePrice.split("\n")[0]?.trim();
  if (!firstLine) return null;
  return firstLine.length > 48 ? `${firstLine.slice(0, 47)}…` : firstLine;
}

export function HomeClubShowcase({ clubs }: { clubs: ClubItem[] }) {
  if (clubs.length === 0) {
    return (
      <p className="home-content-card rounded-2xl px-6 py-12 text-center home-card-muted">
        Клубы скоро появятся в вашем регионе.
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
                  {club.city.nameRu}, {club.city.country.nameRu}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-4 py-3">
              <div className="home-card-muted flex flex-wrap gap-3 text-xs">
                {price && <span>{price}</span>}
                {club.isVerified && (
                  <span className="text-emerald-600/90">подтверждён</span>
                )}
              </div>
              <div className="home-card-muted text-xs">
                {tournamentCount > 0 ? (
                  <span>
                    {tournamentCount}{" "}
                    {tournamentCount === 1
                      ? "турнир"
                      : tournamentCount < 5
                        ? "турнира"
                        : "турниров"}
                  </span>
                ) : (
                  <span>бронь столов</span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
