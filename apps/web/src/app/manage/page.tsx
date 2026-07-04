import { redirect } from "next/navigation";
import { getCurrentPlayer } from "@/lib/auth";
import { getAccessibleOwnedClubs } from "@/lib/club-owner-access";

export default async function ManageIndexPage() {
  const player = await getCurrentPlayer();
  const clubs = await getAccessibleOwnedClubs();
  if (clubs.length === 0) {
    if (player?.registerAsClubOwner && player.isVerified) {
      redirect("/manage/clubs/new");
    }
    redirect("/cabinet");
  }
  redirect(`/manage/clubs/${clubs[0]!.id}`);
}
