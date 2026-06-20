import { Suspense } from "react";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { PokatatPageClient } from "@/components/site/pokatat-page-client";
import { getCurrentPlayer } from "@/lib/auth";
import { t } from "@/lib/site";
import { buildPageMetadata, STATIC_PAGE_SEO } from "@/lib/seo";

export const metadata = buildPageMetadata(STATIC_PAGE_SEO.pokatat);

export default async function PokatatPage() {
  const player = await getCurrentPlayer();

  return (
    <>
      <PageHeader
        title={t("nav.pokatat")}
        lead="Найдите партнёра для спарринга или соперника под свой рейтинг. Разово или на постоянке — публикуйте, когда и где хотите поиграть."
      />
      <PageMain className="space-y-6 pt-0">
        <Suspense fallback={<div className="site-skeleton h-24" />}>
          <GeoFilterBar basePath="/pokatat" />
        </Suspense>
        <Suspense fallback={<p className="text-sm text-zinc-500">Загрузка…</p>}>
          <PokatatPageClient
            isLoggedIn={!!player}
            isVerified={!!player?.isVerified}
            defaultCityId={player?.cityId}
          />
        </Suspense>
      </PageMain>
    </>
  );
}
