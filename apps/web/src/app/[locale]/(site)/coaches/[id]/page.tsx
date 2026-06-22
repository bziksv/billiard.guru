import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ClubPhotoGallery } from "@/components/site/club-photo-gallery";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { LocalizedUserText } from "@/components/site/localized-user-text";
import type { AppLocale } from "@/i18n/routing";
import { TelegramLink } from "@/lib/contact-links";
import { parseCoachGalleryUrls } from "@/lib/coach-profile";
import { CoachReviewsSection } from "@/components/site/coach-reviews-section";
import { CoachReviewStars } from "@/components/site/coach-review-stars";
import { formatCoachReviewAvg } from "@/lib/coach-review-display";
import { formatGeoLocation } from "@/lib/geo-display";
import { localizedPlayerName } from "@/lib/latin-names";
import { formatRating } from "@/lib/rating";
import { getCurrentPlayer, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildLocalizedCoachDetailMetadata } from "@/lib/seo-locale";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations("detail.notFound");
  const coach = await prisma.player.findFirst({
    where: { id, isCoach: true, isVerified: true },
    include: { city: { include: { country: true } } },
  });
  if (!coach) return { title: t("coach") };
  const appLocale = locale as AppLocale;
  const cityLabel = coach.city
    ? formatGeoLocation(
        coach.city.nameRu,
        coach.city.country.nameRu,
        appLocale,
        coach.city.nameEn,
        coach.city.country.nameEn,
      )
    : null;
  return buildLocalizedCoachDetailMetadata(
    localizedPlayerName(appLocale, coach),
    cityLabel,
    id,
    locale,
  );
}

export default async function CoachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;

  const coach = await prisma.player.findFirst({
    where: { id, isCoach: true, isVerified: true },
    include: { city: { include: { country: true } } },
  });

  if (!coach) notFound();

  const session = await getSession();
  const viewer = await getCurrentPlayer();
  const isSelf = viewer?.id === coach.id;

  const gallery = parseCoachGalleryUrls(coach.coachGalleryUrls);
  const photos =
    gallery.length > 0 ? gallery : coach.photoUrl ? [coach.photoUrl] : [];

  return (
    <>
      <PageHeader title={localizedPlayerName(locale, coach)}>
        <Link href="/coaches" className="site-btn-ghost text-emerald-400">
          {t("detail.back.coaches")}
        </Link>
      </PageHeader>
      <PageMain className="space-y-8 pt-0">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <SiteCard className="overflow-hidden p-0">
            <ClubPhotoGallery photos={photos} alt={localizedPlayerName(locale, coach)} />
          </SiteCard>

          <SiteCard>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">{t("detail.coach.city")}</dt>
                <dd className="mt-1">
                  {formatGeoLocation(
                    coach.city.nameRu,
                    coach.city.country.nameRu,
                    locale,
                    coach.city.nameEn,
                    coach.city.country.nameEn,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("detail.coach.coachRating")}</dt>
                <dd className="mt-1">
                  {coach.coachReviewCount > 0 && coach.coachReviewAvg != null ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <CoachReviewStars score={coach.coachReviewAvg} />
                      <span className="font-mono text-lg text-emerald-400">
                        {formatCoachReviewAvg(coach.coachReviewAvg, coach.coachReviewCount)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {t("detail.player.reviewCount", { count: coach.coachReviewCount })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-500">{t("detail.player.noReviews")}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("detail.coach.playerRating")}</dt>
                <dd className="mt-1 font-mono text-sm text-zinc-400">{formatRating(coach.rating)}</dd>
              </div>
              {coach.telegramUsername && (
                <div className="sm:col-span-2">
                  <dt className="text-zinc-500">Telegram</dt>
                  <dd className="mt-1">
                    <TelegramLink username={coach.telegramUsername} showIcon />
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/players/${coach.id}`} className="site-btn-secondary text-sm">
                {t("detail.coach.playerProfile")}
              </Link>
            </div>
          </SiteCard>
        </div>

        <section>
          <h2 className="site-section-title mb-3">{t("detail.coach.about")}</h2>
          <SiteCard>
            {coach.coachBio?.trim() ? (
              <LocalizedUserText text={coach.coachBio} textEn={coach.coachBioEn} className="coach-bio" />
            ) : (
              <p className="text-sm text-zinc-500">{t("detail.coach.noBio")}</p>
            )}
          </SiteCard>
        </section>

        <CoachReviewsSection coachId={coach.id} loggedIn={Boolean(session)} isSelf={isSelf} />
      </PageMain>
    </>
  );
}
