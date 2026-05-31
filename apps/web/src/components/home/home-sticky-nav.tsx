"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { href: "#news", label: "Новости" },
  { href: "#tournaments", label: "Турниры" },
  { href: "#players", label: "Игроки" },
  { href: "#announcements", label: "Объявления" },
  { href: "#clubs", label: "Клубы" },
] as const;

export function HomeStickyNav() {
  const [active, setActive] = useState<string>("#news");
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setStuck(window.scrollY > 520);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = LINKS.map((l) => document.querySelector(l.href)).filter(
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
      className={`sticky top-14 z-30 border-b transition-all duration-300 lg:top-16 ${
        stuck ? "home-sticky-nav-stuck" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 py-2.5 scrollbar-none">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition ${
              active === link.href
                ? "bg-emerald-600 font-medium text-white shadow-md shadow-emerald-900/20"
                : "home-card-body hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
