import Link from "next/link";
import { SiteCard } from "@/components/site/site-card";
import { GUIDE_PAGES } from "@/lib/guide-content";

export function HomeGuideLinks() {
  return (
    <section className="home-section-anchor home-section-alt border-y border-[var(--border-subtle)] py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600/80">
          Справочник
        </p>
        <h2 className="home-section-title mt-3 text-2xl font-bold tracking-tight md:text-3xl">
          Правила и турнирные форматы
        </h2>
        <p className="home-section-lead mt-3 max-w-2xl">
          Полезно перед первым турниром: как играть по регламенту и как читать сетку на
          платформе.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {GUIDE_PAGES.map((page) => (
            <li key={page.href}>
              <SiteCard href={page.href} className="h-full">
                <span className="text-2xl" aria-hidden>
                  {page.icon}
                </span>
                <h3 className="home-card-title mt-3 text-lg font-semibold">{page.title}</h3>
                <p className="home-card-body mt-2 text-sm leading-relaxed">{page.lead}</p>
                <span className="mt-4 inline-block text-sm text-emerald-600">Читать →</span>
              </SiteCard>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/rules" className="site-btn-secondary">
            Правила бильярда
          </Link>
          <Link href="/brackets" className="site-btn-secondary">
            Турнирные сетки
          </Link>
        </div>
      </div>
    </section>
  );
}
