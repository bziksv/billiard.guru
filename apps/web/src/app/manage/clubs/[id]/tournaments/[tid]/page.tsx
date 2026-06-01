import { redirect } from "next/navigation";
import { ClubOwnerTournamentManagePage } from "@/components/manage/club-owner-tournament-manage-page";
import { requireClubOwnerPageAccess } from "@/lib/club-owner-access";
import { assertClubOwnsTournament } from "@/lib/tournament-manage";

export default async function ManageClubTournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string; tid: string }>;
}) {
  const { id, tid } = await params;
  const access = await requireClubOwnerPageAccess(id);

  if (!access.allowed) {
    if (access.reason === "login") {
      redirect(`/login?next=/manage/clubs/${id}/tournaments/${tid}`);
    }
    redirect("/cabinet");
  }

  try {
    await assertClubOwnsTournament(tid, id);
  } catch {
    redirect(`/manage/clubs/${id}/tournaments`);
  }

  return <ClubOwnerTournamentManagePage clubId={id} clubName={access.club.name} />;
}
