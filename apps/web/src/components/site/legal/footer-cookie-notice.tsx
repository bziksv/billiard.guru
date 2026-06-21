import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LEGAL_URLS } from "@/lib/legal";

export async function FooterCookieNotice() {
  const t = await getTranslations("cookie.footer");

  return (
    <p className="site-footer-legal-note">
      {t("beforeCookies")}
      <Link href={LEGAL_URLS.cookies} className="site-footer-legal-link">
        {t("cookiesLink")}
      </Link>
      {t("and")}
      <Link href={LEGAL_URLS.recommendationTechnologies} className="site-footer-legal-link">
        {t("recommendationLink")}
      </Link>
      {t("middle")}
      <Link href={LEGAL_URLS.privacy} className="site-footer-legal-link">
        {t("privacyLink")}
      </Link>
      {t("after")}
    </p>
  );
}
