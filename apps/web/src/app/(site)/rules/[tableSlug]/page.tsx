import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RulesTablePage } from "@/components/site/rules-table-page";
import {
  getAllBilliardTableSlugs,
  getBilliardTableBySlug,
} from "@/lib/billiard-rules";
import { rulesTableMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ tableSlug: string }>;
};

export function generateStaticParams() {
  return getAllBilliardTableSlugs().map((tableSlug) => ({ tableSlug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tableSlug } = await params;
  const table = getBilliardTableBySlug(tableSlug);
  if (!table) return { title: "Стол не найден" };
  return rulesTableMetadata(table);
}

export default async function RulesTableRoute({ params }: PageProps) {
  const { tableSlug } = await params;
  const table = getBilliardTableBySlug(tableSlug);
  if (!table) notFound();

  return <RulesTablePage table={table} />;
}
