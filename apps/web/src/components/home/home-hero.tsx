"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HomeBilliardScene } from "@/components/home/home-billiard-scene";
import { HomeStatCounter } from "@/components/home/home-stat-counter";

export function HomeHero({
  stats,
}: {
  stats: { tournaments: number; clubs: number; players: number };
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const onMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setMouse({
        x: (e.clientX - cx) / rect.width,
        y: (e.clientY - cy) / rect.height,
      });
    };

    section.addEventListener("mousemove", onMove);
    return () => section.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const el = parallaxRef.current;
    if (!el) return;

    const onScroll = () => {
      el.style.transform = `translateY(${window.scrollY * 0.38}px)`;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const px = mouse.x * 32;
  const py = mouse.y * 22;

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[94vh] overflow-hidden border-b border-[var(--border-subtle)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.12),transparent)]" />

      <div ref={parallaxRef} className="absolute inset-0 will-change-transform">
        <HomeBilliardScene parallax={{ x: px, y: py }} />
      </div>

      {/* затемнение под текстом — справа оставляем графику ярче */}
      <div className="home-hero-scrim pointer-events-none absolute inset-0" />

      <div className="relative z-10 mx-auto flex min-h-[94vh] max-w-6xl flex-col justify-center px-6 pb-20 pt-28">
        <p className="home-animate-fade-up guide-format-badge inline-flex w-fit items-center gap-2 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          пирамида · снукер · пул
        </p>
        <p className="home-animate-fade-up-delay-1 home-hero-tagline mt-5 max-w-xl text-base leading-relaxed sm:text-lg">
          <span className="font-medium">Бильярд</span>
          <span className="mx-2 text-emerald-600/70">—</span>
          <span className="italic text-emerald-600/80">точность, ставшая искусством</span>
        </p>
        <h1 className="home-animate-fade-up-delay-1 home-hero-title mt-5 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-[3.25rem]">
          Турниры, новости и{" "}
          <span className="home-shimmer-text">бильярдное сообщество</span>
        </h1>
        <p className="home-animate-fade-up-delay-2 home-hero-body mt-6 max-w-xl text-lg leading-relaxed">
          Публикуйте турниры, делитесь новостями, находите клубы и игроков.
          Скоро — спарринг-партнёр через Telegram-бота.
        </p>

        <div className="home-animate-fade-up-delay-3 mt-10 flex flex-wrap gap-3">
          <Link
            href="/tournaments"
            className="site-btn-primary home-btn-glow px-7 py-3.5 text-base shadow-lg shadow-emerald-900/30"
          >
            Смотреть турниры
          </Link>
          <Link href="/login" className="site-btn-secondary px-7 py-3.5 text-base backdrop-blur-sm">
            Войти и публиковать
          </Link>
          <a href="#news" className="site-btn-ghost home-hero-tagline px-4 py-3.5 text-base">
            Новости ↓
          </a>
        </div>

        <dl className="home-animate-fade-up-delay-3 mt-16 grid max-w-xl grid-cols-3 gap-3 sm:gap-6">
          {(
            [
              ["Турниры", stats.tournaments],
              ["Клубы", stats.clubs],
              ["Игроки", stats.players],
            ] as const
          ).map(([label, val]) => (
            <div key={label} className="home-stat-card px-4 py-4">
              <dt className="home-card-muted text-[10px] font-medium uppercase tracking-wider sm:text-xs">
                {label}
              </dt>
              <dd className="mt-1 font-mono text-2xl font-semibold text-emerald-600 sm:text-3xl">
                <HomeStatCounter value={val} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2">
        <a
          href="#news"
          className="flex flex-col items-center gap-2 text-xs text-zinc-600 transition hover:text-zinc-400"
        >
          <span>листайте</span>
          <span className="home-scroll-line block h-10 w-px bg-gradient-to-b from-zinc-600 to-transparent" />
        </a>
      </div>
    </section>
  );
}
