import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { HomeNewsGrid } from "@/components/home/home-news-grid";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { getCurrentPlayer } from "@/lib/auth";
import { loadNewsFeed } from "@/lib/home-data";
import type { GeoSearchParams } from "@/lib/site";
import { getLocale, getTranslations } from "next-intl/server";
import { buildLocalizedStaticMetadata } from "@/lib/seo-locale";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedStaticMetadata("news", locale);
}

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
  const t = await getTranslations("pages.news");
  const locale = (await getLocale()) as AppLocale;
  const rawParams = await searchParams;
  const player = await getCurrentPlayer();
  const geo = resolveGeo(
    rawParams,
    player?.cityId,
    player?.city.countryId,
  );

  const news = await loadNewsFeed(geo, {
    locale,
    networkLabel: t("network"),
  });

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />
      <PageMain className="space-y-8 pt-0">
        <Suspense fallback={<div className="site-skeleton h-24" />}>
          <GeoFilterBar basePath="/news" />
        </Suspense>
        {news.length === 0 ? (
          <HomeNewsGrid items={[]} />
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)]">
              {t("count", { count: news.length })}
            </p>
            <HomeNewsGrid items={news} />
          </>
        )}
        <p className="text-center">
          <Link href="/" className="site-btn-secondary inline-flex">
            {t("backHome")}
          </Link>
        </p>
      </PageMain>
    </>
  );
}
