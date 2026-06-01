import { redirect } from "next/navigation";
import { ClubPriceTiersEditor } from "@/components/club/club-price-tiers-editor";
import { requireClubOwnerPageAccess } from "@/lib/club-owner-access";

export default async function ManageClubTariffsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireClubOwnerPageAccess(id);

  if (!access.allowed) {
    if (access.reason === "login") redirect(`/login?next=/manage/clubs/${id}/tariffs`);
    redirect("/cabinet");
  }

  return <ClubPriceTiersEditor clubId={id} clubName={access.club.name} />;
}
