import { Suspense } from "react";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { ClubCard } from "@/components/site/club-card";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { EmptyState } from "@/components/site/site-card";
import { getCurrentPlayer } from "@/lib/auth";
import { getNearbyCityIds, NOTIFY_RADIUS_KM } from "@/lib/geo";
import {
  clubCityIdsWhere,
  clubGeoWhere,
  clubListInclude,
  clubListOrderBy,
  resolveGeoForPlayer,
} from "@/lib/public-queries";
import { prisma } from "@/lib/prisma";
import type { GeoSearchParams } from "@/lib/site";
import { t } from "@/lib/site";
import { buildPageMetadata, STATIC_PAGE_SEO } from "@/lib/seo";

export const metadata = buildPageMetadata(STATIC_PAGE_SEO.clubs);

function ClubList({
  clubs,
}: {
  clubs: Awaited<
    ReturnType<typeof prisma.club.findMany<{ include: typeof clubListInclude }>>
  >;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {clubs.map((club) => (
        <li key={club.id}>
          <ClubCard club={club} href={`/clubs/${club.id}`} />
        </li>
      ))}
    </ul>
  );
}

export default async function ClubsPage({
  searchParams,
}: {
  searchParams: Promise<GeoSearchParams>;
}) {
  const rawParams = await searchParams;
  const player = await getCurrentPlayer();
  const hasManualGeo = Boolean(rawParams.cityId || rawParams.countryId);
  const usePlayerSections = Boolean(player && !hasManualGeo);

  if (usePlayerSections && player) {
    const allCities = await prisma.city.findMany({
      select: { id: true, latitude: true, longitude: true },
    });
    const nearbyCityIds = getNearbyCityIds(
      {
        id: player.city.id,
        latitude: player.city.latitude,
        longitude: player.city.longitude,
      },
      allCities,
      NOTIFY_RADIUS_KM,
    ).filter((id) => id !== player.cityId);

    const [localClubs, nearbyClubs] = await Promise.all([
      prisma.club.findMany({
        where: clubGeoWhere({ cityId: player.cityId }),
        include: clubListInclude,
        orderBy: clubListOrderBy,
      }),
      nearbyCityIds.length > 0
        ? prisma.club.findMany({
            where: clubCityIdsWhere(nearbyCityIds),
            include: clubListInclude,
            orderBy: clubListOrderBy,
          })
        : Promise.resolve([]),
    ]);

    const nothingFound = localClubs.length === 0 && nearbyClubs.length === 0;

    return (
      <>
        <PageHeader
          title={t("nav.clubs")}
          lead={`Сначала клубы в вашем городе (${player.city.nameRu}), ниже — в соседних городах в радиусе ${NOTIFY_RADIUS_KM} км.`}
        />
        <PageMain className="space-y-8 pt-0">
          <Suspense fallback={<div className="site-skeleton h-24" />}>
            <GeoFilterBar basePath="/clubs" />
          </Suspense>

          {nothingFound ? (
            <EmptyState title={t("empty.clubs")} />
          ) : (
            <>
              <section className="space-y-4">
                <h2 className="site-page-subtitle">
                  В вашем городе
                  <span className="home-card-muted ml-2 text-base font-normal">
                    {player.city.nameRu}
                  </span>
                </h2>
                {localClubs.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    В {player.city.nameRu} пока нет клубов на платформе.
                  </p>
                ) : (
                  <ClubList clubs={localClubs} />
                )}
              </section>

              {nearbyClubs.length > 0 && (
                <section className="space-y-4">
                  <h2 className="site-page-subtitle">
                    Рядом
                    <span className="home-card-muted ml-2 text-base font-normal">
                      соседние города
                    </span>
                  </h2>
                  <ClubList clubs={nearbyClubs} />
                </section>
              )}
            </>
          )}
        </PageMain>
      </>
    );
  }

  const geo = resolveGeoForPlayer(
    rawParams,
    player?.cityId,
    player?.city.countryId,
  );
  const clubs = await prisma.club.findMany({
    where: clubGeoWhere(geo),
    include: clubListInclude,
    orderBy: clubListOrderBy,
  });

  return (
    <>
      <PageHeader
        title={t("nav.clubs")}
        lead="Бильярдные клубы на платформе. Выберите регион — увидите локальные площадки."
      />
      <PageMain className="space-y-6 pt-0">
        <Suspense fallback={<div className="site-skeleton h-24" />}>
          <GeoFilterBar basePath="/clubs" />
        </Suspense>
        {clubs.length === 0 ? (
          <EmptyState title={t("empty.clubs")} />
        ) : (
          <ClubList clubs={clubs} />
        )}
      </PageMain>
    </>
  );
}
