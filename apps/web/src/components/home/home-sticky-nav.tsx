"use client";

import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { GeoFilterBar } from "@/components/site/geo-filter";
import { useSiteStickyTop } from "@/hooks/use-site-sticky-top";

const LINK_KEYS = [
  { href: "#news", key: "news" },
  { href: "#tournaments", key: "tournaments" },
  { href: "#players", key: "players" },
  { href: "#announcements", key: "announcements" },
  { href: "#clubs", key: "clubs" },
] as const;

type HomeStickyNavProps = {
  initialCountryId?: string;
  initialCityId?: string;
};

function HomeStickyNavInner({
  initialCountryId,
  initialCityId,
}: HomeStickyNavProps) {
  const t = useTranslations("home.stickyNav");
  const [active, setActive] = useState<string>("#news");
  const stickyTop = useSiteStickyTop();

  useEffect(() => {
    const sections = LINK_KEYS.map((l) => document.querySelector(l.href)).filter(
      (el): el is Element => el != null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActive(`#${visible.target.id}`);
        }
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.25, 0.5] },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className="home-sticky-nav-stuck sticky top-[var(--site-sticky-top)] z-30 border-b"
      style={stickyTop != null ? { top: stickyTop } : undefined}
      aria-label={t("label")}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:px-6 md:flex-row md:flex-wrap md:items-center md:gap-x-3 md:gap-y-2">
        <div className="hidden min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-none md:flex">
          {LINK_KEYS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition sm:px-4 ${
                active === link.href
                  ? "bg-emerald-600 font-medium text-white shadow-md shadow-emerald-900/20"
                  : "home-card-body hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t(link.key)}
            </a>
          ))}
        </div>
        <GeoFilterBar
          basePath="/"
          variant="inline"
          initialCountryId={initialCountryId}
          initialCityId={initialCityId}
        />
      </div>
    </nav>
  );
}

export function HomeStickyNav(props: HomeStickyNavProps) {
  return (
    <Suspense fallback={null}>
      <HomeStickyNavInner {...props} />
    </Suspense>
  );
}
