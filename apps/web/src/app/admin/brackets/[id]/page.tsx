import { redirect } from "next/navigation";
import { isBracketFormatCode } from "@/lib/bracket-formats/catalog";

/** Старые ссылки: формат → formats/…, uuid турнира → tournament/… */
export default async function AdminBracketsLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (isBracketFormatCode(id)) {
    redirect(`/admin/brackets/formats/${id}`);
  }
  redirect(`/admin/brackets/tournament/${id}`);
}
