import Link from "next/link";
import { Suspense } from "react";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { EmptyState } from "@/components/site/site-card";
import { formatRating } from "@/lib/rating";
import { playerName } from "@/lib/public-display";
import { playerGeoWhere } from "@/lib/public-queries";
import { prisma } from "@/lib/prisma";
import type { GeoSearchParams } from "@/lib/site";
import { t } from "@/lib/site";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<GeoSearchParams>;
}) {
  const geo = await searchParams;
  const players = await prisma.player.findMany({
    where: playerGeoWhere(geo),
    include: { city: { include: { country: true } } },
    orderBy: [{ rating: "desc" }, { lastName: "asc" }],
  });

  return (
    <>
      <PageHeader
        title={t("nav.players")}
        lead="Рейтинг подтверждённых игроков. Фильтр по региону — для локальных сообществ."
      />
      <PageMain className="space-y-6 pt-0">
        <Suspense fallback={<div className="h-24 rounded-2xl bg-zinc-900/50" />}>
          <GeoFilterBar basePath="/players" />
        </Suspense>
        {players.length === 0 ? (
          <EmptyState title={t("empty.players")} />
        ) : (
          <div className="site-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/80 text-zinc-400">
                <tr>
                  <th className="w-12 px-4 py-3">#</th>
                  <th className="px-4 py-3">Игрок</th>
                  <th className="px-4 py-3">Город</th>
                  <th className="px-4 py-3 text-right">Рейтинг</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => (
                  <tr key={player.id} className="border-t border-zinc-800/80">
                    <td className="px-4 py-3 text-zinc-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/players/${player.id}`}
                        className="flex items-center gap-3 hover:text-emerald-400"
                      >
                        {player.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={player.photoUrl}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs">
                            {player.firstName[0]}
                          </div>
                        )}
                        <span className="font-medium">{playerName(player)}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {player.city.nameRu}, {player.city.country.nameRu}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400">
                      {formatRating(player.rating)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageMain>
    </>
  );
}
