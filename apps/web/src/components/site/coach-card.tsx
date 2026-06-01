import { SiteCard } from "@/components/site/site-card";
import { coachCoverPhoto, coachTeaser } from "@/lib/coach-profile";
import { formatRating } from "@/lib/rating";
import { playerName } from "@/lib/public-display";

export type CoachListItem = {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  rating: number;
  photoUrl: string | null;
  coachBio: string | null;
  coachGalleryUrls?: unknown;
  city: { nameRu: string; country: { nameRu: string } };
};

export function CoachCard({ coach, href }: { coach: CoachListItem; href: string }) {
  const cover = coachCoverPhoto(coach);
  const teaser = coachTeaser(coach.coachBio);

  return (
    <SiteCard href={href} className="coach-card overflow-hidden p-0">
      <div className="coach-card-cover relative aspect-[4/3] w-full bg-[var(--bg-muted)]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl opacity-60">
            🎓
          </div>
        )}
        <span className="coach-card-rating absolute right-3 top-3 rounded-lg bg-black/55 px-2 py-1 font-mono text-sm font-semibold text-emerald-300 backdrop-blur-sm">
          {formatRating(coach.rating)}
        </span>
      </div>
      <div className="p-4">
        <h3 className="home-card-title font-semibold">{playerName(coach)}</h3>
        <p className="home-card-muted mt-1 text-xs">
          {coach.city.nameRu}, {coach.city.country.nameRu}
        </p>
        <p className="coach-card-teaser mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {teaser}
        </p>
        <p className="mt-3 text-xs font-medium text-emerald-600">Подробнее →</p>
      </div>
    </SiteCard>
  );
}
