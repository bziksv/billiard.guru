import { Suspense } from "react";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { CoachCard } from "@/components/site/coach-card";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { EmptyState } from "@/components/site/site-card";
import { coachGeoWhere, coachListInclude, coachListOrderBy } from "@/lib/public-queries";
import { prisma } from "@/lib/prisma";
import type { GeoSearchParams } from "@/lib/site";
import { getTranslations } from "next-intl/server";
import { buildLocalizedStaticMetadata } from "@/lib/seo-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedStaticMetadata("coaches", locale);
}

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<GeoSearchParams>;
}) {
  const t = await getTranslations();
  const geo = await searchParams;
  const coaches = await prisma.player.findMany({
    where: coachGeoWhere(geo),
    include: coachListInclude,
    orderBy: [...coachListOrderBy],
  });

  return (
    <>
      <PageHeader title={t("nav.coaches")} lead={t("pages.coaches.lead")} />
      <PageMain className="space-y-6 pt-0">
        <Suspense fallback={<div className="site-skeleton h-24" />}>
          <GeoFilterBar basePath="/coaches" />
        </Suspense>
        {coaches.length === 0 ? (
          <EmptyState
            title={t("empty.coaches")}
            description={t("pages.coaches.emptyDescription")}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.map((coach) => (
              <li key={coach.id}>
                <CoachCard coach={coach} href={`/coaches/${coach.id}`} />
              </li>
            ))}
          </ul>
        )}
      </PageMain>
    </>
  );
}
