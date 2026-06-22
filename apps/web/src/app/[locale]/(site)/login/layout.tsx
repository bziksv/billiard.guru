import { buildLocalizedStaticMetadata } from "@/lib/seo-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedStaticMetadata("login", locale);
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
