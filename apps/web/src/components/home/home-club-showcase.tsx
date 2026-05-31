import Link from "next/link";

type ClubItem = {
  id: string;
  name: string;
  isVerified: boolean;
  city: { nameRu: string; country: { nameRu: string } };
  _count?: { tournaments: number };
};

/** Стабильный «рейтинг» для визуала до появления оценок в БД. */
function previewRating(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 1000;
  return (4 + (h % 10) / 10).toFixed(1);
}

function Stars({ rating }: { rating: string }) {
  const full = Math.floor(Number(rating));
  return (
    <span className="text-amber-500" aria-label={`Рейтинг ${rating}`}>
      {"★".repeat(full)}
      <span className="text-zinc-300">{"★".repeat(5 - full)}</span>
    </span>
  );
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
        const rating = previewRating(club.id);
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
              <div className="flex items-center gap-2 text-sm">
                <Stars rating={rating} />
                <span className="home-card-body font-mono">{rating}</span>
                <span className="home-card-muted text-[10px]">(скоро)</span>
              </div>
              <div className="home-card-muted flex gap-3 text-xs">
                <span>от 800 ₽/ч</span>
                {club._count && <span>{club._count.tournaments} турн.</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
