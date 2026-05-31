import { Suspense } from "react";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { EmptyState } from "@/components/site/site-card";
import { TournamentCard } from "@/components/site/tournament-card";
import { getCurrentPlayer } from "@/lib/auth";
import { getNearbyCityIds, NOTIFY_RADIUS_KM } from "@/lib/geo";
import {
  resolveGeoForPlayer,
  tournamentCityIdsWhere,
  tournamentGeoWhere,
  tournamentListInclude,
  tournamentListOrderBy,
} from "@/lib/public-queries";
import { prisma } from "@/lib/prisma";
import type { GeoSearchParams } from "@/lib/site";
import { t } from "@/lib/site";

function TournamentList({
  tournaments,
}: {
  tournaments: Awaited<
    ReturnType<
      typeof prisma.tournament.findMany<{ include: typeof tournamentListInclude }>
    >
  >;
}) {
  return (
    <ul className="space-y-4">
      {tournaments.map((tournament) => (
        <li key={tournament.id}>
          <TournamentCard
            tournament={tournament}
            href={`/tournaments/${tournament.id}`}
          />
        </li>
      ))}
    </ul>
  );
}

export default async function TournamentsPage({
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

    const [localTournaments, nearbyTournaments] = await Promise.all([
      prisma.tournament.findMany({
        where: tournamentGeoWhere({ cityId: player.cityId }),
        include: tournamentListInclude,
        orderBy: tournamentListOrderBy,
      }),
      nearbyCityIds.length > 0
        ? prisma.tournament.findMany({
            where: tournamentCityIdsWhere(nearbyCityIds),
            include: tournamentListInclude,
            orderBy: tournamentListOrderBy,
          })
        : Promise.resolve([]),
    ]);

    const nothingFound =
      localTournaments.length === 0 && nearbyTournaments.length === 0;

    return (
      <>
        <PageHeader
          title={t("nav.tournaments")}
          lead={`Сначала турниры в вашем городе (${player.city.nameRu}), ниже — в соседних городах в радиусе ${NOTIFY_RADIUS_KM} км.`}
        />
        <PageMain className="space-y-8 pt-0">
          <Suspense fallback={<div className="h-24 rounded-2xl bg-zinc-900/50" />}>
            <GeoFilterBar basePath="/tournaments" />
          </Suspense>

          {nothingFound ? (
            <EmptyState title={t("empty.tournaments")} />
          ) : (
            <>
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-100">
                  В вашем городе
                  <span className="ml-2 text-base font-normal text-zinc-500">
                    {player.city.nameRu}
                  </span>
                </h2>
                {localTournaments.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    В {player.city.nameRu} пока нет опубликованных турниров.
                  </p>
                ) : (
                  <TournamentList tournaments={localTournaments} />
                )}
              </section>

              {nearbyTournaments.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-lg font-semibold text-zinc-100">
                    Рядом
                    <span className="ml-2 text-base font-normal text-zinc-500">
                      соседние города
                    </span>
                  </h2>
                  <TournamentList tournaments={nearbyTournaments} />
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
  const tournaments = await prisma.tournament.findMany({
    where: tournamentGeoWhere(geo),
    include: tournamentListInclude,
    orderBy: tournamentListOrderBy,
  });

  return (
    <>
      <PageHeader
        title={t("nav.tournaments")}
        lead="Открытая регистрация, текущие и завершённые турниры. Фильтруйте по стране и городу."
      />
      <PageMain className="space-y-6 pt-0">
        <Suspense fallback={<div className="h-24 rounded-2xl bg-zinc-900/50" />}>
          <GeoFilterBar basePath="/tournaments" />
        </Suspense>
        {tournaments.length === 0 ? (
          <EmptyState title={t("empty.tournaments")} />
        ) : (
          <TournamentList tournaments={tournaments} />
        )}
      </PageMain>
    </>
  );
}
