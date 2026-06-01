import { redirect } from "next/navigation";
import { ClubOwnerTournamentsPage } from "@/components/manage/club-owner-tournaments-page";
import { requireClubOwnerPageAccess } from "@/lib/club-owner-access";

export default async function ManageClubTournamentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireClubOwnerPageAccess(id);

  if (!access.allowed) {
    if (access.reason === "login") redirect(`/login?next=/manage/clubs/${id}/tournaments`);
    redirect("/cabinet");
  }

  return <ClubOwnerTournamentsPage clubId={id} />;
}
