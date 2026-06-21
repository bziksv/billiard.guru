import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { LocalizedUserText } from "@/components/site/localized-user-text";
import { APP_NAME } from "@/lib/brand";
import type { AppLocale } from "@/i18n/routing";
import { resolveLocalizedField } from "@/lib/localized-db-text";
import { buildLocalizedSiteNewsMetadata } from "@/lib/seo-locale";
import { getPublishedSiteNews } from "@/lib/site-news-server";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const t = await getTranslations("pages.news");
  const item = await getPublishedSiteNews(id);
  if (!item) return { title: t("notFound") };
  const appLocale = locale as AppLocale;
  const title = resolveLocalizedField(appLocale, item.title, item.titleEn);
  const body = resolveLocalizedField(appLocale, item.body, item.bodyEn);
  return buildLocalizedSiteNewsMetadata(title, body.slice(0, 160), id, locale);
}

export default async function SiteNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("pages.news");
  const item = await getPublishedSiteNews(id);
  if (!item) notFound();

  const title = resolveLocalizedField(locale, item.title, item.titleEn);
  const body = resolveLocalizedField(locale, item.body, item.bodyEn);
  const date = (item.publishedAt ?? item.createdAt).toLocaleDateString(
    locale === "en" ? "en-GB" : "ru-RU",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <>
      <PageHeader title={title} lead={`${APP_NAME} · ${date}`}>
        <Link href="/" className="site-btn-secondary text-sm">
          {t("backHome")}
        </Link>
      </PageHeader>
      <PageMain className="max-w-3xl">
        <article className="site-card space-y-4 p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
            {t("serviceBadge")}
          </p>
          <LocalizedUserText text={item.body} textEn={item.bodyEn} linkify />
          <div className="border-t border-[var(--border)] pt-4 text-sm text-[var(--text-muted)]">
            <Link href="/news" className="text-emerald-600 hover:underline dark:text-emerald-400">
              {t("allNews")}
            </Link>
          </div>
        </article>
      </PageMain>
    </>
  );
}
