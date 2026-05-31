import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/admin/status-badge";
import { ClubMap } from "@/components/site/club-map";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { TournamentCard } from "@/components/site/tournament-card";
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
            <div className="grid gap-0 md:grid-cols-[240px_minmax(0,1fr)]">
              <div className="relative min-h-[200px] bg-zinc-900 md:min-h-full">
                {club.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={club.photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-[200px] items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950 text-5xl text-zinc-700">
                    🎱
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={club.isVerified ? "CONFIRMED" : "PENDING"}
                    label={club.isVerified ? "Подтверждён" : "Ожидает Telegram"}
                  />
                  {club.tableCount != null && club.tableCount > 0 && (
                    <span className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-300">
                      {club.tableCount} столов
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-zinc-400">
                  {club.city.nameRu}, {club.city.country.nameRu}
                </p>
                {club.address && (
                  <p className="mt-1 text-sm text-zinc-500">{club.address}</p>
                )}
                {club.email && (
                  <p className="mt-2 text-sm">
                    <a href={`mailto:${club.email}`} className="text-emerald-400 hover:underline">
                      {club.email}
                    </a>
                  </p>
                )}
                {club.telegramUsername && (
                  <p className="mt-1 text-sm">
                    <a
                      href={`https://t.me/${club.telegramUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline"
                    >
                      @{club.telegramUsername}
                    </a>
                  </p>
                )}
                {club.description && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                    {club.description}
                  </p>
                )}
              </div>
            </div>
          </SiteCard>

          <SiteCard>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Режим работы
            </h2>
            {club.workingHours ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {club.workingHours}
              </p>
            ) : (
              <p className="text-sm text-zinc-500">График уточняйте у клуба.</p>
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
                    <time className="text-xs text-zinc-500">
                      {formatNewsDate(item.publishedAt)}
                    </time>
                    <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                      {item.body}
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
