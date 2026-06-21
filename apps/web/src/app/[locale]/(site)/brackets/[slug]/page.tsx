import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BracketFormatLanding } from "@/components/site/bracket-format-landing";
import { getAllBracketFormatSeoSlugs } from "@/lib/bracket-formats/seo";
import {
  getPublicBracketFormatBySlug,
  getPublicEnabledBracketFormats,
} from "@/lib/bracket-formats/public-formats";
import { localizedBracketSeoEntry } from "@/lib/bracket-formats/get-bracket-format-display";
import { buildLocalizedBracketFormatMetadata } from "@/lib/seo-locale";
import { SEO_SITE_URL } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  const locales: AppLocale[] = ["ru", "en"];
  return locales.flatMap((locale) =>
    getAllBracketFormatSeoSlugs().map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations("brackets.landing");
  const format = await getPublicBracketFormatBySlug(slug);
  if (!format) return { title: t("notFound") };
  const seo = localizedBracketSeoEntry(locale as AppLocale, format.seo);
  return buildLocalizedBracketFormatMetadata(seo, locale);
}

export default async function BracketFormatPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const format = await getPublicBracketFormatBySlug(slug);
  if (!format) notFound();

  const allFormats = await getPublicEnabledBracketFormats();
  const relatedFormats = allFormats
    .filter((f) => f.definition.code !== format.definition.code)
    .slice(0, 6);

  const seo = localizedBracketSeoEntry(locale as AppLocale, format.seo);
  const path =
    locale === "en" ? `/en/brackets/${format.seo.slug}` : `/brackets/${format.seo.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: seo.pageTitle,
    description: seo.metaDescription,
    url: `${SEO_SITE_URL}${path}`,
    isPartOf: {
      "@type": "WebSite",
      name: "billiard.guru",
      url: SEO_SITE_URL,
    },
    about: {
      "@type": "SportsEvent",
      name: seo.pageTitle,
      sport: "Billiards",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BracketFormatLanding format={format} relatedFormats={relatedFormats} />
    </>
  );
}
