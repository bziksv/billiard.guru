import { redirect } from "next/navigation";
import { ManageClubStaffPage } from "@/components/manage/manage-club-staff-page";
import { requireClubOwnerPageAccess } from "@/lib/club-owner-access";

export default async function ManageClubStaffRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireClubOwnerPageAccess(id);

  if (!access.allowed) {
    if (access.reason === "login") redirect(`/login?next=/manage/clubs/${id}/staff`);
    redirect("/cabinet");
  }

  return <ManageClubStaffPage clubId={id} clubName={access.club.name} />;
}
