import { Suspense } from "react";
import { HomeNewsGrid } from "@/components/home/home-news-grid";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { getCurrentPlayer } from "@/lib/auth";
import { loadNewsFeed } from "@/lib/home-data";
import type { GeoSearchParams } from "@/lib/site";
import { hrefWithGeo } from "@/lib/site";

function resolveGeo(
  params: GeoSearchParams,
  playerCityId?: string,
  playerCountryId?: string,
): GeoSearchParams {
  if (params.cityId || params.countryId) return params;
  if (playerCityId) {
    return { cityId: playerCityId, countryId: playerCountryId };
  }
  return {};
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<GeoSearchParams>;
}) {
  const rawParams = await searchParams;
  const player = await getCurrentPlayer();
  const geo = resolveGeo(
    rawParams,
    player?.cityId,
    player?.city.countryId,
  );

  const news = await loadNewsFeed(geo);

  return (
    <>
      <PageHeader
        title="Новости"
        lead="Обновления billiard.guru и анонсы клубов. Новости сервиса — для всех городов; клубные — с учётом выбранного региона."
      />
      <PageMain className="space-y-8 pt-0">
        <Suspense fallback={<div className="site-skeleton h-24" />}>
          <GeoFilterBar basePath="/news" />
        </Suspense>
        {news.length === 0 ? (
          <HomeNewsGrid items={[]} />
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)]">
              {news.length}{" "}
              {news.length === 1
                ? "новость"
                : news.length < 5
                  ? "новости"
                  : "новостей"}
            </p>
            <HomeNewsGrid items={news} />
          </>
        )}
        <p className="text-center">
          <a href={hrefWithGeo("/", geo)} className="site-btn-secondary inline-flex">
            ← На главную
          </a>
        </p>
      </PageMain>
    </>
  );
}
