import { redirect } from "next/navigation";
import { ClubFloorPlanEditor } from "@/components/club/club-floor-plan-editor";
import { requireClubOwnerPageAccess } from "@/lib/club-owner-access";

export default async function ManageClubFloorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireClubOwnerPageAccess(id);

  if (!access.allowed) {
    if (access.reason === "login") redirect(`/login?next=/manage/clubs/${id}/floor`);
    redirect("/cabinet");
  }

  return <ClubFloorPlanEditor clubId={id} clubName={access.club.name} />;
}
