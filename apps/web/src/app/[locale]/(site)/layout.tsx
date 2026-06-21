import { CookieConsentPopup } from "@/components/site/legal/cookie-consent";
import { EnLocaleContentGuard } from "@/components/site/locale-switcher";
import { PreviewBannerSlot } from "@/components/site/preview-banner-slot";
import { SiteDevBanner } from "@/components/site/site-dev-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { PageviewBeacon } from "@/components/analytics/pageview-beacon";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site-main flex min-h-screen flex-col">
      <div className="site-top-shell sticky top-0 z-40">
        <SiteDevBanner />
        <PreviewBannerSlot />
        <SiteHeader />
      </div>
      <div className="site-content-shell flex-1 bg-transparent">
        <EnLocaleContentGuard>{children}</EnLocaleContentGuard>
      </div>
      <SiteFooter />
      <CookieConsentPopup />
      <PageviewBeacon surface="MARKETING" />
    </div>
  );
}
