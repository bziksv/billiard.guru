import { BracketFormatDetailPage } from "@/components/admin/bracket-format-detail-page";
import { isBracketFormatCode } from "@/lib/bracket-formats/catalog";
import { notFound } from "next/navigation";

export default async function AdminBracketFormatPage({
  params,
}: {
  params: Promise<{ format: string }>;
}) {
  const { format } = await params;
  if (!isBracketFormatCode(format)) notFound();
  return <BracketFormatDetailPage formatCode={format} />;
}
