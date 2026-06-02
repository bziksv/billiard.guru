import Link from "next/link";
import { SiteContainer } from "@/components/site/site-container";
import { getCurrentPlayer } from "@/lib/auth";
import { APP_NAME, TELEGRAM_BOT_USERNAME } from "@/lib/brand";
import { TelegramLink } from "@/lib/contact-links";
import { SITE_GUIDE_NAV, SITE_NAV_CTA, SITE_NAV_MAIN, t } from "@/lib/site";

const HOME_ANCHORS = [
  { href: "/#news", label: "Новости" },
  { href: "/#tournaments", label: "Турниры на главной" },
  { href: "/#players", label: "Рейтинг на главной" },
  { href: "/#clubs", label: "Клубы на главной" },
] as const;

export async function SiteFooter() {
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
            <nav className="site-footer-col" aria-label="Разделы игры">
              <p className="site-footer-col-title">Игра</p>
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

            <nav className="site-footer-col" aria-label="Справочник">
              <p className="site-footer-col-title">Справочник</p>
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

            <nav className="site-footer-col" aria-label="Главная страница">
              <p className="site-footer-col-title">На главной</p>
              <ul className="site-footer-links">
                {HOME_ANCHORS.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="site-footer-link">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="site-footer-features">
          <span>Турниры</span>
          <span className="site-footer-dot" aria-hidden />
          <span>Рейтинг</span>
          <span className="site-footer-dot" aria-hidden />
          <span>Бронь столов</span>
          <span className="site-footer-dot" aria-hidden />
          <span>Спарринг-партнёр</span>
        </div>
      </SiteContainer>

      <div className="site-footer-bottom">
        <SiteContainer className="site-footer-bottom-inner">
          <p className="site-footer-copy">
            © {new Date().getFullYear()} {APP_NAME}
          </p>
          <div className="site-footer-bottom-links">
            <Link href="/rules" className="site-footer-bottom-link">
              Правила
            </Link>
            <Link href="/pokatat" className="site-footer-bottom-link site-footer-bottom-link-accent">
              Покатать
            </Link>
            <Link
              href={player ? "/cabinet" : "/login"}
              className="site-footer-bottom-link"
            >
              {player ? t("nav.cabinet") : t("nav.login")}
            </Link>
          </div>
        </SiteContainer>
      </div>
    </footer>
  );
}
