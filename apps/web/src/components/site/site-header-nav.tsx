"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

export function SiteHeaderNav() {
  const pathname = usePathname();
  const [guideOpen, setGuideOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const guideRef = useRef<HTMLDivElement>(null);

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
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
    setGuideOpen(false);
  }

  return (
    <>
      {/* Десктоп */}
      <div className="hidden min-w-0 flex-1 items-center gap-0.5 lg:flex lg:gap-1">
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

      {/* Мобильная кнопка меню */}
      <button
        type="button"
        className="site-mobile-menu-btn lg:hidden"
        aria-expanded={mobileOpen}
        aria-controls="site-mobile-nav"
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? "Закрыть" : "Меню"}
      </button>

      {mobileOpen && (
        <div id="site-mobile-nav" className="site-mobile-nav lg:hidden" role="dialog" aria-modal>
          <button
            type="button"
            className="site-mobile-nav-backdrop"
            aria-label="Закрыть меню"
            onClick={closeMobile}
          />
          <div className="site-mobile-nav-panel">
            <p className="site-mobile-nav-title">Разделы</p>
            <nav className="flex flex-col gap-1">
              {SITE_NAV_MAIN.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={t(item.labelKey)}
                  active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
                  onClick={closeMobile}
                  className="site-mobile-nav-link"
                />
              ))}
            </nav>
            <p className="site-mobile-nav-title mt-4">Справочник</p>
            <nav className="flex flex-col gap-1">
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
          </div>
        </div>
      )}
    </>
  );
}
