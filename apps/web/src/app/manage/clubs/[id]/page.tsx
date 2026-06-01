import { redirect } from "next/navigation";
import { ClubEditView } from "@/components/club/club-edit-view";
import { requireClubOwnerPageAccess } from "@/lib/club-owner-access";

export default async function ManageClubEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireClubOwnerPageAccess(id);

  if (!access.allowed) {
    if (access.reason === "login") redirect(`/login?next=/manage/clubs/${id}`);
    redirect("/cabinet");
  }

  return <ClubEditView clubId={id} variant="manage" />;
}
