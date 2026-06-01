import { redirect } from "next/navigation";
import { getAccessibleOwnedClubs } from "@/lib/club-owner-access";

export default async function CabinetClubRedirect() {
  const clubs = await getAccessibleOwnedClubs();
  if (clubs.length === 0) redirect("/cabinet");
  if (clubs.length === 1) redirect(`/manage/clubs/${clubs[0]!.id}`);
  redirect("/manage");
}
