"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { SITE_GUIDE_NAV, SITE_NAV_MAIN, t } from "@/lib/site";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn("site-nav-link", active && "site-nav-link-active")}
    >
      {label}
    </Link>
  );
}

export function SiteHeaderNav() {
  const pathname = usePathname();
  const [guideOpen, setGuideOpen] = useState(false);
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

  return (
    <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto scrollbar-none lg:gap-1">
      {SITE_NAV_MAIN.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={t(item.labelKey)}
          active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
        />
      ))}

      <div ref={guideRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setGuideOpen((v) => !v)}
          className={cn(
            "site-nav-link inline-flex items-center gap-1",
            (guideActive || guideOpen) && "site-nav-link-active",
          )}
          aria-expanded={guideOpen}
        >
          {t("nav.guide")}
          <span className="text-[10px] opacity-70" aria-hidden>
            ▾
          </span>
        </button>
        {guideOpen && (
          <div className="site-popover left-0 top-full min-w-[11rem]">
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
    </nav>
  );
}
