import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import {
  bracketFormatCardTitle,
  bracketFormatParticipantBadge,
  bracketIndexTeaser,
  getBracketsIndexContent,
} from "@/lib/bracket-formats/get-brackets-index-content";
import type { PublicBracketFormat } from "@/lib/bracket-formats/public-formats";
import type { AppLocale } from "@/i18n/routing";

function FormatCard({
  item,
  locale,
  demoLinkLabel,
}: {
  item: PublicBracketFormat;
  locale: AppLocale;
  demoLinkLabel: string;
}) {
  return (
    <Link
      href={`/brackets/${item.seo.slug}`}
      className="bracket-format-card-link"
    >
      <SiteCard className="h-full transition-colors hover:border-emerald-700/50">
        <span className="bracket-format-chip text-xs">
          {bracketFormatParticipantBadge(locale, item)}
        </span>
        <h3 className="mt-3 font-semibold leading-snug">
          {bracketFormatCardTitle(locale, item)}
        </h3>
        <p className="guide-body-text mt-2 line-clamp-2 text-sm leading-relaxed">
          {bracketIndexTeaser(locale, item)}
        </p>
        <span className="mt-4 inline-block text-sm font-medium text-emerald-400">
          {demoLinkLabel}
        </span>
      </SiteCard>
    </Link>
  );
}

export async function BracketsIndexPage({
  enabledFormats,
}: {
  enabledFormats: PublicBracketFormat[];
}) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("brackets.index");
  const { indexIntro, formatGroups, chooseRows, platformFeatures } =
    getBracketsIndexContent(locale);

  const groups = formatGroups
    .map((group) => ({
      ...group,
      formats: enabledFormats.filter(group.match),
    }))
    .filter((group) => group.formats.length > 0);

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")}>
        <Link href="/login?next=/cabinet" className="site-btn-primary shrink-0">
          {t("create")}
        </Link>
        <Link href="/tournaments" className="site-btn-secondary shrink-0">
          {t("tournaments")}
        </Link>
      </PageHeader>

      <PageMain className="space-y-14 pt-0">
        <p className="guide-body-text max-w-3xl text-base leading-relaxed">
          {indexIntro}
        </p>

        {groups.length > 0 ? (
          <div className="space-y-12">
            {groups.map((group) => (
              <section key={group.id}>
                <h2 className="site-section-title text-xl">{group.title}</h2>
                <p className="guide-body-text mt-2 max-w-2xl text-sm leading-relaxed">
                  {group.lead}
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.formats.map((item) => (
                    <FormatCard
                      key={item.definition.code}
                      item={item}
                      locale={locale}
                      demoLinkLabel={t("demoLink")}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <SiteCard>
            <p className="guide-body-text text-sm">
              {t("empty")}{" "}
              <Link href="/tournaments" className="text-emerald-400 hover:underline">
                {t("emptyTournaments")}
              </Link>{" "}
              {t("emptyOr")}
            </p>
          </SiteCard>
        )}

        <section className="home-section-alt rounded-2xl border border-[var(--border-subtle)] p-6 md:p-8">
          <h2 className="site-section-title text-xl">{t("platformTitle")}</h2>
          <p className="guide-body-text mt-2 max-w-2xl text-sm">{t("platformLead")}</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platformFeatures.map((feature) => (
              <li key={feature.title} className="home-content-card rounded-xl p-4">
                <h3 className="font-medium leading-snug">{feature.title}</h3>
                <p className="guide-body-text mt-2 text-sm leading-relaxed">
                  {feature.text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="site-section-title text-xl">{t("chooseTitle")}</h2>
          <p className="guide-body-text mt-2 max-w-2xl text-sm">{t("chooseLead")}</p>
          <div className="mt-5 overflow-x-auto">
            <table className="guide-table w-full min-w-[520px] text-sm">
              <thead>
                <tr>
                  <th className="text-left">{t("chooseFormat")}</th>
                  <th className="text-left">{t("chooseWhen")}</th>
                  <th className="text-left">{t("chooseSize")}</th>
                </tr>
              </thead>
              <tbody>
                {chooseRows.map((row) => (
                  <tr key={row.format}>
                    <td className="font-medium">{row.format}</td>
                    <td>{row.forWhom}</td>
                    <td>{row.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="home-cta-card rounded-2xl p-6 md:p-8">
          <h2 className="site-section-title text-xl">{t("ctaTitle")}</h2>
          <p className="guide-body-text mt-2 max-w-xl text-sm">{t("ctaLead")}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/login?next=/cabinet" className="site-btn-primary">
              {t("ctaCreate")}
            </Link>
            <Link href="/tournaments" className="site-btn-secondary">
              {t("ctaBrowse")}
            </Link>
          </div>
        </section>
      </PageMain>
    </>
  );
}
