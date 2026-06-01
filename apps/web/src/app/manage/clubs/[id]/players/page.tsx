import { redirect } from "next/navigation";
import { ManageClubPlayersPage } from "@/components/manage/manage-club-players-page";
import { requireClubOwnerPageAccess } from "@/lib/club-owner-access";

export default async function ManageClubPlayersRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireClubOwnerPageAccess(id);

  if (!access.allowed) {
    if (access.reason === "login") redirect(`/login?next=/manage/clubs/${id}/players`);
    redirect("/cabinet");
  }

  return <ManageClubPlayersPage clubId={access.club.id} clubName={access.club.name} />;
}
