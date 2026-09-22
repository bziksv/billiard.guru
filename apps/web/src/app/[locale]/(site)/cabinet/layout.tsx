import { buildLocalizedStaticMetadata } from "@/lib/seo-locale";
import { getCurrentPlayer } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedStaticMetadata("cabinet", locale);
}

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login?next=/cabinet");
  }
  return children;
}
