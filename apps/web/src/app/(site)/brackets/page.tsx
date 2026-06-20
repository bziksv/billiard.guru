import { BracketsIndexPage } from "@/components/site/brackets-index-page";
import { getPublicEnabledBracketFormats } from "@/lib/bracket-formats/public-formats";
import { buildPageMetadata, STATIC_PAGE_SEO } from "@/lib/seo";

export const metadata = buildPageMetadata(STATIC_PAGE_SEO.brackets);

export const revalidate = 3600;

export default async function TournamentBracketsPage() {
  const enabledFormats = await getPublicEnabledBracketFormats();

  return <BracketsIndexPage enabledFormats={enabledFormats} />;
}
