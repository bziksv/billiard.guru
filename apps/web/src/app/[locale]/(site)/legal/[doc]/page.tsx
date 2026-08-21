import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LegalDocContent } from "@/components/site/legal/legal-doc-content";
import { LegalDocNav } from "@/components/site/legal/legal-doc-nav";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { Link } from "@/i18n/navigation";
import { getLegalDocBody } from "@/lib/legal-bodies";
import { getAllLegalDocSlugs, getLegalDoc } from "@/lib/legal-content";
import { buildLocalizedLegalMetadata } from "@/lib/seo-locale";
import type { AppLocale } from "@/i18n/routing";
import type { LegalDocSlug } from "@/lib/legal";

export function generateStaticParams() {
  const locales: AppLocale[] = ["ru", "en"];
  return locales.flatMap((locale) =>
    getAllLegalDocSlugs().map((doc) => ({ locale, doc })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; doc: string }>;
}) {
  const { locale, doc } = await params;
  const t = await getTranslations("legal.page");
  const slug = doc as LegalDocSlug;
  const slugs = getAllLegalDocSlugs();
  if (!slugs.includes(slug)) return { title: t("notFound") };
  const entry = getLegalDoc(slug, locale as AppLocale);
  return buildLocalizedLegalMetadata(entry, doc, locale);
}

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ locale: string; doc: string }>;
}) {
  const { locale, doc } = await params;
  const t = await getTranslations("legal.page");
  const slug = doc as LegalDocSlug;
  const slugs = getAllLegalDocSlugs();
  if (!slugs.includes(slug)) notFound();

  const entry = getLegalDoc(slug, locale as AppLocale);
  const body = getLegalDocBody(slug, locale as AppLocale);

  const appLocale = locale as AppLocale;

  return (
    <>
      <PageHeader title={entry.title} lead={entry.description} />
      <PageMain className="pt-0">
        <LegalDocNav
          current={slug}
          locale={appLocale}
          ariaLabel={t("docsNav")}
        />
        <SiteCard className="space-y-6">
          <p className="guide-body-text text-xs text-[var(--text-muted)]">
            {t("updated", { date: body.updatedAt })}
          </p>

          <LegalDocContent sections={body.sections} />

          <div className="border-t border-[var(--border-subtle)] pt-4">
            <Link href="/" className="inline-block text-sm text-emerald-600 hover:underline">
              {t("backHome")}
            </Link>
          </div>
        </SiteCard>
      </PageMain>
    </>
  );
}
