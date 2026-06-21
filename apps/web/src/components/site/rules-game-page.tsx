import Link from "next/link";
import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { RulesBreadcrumbs } from "@/components/site/rules-breadcrumbs";
import { RulesHistoryBlock } from "@/components/site/rules-table-detail-sections";
import { GuideSections } from "@/components/site/guide-sections";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import type { BilliardGame, BilliardTableType } from "@/lib/billiard-rules/content";
import { rulesTableAccentColor } from "@/lib/billiard-rules";

export async function RulesGamePage({
  table,
  game,
  relatedGames,
}: {
  table: BilliardTableType;
  game: BilliardGame;
  relatedGames: BilliardGame[];
}) {
  const t = await getTranslations("rules");
  const accent = rulesTableAccentColor(table.id);

  return (
    <>
      <PageHeader title={game.title} lead={game.tagline}>
        <Link href={`/rules/${table.slug}`} className="site-btn-secondary shrink-0">
          ← {table.title}
        </Link>
      </PageHeader>

      <PageMain className="pt-0">
        <RulesBreadcrumbs
          items={[
            { href: "/rules", label: t("breadcrumbs.rules") },
            { href: `/rules/${table.slug}`, label: table.title },
            { label: game.title },
          ]}
        />

        <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-4">
              <nav className="site-card p-5">
                <p className="guide-toc-label">{t("game.toc")}</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {game.sections.map((section) => (
                    <li key={section.id}>
                      <a href={`#${section.id}`} className="guide-toc-link">
                        {section.title}
                      </a>
                    </li>
                  ))}
                  {game.history && (
                    <li>
                      <a href="#history" className="guide-toc-link">
                        {game.history.title}
                      </a>
                    </li>
                  )}
                </ul>
              </nav>
              {relatedGames.length > 0 && (
                <nav className="site-card p-5">
                  <p className="guide-toc-label">{t("game.relatedOnTable")}</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {relatedGames.map((g) => (
                      <li key={g.slug}>
                        <Link href={`/rules/${table.slug}/${g.slug}`} className="guide-toc-link">
                          {g.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </div>
          </aside>

          <div className="space-y-6">
            <div
              className="flex flex-wrap gap-2"
              style={{ "--rules-accent": accent } as CSSProperties}
            >
              {game.badge && (
                <span className="rules-game-badge rules-game-badge-inline">{game.badge}</span>
              )}
              {game.subtitle && (
                <span className="rules-table-chip rules-table-chip-muted">{game.subtitle}</span>
              )}
              <span className="rules-table-chip">{table.title}</span>
            </div>

            <GuideSections sections={game.sections} />

            {game.history && <RulesHistoryBlock history={game.history} />}

            <SiteCard>
              <p className="guide-note text-sm">{t("game.disclaimer")}</p>
            </SiteCard>

            <div className="flex flex-wrap gap-3 lg:hidden">
              <Link href={`/rules/${table.slug}`} className="site-btn-secondary">
                {t("game.allGames", { table: table.title })}
              </Link>
              <Link href="/rules" className="site-btn-secondary">
                {t("game.allTables")}
              </Link>
            </div>
          </div>
        </div>
      </PageMain>
    </>
  );
}
