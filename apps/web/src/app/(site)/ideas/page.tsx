import { PageHeader, PageMain } from "@/components/site/page-header";
import { IdeasPageClient } from "@/components/site/ideas-page-client";
import { getCurrentPlayer } from "@/lib/auth";
import { buildPageMetadata, STATIC_PAGE_SEO } from "@/lib/seo";

export const metadata = buildPageMetadata(STATIC_PAGE_SEO.ideas);

export default async function IdeasPage() {
  const player = await getCurrentPlayer();

  return (
    <>
      <PageHeader
        title="Идеи"
        lead="Предлагайте улучшения для billiard.guru. Идеи проходят модерацию, после одобрения их видят все игроки."
      />
      <PageMain className="pt-0">
        <IdeasPageClient
          isLoggedIn={!!player}
          isVerified={!!player?.isVerified}
        />
      </PageMain>
    </>
  );
}
