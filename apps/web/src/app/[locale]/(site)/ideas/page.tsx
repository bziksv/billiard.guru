import { PageHeader, PageMain } from "@/components/site/page-header";
import { IdeasPageClient } from "@/components/site/ideas-page-client";
import { getCurrentPlayer } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { buildLocalizedStaticMetadata } from "@/lib/seo-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedStaticMetadata("ideas", locale);
}

export default async function IdeasPage() {
  const t = await getTranslations();
  const player = await getCurrentPlayer();

  return (
    <>
      <PageHeader title={t("nav.ideas")} lead={t("pages.ideas.lead")} />
      <PageMain className="pt-0">
        <IdeasPageClient
          isLoggedIn={!!player}
          isVerified={!!player?.isVerified}
        />
      </PageMain>
    </>
  );
}
