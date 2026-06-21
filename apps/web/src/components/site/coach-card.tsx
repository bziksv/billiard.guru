import { getLocale, getTranslations } from "next-intl/server";
import { LocalizedUserText } from "@/components/site/localized-user-text";
import { SiteCard } from "@/components/site/site-card";
import { coachCoverPhoto } from "@/lib/coach-profile";
import { formatCoachReviewAvg } from "@/lib/coach-review-display";
import { CoachReviewStars } from "@/components/site/coach-review-stars";
import type { AppLocale } from "@/i18n/routing";
import { formatGeoLocation } from "@/lib/geo-display";
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
  coachBioEn?: string | null;
  coachGalleryUrls?: unknown;
  city: {
    nameRu: string;
    nameEn?: string | null;
    country: { nameRu: string; nameEn?: string | null };
  };
};

export async function CoachCard({ coach, href }: { coach: CoachListItem; href: string }) {
  const t = await getTranslations("detail.coach");
  const locale = (await getLocale()) as AppLocale;
  const cover = coachCoverPhoto(coach);

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
          {formatGeoLocation(
            coach.city.nameRu,
            coach.city.country.nameRu,
            locale,
            coach.city.nameEn,
            coach.city.country.nameEn,
          )}
        </p>
        {coach.coachBio?.trim() ? (
          <div className="coach-card-teaser mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            <LocalizedUserText text={coach.coachBio} textEn={coach.coachBioEn} />
          </div>
        ) : null}
        <p className="mt-3 text-xs font-medium text-emerald-600">{t("moreLink")}</p>
      </div>
    </SiteCard>
  );
}
