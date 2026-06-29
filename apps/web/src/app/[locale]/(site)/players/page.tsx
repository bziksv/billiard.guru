import { Suspense } from "react";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { EmptyState } from "@/components/site/site-card";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatGeoLocation } from "@/lib/geo-display";
import { localizedPlayerName } from "@/lib/latin-names";
import { formatRating } from "@/lib/rating";
import {
  normalizePlayersPageSize,
  playerGeoWhere,
  playerSearchWhere,
} from "@/lib/public-queries";
import {
  PlayersPagination,
  PlayersSearchBar,
  PlayersSortHeader,
} from "@/components/site/players-list-controls";
import { computeWinRatesForPlayers } from "@/lib/player-stats";
import { prisma } from "@/lib/prisma";
import type { GeoSearchParams } from "@/lib/site";
import { getLocale, getTranslations } from "next-intl/server";
import { buildLocalizedStaticMetadata } from "@/lib/seo-locale";

type PlayersSearchParams = GeoSearchParams & {
  q?: string;
  size?: string;
  page?: string;
  sort?: string;
  dir?: string;
};

function formatWinRate(winRate: number | null | undefined): string {
  return winRate == null ? "—" : `${Math.round(winRate * 100)}%`;
}

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
  searchParams: Promise<PlayersSearchParams>;
}) {
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;
  const params = await searchParams;
  const size = normalizePlayersPageSize(params.size);
  // Показываем всех игроков, включая неподтверждённых (добавленных клубом) —
  // они уже видны в сетках турниров и статистике.
  const where = {
    ...playerGeoWhere(params, { verifiedOnly: false }),
    ...playerSearchWhere(params.q),
  };

  const total = await prisma.player.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, Number(params.page) || 1), pageCount);
  const skip = (page - 1) * size;

  const sortField = params.sort === "winrate" ? "winrate" : "rating";
  const sortDir = params.dir === "asc" ? "asc" : "desc";
  const playerInclude = { city: { include: { country: true } } } as const;

  let players: Awaited<
    ReturnType<typeof prisma.player.findMany<{ include: typeof playerInclude }>>
  >;
  let winRates: Awaited<ReturnType<typeof computeWinRatesForPlayers>>;

  if (sortField === "winrate") {
    // Сортировка по проценту побед требует расчёта по всему отфильтрованному
    // набору, затем берём страницу.
    const all = await prisma.player.findMany({
      where,
      include: playerInclude,
      orderBy: [{ rating: "desc" }, { lastName: "asc" }],
    });
    winRates = await computeWinRatesForPlayers(all.map((p) => p.id));
    const sorted = [...all].sort((a, b) => {
      const wa = winRates.get(a.id)?.winRate ?? null;
      const wb = winRates.get(b.id)?.winRate ?? null;
      // Игроки без сыгранных встреч — всегда в конце, независимо от направления.
      if (wa == null && wb == null) return b.rating - a.rating;
      if (wa == null) return 1;
      if (wb == null) return -1;
      const diff = wb - wa;
      const dirDiff = sortDir === "asc" ? -diff : diff;
      if (dirDiff !== 0) return dirDiff;
      return b.rating - a.rating;
    });
    players = sorted.slice(skip, skip + size);
  } else {
    players = await prisma.player.findMany({
      where,
      include: playerInclude,
      orderBy: [{ rating: sortDir }, { lastName: "asc" }],
      skip,
      take: size,
    });
    winRates = await computeWinRatesForPlayers(players.map((p) => p.id));
  }

  const from = total === 0 ? 0 : skip + 1;
  const to = skip + players.length;

  return (
    <>
      <PageHeader title={t("nav.players")} lead={t("pages.players.lead")} />
      <PageMain className="space-y-6 pt-0">
        <Suspense fallback={<div className="site-skeleton h-24" />}>
          <GeoFilterBar basePath="/players" />
        </Suspense>
        <PlayersSearchBar size={size} />
        {players.length === 0 ? (
          <EmptyState title={t("empty.players")} />
        ) : (
          <>
          <div className="site-card overflow-hidden">
            <table className="site-data-table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>{t("pages.players.columns.player")}</th>
                  <th>{t("pages.players.columns.city")}</th>
                  <th className="text-right">
                    <PlayersSortHeader
                      field="rating"
                      label={t("pages.players.columns.rating")}
                    />
                  </th>
                  <th className="text-right">
                    <PlayersSortHeader
                      field="winrate"
                      label={t("pages.players.columns.winRate")}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => (
                  <tr key={player.id}>
                    <td className="home-card-muted">{skip + index + 1}</td>
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
                    <td className="text-right font-mono text-[var(--text-muted)]">
                      {formatWinRate(winRates.get(player.id)?.winRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PlayersPagination
            page={page}
            pageCount={pageCount}
            from={from}
            to={to}
            total={total}
          />
          </>
        )}
      </PageMain>
    </>
  );
}
