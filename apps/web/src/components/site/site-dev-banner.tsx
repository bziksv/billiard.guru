import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteContainer } from "@/components/site/site-container";

export async function SiteDevBanner() {
  const t = await getTranslations("devBanner");

  return (
    <div className="site-dev-banner" role="status">
      <SiteContainer className="py-2 text-center text-xs leading-snug sm:py-2.5 sm:text-sm">
        <span className="site-dev-banner-label">{t("label")}</span>
        <span className="hidden sm:inline">{t("desktopBeforeLink")}</span>
        <span className="sm:hidden">{t("mobileBeforeLink")}</span>
        <Link href="/login" className="site-dev-banner-link">
          {t("register")}
        </Link>
        <span className="hidden sm:inline">{t("desktopAfterLink")}</span>
        <span className="sm:hidden">{t("mobileAfterLink")}</span>
      </SiteContainer>
    </div>
  );
}
