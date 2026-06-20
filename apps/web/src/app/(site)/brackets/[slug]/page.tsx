import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BracketFormatLanding } from "@/components/site/bracket-format-landing";
import { getAllBracketFormatSeoSlugs } from "@/lib/bracket-formats/seo";
import {
  getPublicBracketFormatBySlug,
  getPublicEnabledBracketFormats,
} from "@/lib/bracket-formats/public-formats";
import { bracketFormatMetadata } from "@/lib/seo";

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllBracketFormatSeoSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const format = await getPublicBracketFormatBySlug(slug);
  if (!format) {
    return { title: "Формат не найден" };
  }

  return bracketFormatMetadata(format.seo);
}

export default async function BracketFormatPage({ params }: PageProps) {
  const { slug } = await params;
  const format = await getPublicBracketFormatBySlug(slug);
  if (!format) notFound();

  const allFormats = await getPublicEnabledBracketFormats();
  const relatedFormats = allFormats
    .filter((f) => f.definition.code !== format.definition.code)
    .slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: format.seo.pageTitle,
    description: format.seo.metaDescription,
    url: `https://billiard.guru/brackets/${format.seo.slug}`,
    isPartOf: {
      "@type": "WebSite",
      name: "billiard.guru",
      url: "https://billiard.guru",
    },
    about: {
      "@type": "SportsEvent",
      name: format.seo.pageTitle,
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
