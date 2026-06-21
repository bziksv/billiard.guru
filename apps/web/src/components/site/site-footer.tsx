import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FooterCookieNotice } from "@/components/site/legal/footer-cookie-notice";
import { SiteContainer } from "@/components/site/site-container";
import { getCurrentPlayer } from "@/lib/auth";
import { APP_NAME, TELEGRAM_BOT_USERNAME } from "@/lib/brand";
import { TelegramLink } from "@/lib/contact-links";
import { SITE_GUIDE_NAV, SITE_NAV_CTA, SITE_NAV_MAIN } from "@/lib/site";

const HOME_ANCHORS = [
  { href: "/#news", labelKey: "footer.home.news" },
  { href: "/#tournaments", labelKey: "footer.home.tournaments" },
  { href: "/#players", labelKey: "footer.home.players" },
  { href: "/#clubs", labelKey: "footer.home.clubs" },
] as const;

export async function SiteFooter() {
  const t = await getTranslations();
  const player = await getCurrentPlayer();

  return (
    <footer className="site-footer mt-auto">
      <div className="site-footer-glow" aria-hidden />

      <SiteContainer className="site-footer-main">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <Link href="/" className="site-footer-logo">
              {APP_NAME}
            </Link>
            <p className="site-footer-tagline">{t("footer.tagline")}</p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link href={SITE_NAV_CTA.href} className="site-footer-pokatat-btn">
                {t(SITE_NAV_CTA.labelKey)}
              </Link>
              {player ? (
                <Link href="/cabinet" className="site-footer-secondary-btn">
                  {t("nav.cabinet")}
                </Link>
              ) : (
                <Link href="/login" className="site-footer-secondary-btn">
                  {t("nav.login")}
                </Link>
              )}
            </div>
            <TelegramLink
              username={TELEGRAM_BOT_USERNAME}
              showIcon
              className="site-footer-telegram site-telegram-link"
            />
          </div>

          <div className="site-footer-columns">
            <nav className="site-footer-col" aria-label={t("footer.sections.playAria")}>
              <p className="site-footer-col-title">{t("footer.sections.play")}</p>
              <ul className="site-footer-links">
                {SITE_NAV_MAIN.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="site-footer-link">
                      {t(item.labelKey)}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={SITE_NAV_CTA.href} className="site-footer-link site-footer-link-cta">
                    {t(SITE_NAV_CTA.labelKey)}
                  </Link>
                </li>
              </ul>
            </nav>

            <nav className="site-footer-col" aria-label={t("footer.sections.guideAria")}>
              <p className="site-footer-col-title">{t("footer.sections.guide")}</p>
              <ul className="site-footer-links">
                {SITE_GUIDE_NAV.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="site-footer-link">
                      {t(item.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="site-footer-col" aria-label={t("footer.sections.homeAria")}>
              <p className="site-footer-col-title">{t("footer.sections.home")}</p>
              <ul className="site-footer-links">
                {HOME_ANCHORS.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="site-footer-link">
                      {t(item.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="site-footer-features">
          <span>{t("footer.features.tournaments")}</span>
          <span className="site-footer-dot" aria-hidden />
          <span>{t("footer.features.rating")}</span>
          <span className="site-footer-dot" aria-hidden />
          <span>{t("footer.features.tables")}</span>
          <span className="site-footer-dot" aria-hidden />
          <span>{t("footer.features.sparring")}</span>
        </div>
      </SiteContainer>

      <div className="site-footer-bottom">
        <SiteContainer className="site-footer-bottom-shell">
          <FooterCookieNotice />
          <div className="site-footer-bottom-inner">
            <p className="site-footer-copy">
              © {new Date().getFullYear()} {APP_NAME}
            </p>
          </div>
        </SiteContainer>
      </div>
    </footer>
  );
}
