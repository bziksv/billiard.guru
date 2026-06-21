import { buildLocalizedStaticMetadata } from "@/lib/seo-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedStaticMetadata("cabinet", locale);
}

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
