import { RulesIndexPage } from "@/components/site/rules-index-page";
import { buildLocalizedStaticMetadata } from "@/lib/seo-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedStaticMetadata("rules", locale);
}

export default function BilliardRulesPage() {
  return <RulesIndexPage />;
}
