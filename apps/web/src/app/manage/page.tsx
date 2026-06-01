import { redirect } from "next/navigation";
import { getAccessibleOwnedClubs } from "@/lib/club-owner-access";

export default async function ManageIndexPage() {
  const clubs = await getAccessibleOwnedClubs();
  if (clubs.length === 0) redirect("/cabinet");
  redirect(`/manage/clubs/${clubs[0]!.id}`);
}
