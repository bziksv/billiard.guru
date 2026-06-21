import Link from "next/link";
import type { CSSProperties } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { RulesTableIcon } from "@/components/site/rules-table-icon";
import { GuideSections } from "@/components/site/guide-sections";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { getRulesContent } from "@/lib/billiard-rules/get-rules-content";
import type { BilliardTableType } from "@/lib/billiard-rules/content";
import { rulesTableAccentColor, rulesTableGameCount } from "@/lib/billiard-rules";
import type { AppLocale } from "@/i18n/routing";

function gameCountLabel(count: number, t: Awaited<ReturnType<typeof getTranslations>>) {
  if (count === 1) return t("rules.index.gameOne");
  if (count >= 2 && count <= 4) return t("rules.index.gameFew");
  return t("rules.index.gameMany");
}

function TableTypeCard({
  table,
  t,
}: {
  table: BilliardTableType;
  t: Awaited<ReturnType<typeof getTranslations>>;
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
            {gameCount} {gameCountLabel(gameCount, t)}
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
        <span className="rules-table-card-cta">{t("rules.index.pickDisciplines")}</span>
      </SiteCard>
    </Link>
  );
}

export async function RulesIndexPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("rules");
  const { tableTypes, generalSections, indexIntro } = getRulesContent(locale);

  return (
    <>
      <PageHeader title={t("index.title")} lead={t("index.lead")}>
        <Link href="/brackets" className="site-btn-secondary shrink-0">
          {t("index.bracketsLink")}
        </Link>
        <Link href="/tournaments" className="site-btn-secondary shrink-0">
          {t("index.tournamentsLink")}
        </Link>
      </PageHeader>

      <PageMain className="space-y-14 pt-0">
        <p className="guide-body-text max-w-3xl text-base leading-relaxed">{indexIntro}</p>

        <section>
          <h2 className="site-section-title text-xl">{t("index.tableTypesTitle")}</h2>
          <p className="guide-body-text mt-2 max-w-2xl text-sm leading-relaxed">
            {t("index.tableTypesLead")}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tableTypes.map((table) => (
              <TableTypeCard key={table.id} table={table} t={t} />
            ))}
          </div>
        </section>

        <section className="home-section-alt rounded-2xl border border-[var(--border-subtle)] p-6 md:p-8">
          <h2 className="site-section-title text-xl">{t("index.generalTitle")}</h2>
          <p className="guide-body-text mt-2 max-w-2xl text-sm">{t("index.generalLead")}</p>
          <div className="mt-6 space-y-4">
            <GuideSections sections={generalSections} />
          </div>
        </section>

        <section className="home-cta-card rounded-2xl p-6 md:p-8">
          <h2 className="site-section-title text-xl">{t("index.ctaTitle")}</h2>
          <p className="guide-body-text mt-2 max-w-xl text-sm">{t("index.ctaLead")}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/tournaments" className="site-btn-primary">
              {t("index.ctaTournaments")}
            </Link>
            <Link href="/clubs" className="site-btn-secondary">
              {t("index.ctaClubs")}
            </Link>
          </div>
        </section>
      </PageMain>
    </>
  );
}
