import { redirect } from "next/navigation";
import { ClubOwnerIdeasPage } from "@/components/manage/club-owner-ideas-page";
import { requireClubOwnerPageAccess } from "@/lib/club-owner-access";

export default async function ManageClubIdeasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireClubOwnerPageAccess(id);

  if (!access.allowed) {
    if (access.reason === "login") redirect(`/login?next=/manage/clubs/${id}/ideas`);
    redirect("/cabinet");
  }

  return <ClubOwnerIdeasPage clubId={id} />;
}
