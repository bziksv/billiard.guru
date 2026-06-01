import { SiteCard } from "@/components/site/site-card";
import { coachCoverPhoto, coachTeaser } from "@/lib/coach-profile";
import { formatCoachReviewAvg } from "@/lib/coach-review-display";
import { CoachReviewStars } from "@/components/site/coach-review-stars";
import { playerName } from "@/lib/public-display";

export type CoachListItem = {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  coachReviewAvg: number | null;
  coachReviewCount: number;
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
        {coach.coachReviewCount > 0 && coach.coachReviewAvg != null && (
          <div className="coach-card-rating absolute right-3 top-3 flex flex-col items-end gap-0.5 rounded-lg bg-black/60 px-2 py-1.5 backdrop-blur-sm">
            <CoachReviewStars score={coach.coachReviewAvg} size="sm" />
            <span className="font-mono text-xs font-semibold text-emerald-300">
              {formatCoachReviewAvg(coach.coachReviewAvg, coach.coachReviewCount)}
            </span>
          </div>
        )}
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
