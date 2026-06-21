"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { SiteThemeToggle } from "@/components/site/site-theme-toggle";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { SITE_GUIDE_NAV, SITE_NAV_CTA, SITE_NAV_MAIN } from "@/lib/site";

function NavLink({
  href,
  label,
  active,
  onClick,
  className,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn("site-nav-link", active && "site-nav-link-active", className)}
    >
      {label}
    </Link>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" className="site-mobile-menu-btn-icon" aria-hidden>
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="site-mobile-menu-btn-icon" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type SiteHeaderAccount = {
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  manageHref: string | null;
};

export function SiteHeaderNav({ account }: { account?: SiteHeaderAccount }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [guideOpen, setGuideOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const guideRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const guideActive = SITE_GUIDE_NAV.some((item) => pathname === item.href);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (guideRef.current && !guideRef.current.contains(e.target as Node)) {
        setGuideOpen(false);
      }
    }
    function onScroll() {
      setGuideOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setGuideOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") closeMobile();
    }
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onEscape);
    };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
    setGuideOpen(false);
  }

  async function logout() {
    closeMobile();
    setLoggingOut(true);
    try {
      await fetch("/api/auth/me", { method: "DELETE" });
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="site-header-nav">
      {/* Мобильная кнопка — сразу после логотипа */}
      <button
        type="button"
        className="site-mobile-menu-btn site-header-nav-mobile"
        aria-expanded={mobileOpen}
        aria-controls="site-mobile-nav"
        aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
        onClick={() => setMobileOpen((v) => !v)}
      >
        <MenuIcon open={mobileOpen} />
        <span>{mobileOpen ? t("nav.close") : t("nav.sections")}</span>
      </button>

      {/* Десктоп — только от 1024px (см. globals.css .site-header-nav-desktop) */}
      <div className="site-header-nav-desktop">
        <nav className="flex min-w-0 flex-1 items-center gap-0.5 lg:gap-1">
          {SITE_NAV_MAIN.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={t(item.labelKey)}
              active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
            />
          ))}
          <Link
            href={SITE_NAV_CTA.href}
            className={cn(
              "site-nav-cta",
              pathname.startsWith(SITE_NAV_CTA.href) && "site-nav-cta-active",
            )}
          >
            {t(SITE_NAV_CTA.labelKey)}
          </Link>
        </nav>

        <div ref={guideRef} className="site-header-nav-guide relative shrink-0">
          <button
            type="button"
            onClick={() => setGuideOpen((v) => !v)}
            className={cn(
              "site-nav-link inline-flex items-center gap-1",
              (guideActive || guideOpen) && "site-nav-link-active",
            )}
            aria-expanded={guideOpen}
            aria-haspopup="menu"
          >
            {t("nav.guide")}
            <span className="text-[10px] opacity-70" aria-hidden>
              ▾
            </span>
          </button>
          {guideOpen && (
            <div className="site-popover right-0 top-full min-w-[11rem] lg:left-0 lg:right-auto">
              {SITE_GUIDE_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setGuideOpen(false)}
                  className={cn(
                    "site-popover-item",
                    pathname === item.href && "site-popover-item-active",
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {mounted &&
        mobileOpen &&
        createPortal(
          <div
            id="site-mobile-nav"
            className="site-mobile-nav"
            role="dialog"
            aria-modal
            aria-labelledby="site-mobile-nav-heading"
          >
            <div className="site-mobile-nav-panel">
              <header className="site-mobile-nav-header">
                <div>
                  <p id="site-mobile-nav-heading" className="site-mobile-nav-heading">
                    {t("nav.mobileMenu")}
                  </p>
                  {account && (
                    <p className="site-mobile-nav-account-name">
                      {account.lastName} {account.firstName}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="site-mobile-nav-close"
                  aria-label={t("nav.closeMenu")}
                  onClick={closeMobile}
                >
                  <span aria-hidden>×</span>
                </button>
              </header>

              <div className="site-mobile-nav-scroll">
                <p className="site-mobile-nav-title">{t("nav.sections")}</p>
                <nav className="site-mobile-nav-group">
                  {SITE_NAV_MAIN.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={t(item.labelKey)}
                      active={
                        item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                      }
                      onClick={closeMobile}
                      className="site-mobile-nav-link"
                    />
                  ))}
                  <Link
                    href={SITE_NAV_CTA.href}
                    onClick={closeMobile}
                    className={cn(
                      "site-mobile-nav-link site-mobile-nav-link-cta",
                      pathname.startsWith(SITE_NAV_CTA.href) && "site-mobile-nav-link-cta-active",
                    )}
                  >
                    {t(SITE_NAV_CTA.labelKey)}
                  </Link>
                </nav>

                <p className="site-mobile-nav-title">{t("nav.guide")}</p>
                <nav className="site-mobile-nav-group">
                  {SITE_GUIDE_NAV.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={t(item.labelKey)}
                      active={pathname === item.href}
                      onClick={closeMobile}
                      className="site-mobile-nav-link"
                    />
                  ))}
                </nav>

                <p className="site-mobile-nav-title">{t("nav.accountSection")}</p>
                <nav className="site-mobile-nav-group">
                  {account ? (
                    <>
                      <Link href="/cabinet" onClick={closeMobile} className="site-mobile-nav-link">
                        {t("nav.cabinet")}
                      </Link>
                      {account.manageHref && (
                        <Link
                          href={account.manageHref}
                          onClick={closeMobile}
                          className="site-mobile-nav-link site-mobile-nav-link-accent"
                        >
                          {t("nav.manageClub")}
                        </Link>
                      )}
                      {account.isAdmin && (
                        <Link
                          href="/admin"
                          onClick={closeMobile}
                          className="site-mobile-nav-link site-mobile-nav-link-accent"
                        >
                          {t("nav.admin")}
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={logout}
                        disabled={loggingOut}
                        className="site-mobile-nav-link text-left disabled:opacity-60"
                      >
                        {loggingOut ? t("nav.loggingOut") : t("nav.logout")}
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      onClick={closeMobile}
                      className="site-mobile-nav-link site-mobile-nav-link-accent"
                    >
                      {t("nav.login")}
                    </Link>
                  )}
                </nav>

                <p className="site-mobile-nav-title">{t("locale.switch")}</p>
                <LocaleSwitcher variant="footer" className="px-1" />
              </div>

              <footer className="site-mobile-nav-footer">
                <SiteThemeToggle showLabel className="w-full justify-start px-3 py-2.5" />
              </footer>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
