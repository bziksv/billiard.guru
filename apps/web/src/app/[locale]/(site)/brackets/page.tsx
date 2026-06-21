import { BracketsIndexPage } from "@/components/site/brackets-index-page";
import { getPublicEnabledBracketFormats } from "@/lib/bracket-formats/public-formats";
import { buildLocalizedStaticMetadata } from "@/lib/seo-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedStaticMetadata("brackets", locale);
}

export const revalidate = 3600;

export default async function TournamentBracketsPage() {
  const enabledFormats = await getPublicEnabledBracketFormats();

  return <BracketsIndexPage enabledFormats={enabledFormats} />;
}
