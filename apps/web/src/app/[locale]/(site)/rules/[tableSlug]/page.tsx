import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RulesTablePage } from "@/components/site/rules-table-page";
import {
  getAllBilliardTableSlugs,
  getBilliardTableBySlug,
} from "@/lib/billiard-rules/get-rules-content";
import { buildLocalizedRulesTableMetadata } from "@/lib/seo-locale";
import type { AppLocale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string; tableSlug: string }>;
};

export function generateStaticParams() {
  const locales: AppLocale[] = ["ru", "en"];
  return locales.flatMap((locale) =>
    getAllBilliardTableSlugs(locale).map((tableSlug) => ({ locale, tableSlug })),
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, tableSlug } = await params;
  const t = await getTranslations("rules.notFound");
  const table = getBilliardTableBySlug(locale as AppLocale, tableSlug);
  if (!table) return { title: t("table") };
  return buildLocalizedRulesTableMetadata(table, locale);
}

export default async function RulesTableRoute({ params }: PageProps) {
  const { locale, tableSlug } = await params;
  const table = getBilliardTableBySlug(locale as AppLocale, tableSlug);
  if (!table) notFound();

  return <RulesTablePage table={table} />;
}
