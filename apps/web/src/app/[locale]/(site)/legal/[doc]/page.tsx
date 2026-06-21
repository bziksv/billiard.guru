import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
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

  return (
    <>
      <PageHeader title={entry.title} lead={entry.description} />
      <PageMain className="pt-0">
        <SiteCard className="space-y-6">
          <p className="guide-body-text text-xs text-[var(--text-muted)]">
            {t("updated", { date: body.updatedAt })}
          </p>

          {body.sections.map((section) => (
            <section key={section.title ?? section.paragraphs[0]}>
              {section.title && (
                <h2 className="site-section-title text-lg">{section.title}</h2>
              )}
              <div className={section.title ? "mt-3 space-y-3" : "space-y-3"}>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="guide-body-text text-sm leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <div className="border-t border-[var(--border-subtle)] pt-4">
            <p className="guide-body-text text-sm">
              <Link href={entry.filePath} className="text-emerald-600 hover:underline">
                {t("download")}
              </Link>{" "}
              {t("downloadNote")}
            </p>
            <Link href="/" className="mt-3 inline-block text-sm text-emerald-600 hover:underline">
              {t("backHome")}
            </Link>
          </div>
        </SiteCard>
      </PageMain>
    </>
  );
}
