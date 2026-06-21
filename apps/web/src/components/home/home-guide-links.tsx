import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { PublicBracketFormat } from "@/lib/bracket-formats/public-formats";
import {
  bracketFormatCardTitle,
  bracketFormatParticipantBadge,
} from "@/lib/bracket-formats/get-brackets-index-content";
import { SiteCard } from "@/components/site/site-card";
import { GUIDE_PAGES } from "@/lib/guide-content";
import type { AppLocale } from "@/i18n/routing";

const GUIDE_MESSAGE_KEYS: Record<string, { title: string; lead: string }> = {
  "/rules": { title: "rulesCardTitle", lead: "rulesCardLead" },
  "/brackets": { title: "bracketsCardTitle", lead: "bracketsCardLead" },
};

export async function HomeGuideLinks({
  bracketFormats,
}: {
  bracketFormats: PublicBracketFormat[];
}) {
  const t = await getTranslations("home.guide");
  const locale = (await getLocale()) as AppLocale;
  const featuredFormats = bracketFormats.slice(0, 6);

  return (
    <section className="home-section-anchor home-section-alt border-y border-[var(--border-subtle)] py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600/80">
          {t("eyebrow")}
        </p>
        <h2 className="home-section-title mt-3 text-2xl font-bold tracking-tight md:text-3xl">
          {t("title")}
        </h2>
        <p className="home-section-lead mt-3 max-w-2xl">{t("lead")}</p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {GUIDE_PAGES.map((page) => {
            const msgKeys = GUIDE_MESSAGE_KEYS[page.href];
            const title = msgKeys ? t(msgKeys.title) : page.title;
            const lead = msgKeys ? t(msgKeys.lead) : page.lead;

            return (
              <li key={page.href}>
                <SiteCard href={page.href} className="h-full">
                  <span className="text-2xl" aria-hidden>
                    {page.icon}
                  </span>
                  <h3 className="home-card-title mt-3 text-lg font-semibold">{title}</h3>
                  <p className="home-card-body mt-2 text-sm leading-relaxed">{lead}</p>
                  <span className="mt-4 inline-block text-sm text-emerald-600">{t("readMore")}</span>
                </SiteCard>
              </li>
            );
          })}
        </ul>

        {featuredFormats.length > 0 && (
          <div className="mt-10">
            <h3 className="home-card-title text-lg font-semibold">{t("formatsTitle")}</h3>
            <p className="home-card-body mt-2 max-w-2xl text-sm">{t("formatsLead")}</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featuredFormats.map((item) => (
                <li key={item.definition.code}>
                  <Link
                    href={`/brackets/${item.seo.slug}`}
                    className="home-content-card block rounded-xl p-4 transition hover:border-emerald-800/40"
                  >
                    <span className="bracket-format-chip text-[10px]">
                      {bracketFormatParticipantBadge(locale, item)}
                    </span>
                    <p className="home-card-title mt-2 text-sm font-medium leading-snug">
                      {bracketFormatCardTitle(locale, item)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            {bracketFormats.length > featuredFormats.length && (
              <Link href="/brackets" className="mt-4 inline-block text-sm text-emerald-600">
                {t("allFormats", { count: bracketFormats.length })}
              </Link>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/rules" className="site-btn-secondary">
            {t("rulesBtn")}
          </Link>
          <Link href="/brackets" className="site-btn-secondary">
            {t("bracketsBtn")}
          </Link>
        </div>
      </div>
    </section>
  );
}
