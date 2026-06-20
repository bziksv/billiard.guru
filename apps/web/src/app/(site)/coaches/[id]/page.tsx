import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ClubPhotoGallery } from "@/components/site/club-photo-gallery";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { TelegramLink } from "@/lib/contact-links";
import { parseCoachGalleryUrls } from "@/lib/coach-profile";
import { CoachReviewsSection } from "@/components/site/coach-reviews-section";
import { CoachReviewStars } from "@/components/site/coach-review-stars";
import { coachReviewLabel, formatCoachReviewAvg } from "@/lib/coach-review-display";
import { formatRating } from "@/lib/rating";
import { getCurrentPlayer, getSession } from "@/lib/auth";
import { playerName } from "@/lib/public-display";
import { prisma } from "@/lib/prisma";
import { coachDetailMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const coach = await prisma.player.findFirst({
    where: { id, isCoach: true, isVerified: true },
    include: { city: true },
  });
  if (!coach) return { title: "Тренер не найден" };
  return coachDetailMetadata(playerName(coach), coach.city?.nameRu ?? null, id);
}

export default async function CoachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
      <PageHeader title={playerName(coach)}>
        <Link href="/coaches" className="site-btn-ghost text-emerald-400">
          ← Тренеры
        </Link>
      </PageHeader>
      <PageMain className="space-y-8 pt-0">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <SiteCard className="overflow-hidden p-0">
            <ClubPhotoGallery photos={photos} alt={playerName(coach)} />
          </SiteCard>

          <SiteCard>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Город</dt>
                <dd className="mt-1">
                  {coach.city.nameRu}, {coach.city.country.nameRu}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Оценка как тренер</dt>
                <dd className="mt-1">
                  {coach.coachReviewCount > 0 && coach.coachReviewAvg != null ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <CoachReviewStars score={coach.coachReviewAvg} />
                      <span className="font-mono text-lg text-emerald-400">
                        {formatCoachReviewAvg(coach.coachReviewAvg, coach.coachReviewCount)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {coachReviewLabel(coach.coachReviewCount)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-500">Пока нет оценок</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Игровой рейтинг</dt>
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
                Профиль игрока
              </Link>
            </div>
          </SiteCard>
        </div>

        <section>
          <h2 className="site-section-title mb-3">О тренере</h2>
          <SiteCard>
            {coach.coachBio?.trim() ? (
              <div className="coach-bio whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                {coach.coachBio.trim()}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Описание пока не добавлено.</p>
            )}
          </SiteCard>
        </section>

        <CoachReviewsSection coachId={coach.id} loggedIn={Boolean(session)} isSelf={isSelf} />
      </PageMain>
    </>
  );
}
