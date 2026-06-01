"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/cn";
import { SITE_GUIDE_NAV, SITE_NAV_MAIN, t } from "@/lib/site";

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
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
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
        aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню разделов"}
        onClick={() => setMobileOpen((v) => !v)}
      >
        <MenuIcon open={mobileOpen} />
        <span>{mobileOpen ? "Закрыть" : "Разделы"}</span>
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
        </nav>

        <div ref={guideRef} className="relative shrink-0">
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
                    Меню
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
                  aria-label="Закрыть меню"
                  onClick={closeMobile}
                >
                  <span aria-hidden>×</span>
                </button>
              </header>

              <div className="site-mobile-nav-scroll">
                <p className="site-mobile-nav-title">Разделы</p>
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
                </nav>

                <p className="site-mobile-nav-title">Справочник</p>
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

                <p className="site-mobile-nav-title">Аккаунт</p>
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
                          Управление клубом
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
                        {loggingOut ? "Выход…" : t("nav.logout")}
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
              </div>

              <footer className="site-mobile-nav-footer">
                <ThemeToggle variant="site" showLabel className="w-full justify-start px-3 py-2.5" />
              </footer>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
