import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/admin/status-badge";
import { ClubMap } from "@/components/site/club-map";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { TournamentCard } from "@/components/site/tournament-card";
import { ClubPhotoGallery } from "@/components/site/club-photo-gallery";
import { LinkifiedText } from "@/components/site/linkified-text";
import { PhoneLink, TelegramLink } from "@/lib/contact-links";
import { clubPhotoUrls } from "@/lib/club-photos";
import { PUBLIC_TOURNAMENT_STATUSES } from "@/lib/public-display";
import {
  tournamentListInclude,
  tournamentListOrderBy,
} from "@/lib/public-queries";
import { prisma } from "@/lib/prisma";

function formatNewsDate(date: Date) {
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const club = await prisma.club.findUnique({
    where: { id },
    include: {
      city: { include: { country: true } },
      news: { orderBy: { publishedAt: "desc" }, take: 20 },
      tournaments: {
        where: { status: { in: [...PUBLIC_TOURNAMENT_STATUSES] } },
        include: tournamentListInclude,
        orderBy: tournamentListOrderBy,
      },
    },
  });

  if (!club) notFound();

  const mapLat = club.latitude ?? club.city.latitude;
  const mapLng = club.longitude ?? club.city.longitude;
  const upcoming = club.tournaments.filter((t) => t.status !== "FINISHED");
  const past = club.tournaments.filter((t) => t.status === "FINISHED");
  const photos = clubPhotoUrls(club);

  return (
    <>
      <PageHeader title={club.name}>
        <Link href="/clubs" className="site-btn-ghost text-emerald-400">
          ← Клубы
        </Link>
      </PageHeader>
      <PageMain className="space-y-8 pt-0">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <SiteCard className="overflow-hidden p-0">
            <ClubPhotoGallery photos={photos} alt={club.name} />
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={club.isVerified ? "CONFIRMED" : "PENDING"}
                    label={club.isVerified ? "Подтверждён" : "Ожидает Telegram"}
                  />
                  {club.tableCount != null && club.tableCount > 0 && (
                    <span className="site-meta-chip">{club.tableCount} столов</span>
                  )}
                </div>
                <p className="home-card-body mt-3 text-sm">
                  {club.city.nameRu}, {club.city.country.nameRu}
                </p>
                {club.address && (
                  <p className="home-card-muted mt-1 text-sm">{club.address}</p>
                )}
                {club.phone && (
                  <p className="mt-2 text-sm">
                    <PhoneLink phone={club.phone} />
                  </p>
                )}
                {club.email && (
                  <p className="mt-2 text-sm">
                    <a href={`mailto:${club.email}`} className="text-emerald-600 hover:underline dark:text-emerald-400">
                      {club.email}
                    </a>
                  </p>
                )}
                {club.telegramUsername && (
                  <p className="mt-1 text-sm">
                    <TelegramLink username={club.telegramUsername} />
                  </p>
                )}
                {club.description && (
                  <p className="home-card-body mt-4 whitespace-pre-wrap text-sm leading-relaxed">
                    <LinkifiedText text={club.description} />
                  </p>
                )}
            </div>
          </SiteCard>

          <SiteCard>
            <h2 className="home-card-muted mb-3 text-sm font-semibold uppercase tracking-wider">
              Режим работы
            </h2>
            {club.workingHours ? (
              <p className="home-card-body whitespace-pre-wrap text-sm leading-relaxed">
                <LinkifiedText text={club.workingHours} />
              </p>
            ) : (
              <p className="home-card-muted text-sm">График уточняйте у клуба.</p>
            )}
          </SiteCard>
        </div>

        <section>
          <h2 className="site-section-title mb-4">На карте</h2>
          <SiteCard>
            <ClubMap
              name={club.name}
              address={club.address}
              latitude={mapLat}
              longitude={mapLng}
              cityName={club.city.nameRu}
            />
          </SiteCard>
        </section>

        {club.news.length > 0 && (
          <section>
            <h2 className="site-section-title mb-4">Новости клуба</h2>
            <ul className="space-y-4">
              {club.news.map((item) => (
                <li key={item.id}>
                  <SiteCard>
                    <time className="home-card-muted text-xs">
                      {formatNewsDate(item.publishedAt)}
                    </time>
                    <h3 className="home-card-title mt-1 text-lg font-semibold">{item.title}</h3>
                    <p className="home-card-body mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                      <LinkifiedText text={item.body} />
                    </p>
                  </SiteCard>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="site-section-title mb-4">Текущие турниры</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-zinc-500">Сейчас нет открытых или идущих турниров.</p>
          ) : (
            <ul className="space-y-4">
              {upcoming.map((t) => (
                <li key={t.id}>
                  <TournamentCard tournament={t} href={`/tournaments/${t.id}`} compact />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="site-section-title mb-4">Прошедшие турниры</h2>
          {past.length === 0 ? (
            <p className="text-sm text-zinc-500">Завершённых турниров пока нет.</p>
          ) : (
            <ul className="space-y-4">
              {past.map((t) => (
                <li key={t.id}>
                  <TournamentCard tournament={t} href={`/tournaments/${t.id}`} compact />
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageMain>
    </>
  );
}
