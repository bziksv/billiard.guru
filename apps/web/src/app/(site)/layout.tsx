import Link from "next/link";
import { PreviewBannerSlot } from "@/components/site/preview-banner-slot";
import { SiteDevBanner } from "@/components/site/site-dev-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site-main flex min-h-screen flex-col">
      <div className="sticky top-0 z-40">
        <SiteDevBanner />
        <PreviewBannerSlot />
        <SiteHeader />
      </div>
      <div className="flex-1 bg-transparent">{children}</div>
      <SiteFooter />
    </div>
  );
}
