import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site-main flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1 bg-transparent">{children}</div>
      <SiteFooter />
    </div>
  );
}
