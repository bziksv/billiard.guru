import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubPhotoGallery } from "@/components/site/club-photo-gallery";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { TelegramLink } from "@/lib/contact-links";
import { parseCoachGalleryUrls } from "@/lib/coach-profile";
import { formatRating } from "@/lib/rating";
import { playerName } from "@/lib/public-display";
import { prisma } from "@/lib/prisma";

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
                <dt className="text-zinc-500">Рейтинг</dt>
                <dd className="mt-1 font-mono text-lg text-emerald-400">
                  {formatRating(coach.rating)}
                </dd>
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
      </PageMain>
    </>
  );
}
