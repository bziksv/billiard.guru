import { RulesIndexPage } from "@/components/site/rules-index-page";
import { buildPageMetadata, STATIC_PAGE_SEO } from "@/lib/seo";

export const metadata = buildPageMetadata(STATIC_PAGE_SEO.rules);

export default function BilliardRulesPage() {
  return <RulesIndexPage />;
}
