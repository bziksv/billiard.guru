import Link from "next/link";
import type { CSSProperties } from "react";
import { RulesBreadcrumbs } from "@/components/site/rules-breadcrumbs";
import {
  RulesChecklistBlock,
  RulesEquipmentBlock,
  RulesHistoryBlock,
} from "@/components/site/rules-table-detail-sections";
import { RulesTableIcon } from "@/components/site/rules-table-icon";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import type { BilliardTableType } from "@/lib/billiard-rules";
import { rulesTableAccentColor } from "@/lib/billiard-rules";

function GameCard({
  table,
  game,
}: {
  table: BilliardTableType;
  game: BilliardTableType["games"][number];
}) {
  const accent = rulesTableAccentColor(table.id);

  return (
    <Link
      href={`/rules/${table.slug}/${game.slug}`}
      className="rules-game-card-link"
      style={{ "--rules-accent": accent } as CSSProperties}
    >
      <SiteCard className="rules-game-card flex h-full flex-col">
        {game.badge && <span className="rules-game-badge">{game.badge}</span>}
        <h3 className="mt-2 font-semibold leading-snug">{game.title}</h3>
        {game.subtitle && (
          <p className="rules-game-subtitle mt-0.5 text-xs uppercase tracking-wide">
            {game.subtitle}
          </p>
        )}
        <p className="guide-body-text mt-2 flex-1 line-clamp-4 text-sm leading-relaxed">
          {game.tagline}
        </p>
        <span className="rules-game-card-cta mt-4">Читать правила →</span>
      </SiteCard>
    </Link>
  );
}

export function RulesTablePage({ table }: { table: BilliardTableType }) {
  const accent = rulesTableAccentColor(table.id);
  const hasExtras = Boolean(table.equipment || table.checklist || table.history);

  return (
    <>
      <PageHeader title={table.title} lead={table.lead}>
        <Link href="/rules" className="site-btn-secondary shrink-0">
          ← Все столы
        </Link>
      </PageHeader>

      <PageMain className="pt-0">
        <div
          className="flex flex-col gap-10"
          style={{ "--rules-accent": accent } as CSSProperties}
        >
          <RulesBreadcrumbs
            items={[
              { href: "/rules", label: "Правила" },
              { label: table.title },
            ]}
          />

          <div>
            <SiteCard className="rules-table-hero overflow-hidden">
              <div className="rules-table-hero-grid">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rules-table-chip">{table.pocketsLabel}</span>
                    <span className="rules-table-chip rules-table-chip-muted">
                      {table.games.length}{" "}
                      {table.games.length === 1
                        ? "дисциплина"
                        : table.games.length < 5
                          ? "дисциплины"
                          : "дисциплин"}
                    </span>
                  </div>
                  {table.overview.map((text) => (
                    <p key={text} className="guide-body-text mt-4 text-sm leading-relaxed">
                      {text}
                    </p>
                  ))}
                  {hasExtras && (
                    <div className="mt-4 flex flex-wrap gap-2 text-sm">
                      <a href="#disciplines" className="text-emerald-400 hover:underline">
                        Дисциплины
                      </a>
                      {table.equipment && (
                        <>
                          <span className="text-[var(--text-muted)]">·</span>
                          <a href="#equipment" className="text-emerald-400 hover:underline">
                            Параметры стола
                          </a>
                        </>
                      )}
                      {table.checklist && (
                        <>
                          <span className="text-[var(--text-muted)]">·</span>
                          <a href="#checklist" className="text-emerald-400 hover:underline">
                            Чек-лист
                          </a>
                        </>
                      )}
                      {table.history && (
                        <>
                          <span className="text-[var(--text-muted)]">·</span>
                          <a href="#history" className="text-emerald-400 hover:underline">
                            История
                          </a>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="rules-table-hero-visual">
                  <RulesTableIcon
                    formatId={table.id}
                    pockets={table.pockets}
                    className="w-full max-w-[200px]"
                  />
                </div>
              </div>
              <dl className="rules-spec-grid mt-6">
                {table.specs.map((spec) => (
                  <div key={spec.label} className="rules-spec-item">
                    <dt className="rules-spec-label">{spec.label}</dt>
                    <dd className="rules-spec-value">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </SiteCard>
          </div>

          <section id="disciplines" className="scroll-mt-28">
            <h2 className="site-section-title text-xl">Дисциплины</h2>
            <p className="guide-body-text mt-2 max-w-2xl text-sm">
              Выберите игру — на отдельной странице полный регламент, историческая справка и
              нюансы дисциплины.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {table.games.map((game) => (
                <GameCard key={game.slug} table={table} game={game} />
              ))}
            </div>
          </section>

          {table.equipment && <RulesEquipmentBlock equipment={table.equipment} />}
          {table.checklist && <RulesChecklistBlock checklist={table.checklist} />}

          {table.commonFouls && table.commonFouls.length > 0 && (
            <SiteCard>
              <h2 className="site-section-title text-lg">Типичные нарушения</h2>
              <ul className="guide-body-text mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {table.commonFouls.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="guide-note mt-4 text-sm">
                {table.slug === "pyramid"
                  ? "На одном столе играют разные дисциплины — зачёт битка в лузу, выбор битка и штрафы различаются. Точный регламент — на странице дисциплины и в карточке турнира."
                  : "Санкции и порядок ввода шара зависят от регламента турнира — уточняйте у судьи перед матчем."}
              </p>
            </SiteCard>
          )}

          {table.history && <RulesHistoryBlock history={table.history} />}

          <section className="flex flex-wrap gap-3">
            <Link href="/rules" className="site-btn-secondary">
              Другой тип стола
            </Link>
            <Link href="/clubs" className="site-btn-secondary">
              Найти клуб со столом «{table.title.split(" ")[0]}»
            </Link>
          </section>
        </div>
      </PageMain>
    </>
  );
}
