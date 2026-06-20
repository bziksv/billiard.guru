import Link from "next/link";
import type { CSSProperties } from "react";
import { RulesTableIcon } from "@/components/site/rules-table-icon";
import { GuideSections } from "@/components/site/guide-sections";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import {
  BILLIARD_GENERAL_SECTIONS,
  BILLIARD_TABLE_TYPES,
  RULES_INDEX_INTRO,
  rulesTableAccentColor,
  rulesTableGameCount,
} from "@/lib/billiard-rules";

function TableTypeCard({
  table,
}: {
  table: (typeof BILLIARD_TABLE_TYPES)[number];
}) {
  const accent = rulesTableAccentColor(table.id);
  const gameCount = rulesTableGameCount(table);

  return (
    <Link
      href={`/rules/${table.slug}`}
      className="rules-table-card-link"
      style={{ "--rules-accent": accent } as CSSProperties}
    >
      <SiteCard className="rules-table-card h-full">
        <div className="rules-table-card-accent" aria-hidden />
        <RulesTableIcon
          formatId={table.id}
          pockets={table.pockets}
          className="rules-table-card-icon"
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rules-table-chip">{table.pocketsLabel}</span>
          <span className="rules-table-chip rules-table-chip-muted">
            {gameCount}{" "}
            {gameCount === 1 ? "игра" : gameCount < 5 ? "игры" : "игр"}
          </span>
        </div>
        <h2 className="mt-3 text-lg font-semibold leading-snug">{table.title}</h2>
        <p className="guide-body-text mt-2 line-clamp-3 text-sm leading-relaxed">
          {table.teaser}
        </p>
        <ul className="mt-4 space-y-1.5">
          {table.specs.slice(0, 2).map((spec) => (
            <li
              key={spec.label}
              className="flex justify-between gap-2 text-xs text-[var(--text-muted)]"
            >
              <span>{spec.label}</span>
              <span className="font-medium text-[var(--text-secondary)]">{spec.value}</span>
            </li>
          ))}
        </ul>
        <span className="rules-table-card-cta">Выбрать дисциплины →</span>
      </SiteCard>
    </Link>
  );
}

export function RulesIndexPage() {
  return (
    <>
      <PageHeader
        title="Правила бильярда"
        lead="Справочник по типам столов и дисциплинам — как в каталоге клубов. Сначала выберите стол, затем игру."
      >
        <Link href="/brackets" className="site-btn-secondary shrink-0">
          Турнирные сетки →
        </Link>
        <Link href="/tournaments" className="site-btn-secondary shrink-0">
          Турниры
        </Link>
      </PageHeader>

      <PageMain className="space-y-14 pt-0">
        <p className="guide-body-text max-w-3xl text-base leading-relaxed">
          {RULES_INDEX_INTRO}
        </p>

        <section>
          <h2 className="site-section-title text-xl">Типы столов</h2>
          <p className="guide-body-text mt-2 max-w-2xl text-sm leading-relaxed">
            Пять форматов, которые клубы указывают при бронировании и создании турнира на
            billiard.guru.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {BILLIARD_TABLE_TYPES.map((table) => (
              <TableTypeCard key={table.id} table={table} />
            ))}
          </div>
        </section>

        <section className="home-section-alt rounded-2xl border border-[var(--border-subtle)] p-6 md:p-8">
          <h2 className="site-section-title text-xl">Общее для всех дисциплин</h2>
          <p className="guide-body-text mt-2 max-w-2xl text-sm">
            Фора, этикет и приоритет регламента турнира — не зависят от типа стола.
          </p>
          <div className="mt-6 space-y-4">
            <GuideSections sections={BILLIARD_GENERAL_SECTIONS} />
          </div>
        </section>

        <section className="home-cta-card rounded-2xl p-6 md:p-8">
          <h2 className="site-section-title text-xl">Готовы сыграть турнир?</h2>
          <p className="guide-body-text mt-2 max-w-xl text-sm">
            Найдите ближайшее событие или создайте своё — формат стола и игры указываются в
            карточке турнира.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/tournaments" className="site-btn-primary">
              Смотреть турниры
            </Link>
            <Link href="/clubs" className="site-btn-secondary">
              Клубы и столы
            </Link>
          </div>
        </section>
      </PageMain>
    </>
  );
}
