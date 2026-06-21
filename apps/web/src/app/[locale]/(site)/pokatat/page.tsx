import { Suspense } from "react";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { PokatatPageClient } from "@/components/site/pokatat-page-client";
import { getCurrentPlayer } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { buildLocalizedStaticMetadata } from "@/lib/seo-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedStaticMetadata("pokatat", locale);
}

export default async function PokatatPage() {
  const t = await getTranslations();
  const player = await getCurrentPlayer();

  return (
    <>
      <PageHeader title={t("nav.pokatat")} lead={t("pages.pokatat.lead")} />
      <PageMain className="space-y-6 pt-0">
        <Suspense fallback={<div className="site-skeleton h-24" />}>
          <GeoFilterBar basePath="/pokatat" />
        </Suspense>
        <Suspense fallback={<p className="text-sm text-zinc-500">{t("pages.pokatat.loading")}</p>}>
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
