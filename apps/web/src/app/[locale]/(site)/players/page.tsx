import { Suspense } from "react";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { EmptyState } from "@/components/site/site-card";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatGeoLocation } from "@/lib/geo-display";
import { localizedPlayerName } from "@/lib/latin-names";
import { formatRating } from "@/lib/rating";
import { playerGeoWhere } from "@/lib/public-queries";
import { prisma } from "@/lib/prisma";
import type { GeoSearchParams } from "@/lib/site";
import { getLocale, getTranslations } from "next-intl/server";
import { buildLocalizedStaticMetadata } from "@/lib/seo-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedStaticMetadata("players", locale);
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<GeoSearchParams>;
}) {
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;
  const geo = await searchParams;
  const players = await prisma.player.findMany({
    where: playerGeoWhere(geo),
    include: { city: { include: { country: true } } },
    orderBy: [{ rating: "desc" }, { lastName: "asc" }],
  });

  return (
    <>
      <PageHeader title={t("nav.players")} lead={t("pages.players.lead")} />
      <PageMain className="space-y-6 pt-0">
        <Suspense fallback={<div className="site-skeleton h-24" />}>
          <GeoFilterBar basePath="/players" />
        </Suspense>
        {players.length === 0 ? (
          <EmptyState title={t("empty.players")} />
        ) : (
          <div className="site-card overflow-hidden">
            <table className="site-data-table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>{t("pages.players.columns.player")}</th>
                  <th>{t("pages.players.columns.city")}</th>
                  <th className="text-right">{t("pages.players.columns.rating")}</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => (
                  <tr key={player.id}>
                    <td className="home-card-muted">{index + 1}</td>
                    <td>
                      <Link
                        href={`/players/${player.id}`}
                        className="flex items-center gap-3 hover:text-emerald-600"
                      >
                        {player.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={player.photoUrl}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-muted)] text-xs">
                            {player.firstName[0]}
                          </div>
                        )}
                        <span className="font-medium">{localizedPlayerName(locale, player)}</span>
                      </Link>
                    </td>
                    <td className="home-card-body">
                      {formatGeoLocation(
                        player.city.nameRu,
                        player.city.country.nameRu,
                        locale,
                        player.city.nameEn,
                        player.city.country.nameEn,
                      )}
                    </td>
                    <td className="text-right font-mono text-emerald-600">
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
