import { redirect } from "next/navigation";
import { ManageNewClubPage } from "@/components/manage/manage-new-club-page";
import { getCurrentPlayer } from "@/lib/auth";

export default async function ManageNewClubRoute() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login?next=/manage/clubs/new");
  }
  if (!player.isVerified) {
    redirect("/cabinet");
  }

  return <ManageNewClubPage ownerPhone={player.phone} />;
}
