import { redirect } from "next/navigation";
import { ManageShell } from "@/components/manage/manage-shell";
import { getCurrentPlayer } from "@/lib/auth";
import { getAccessibleOwnedClubs } from "@/lib/club-owner-access";

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login?next=/manage");
  }

  const clubs = await getAccessibleOwnedClubs();
  if (clubs.length === 0) {
    redirect("/cabinet");
  }

  return (
    <ManageShell
      userName={`${player.lastName} ${player.firstName}`}
      clubs={clubs}
    >
      {children}
    </ManageShell>
  );
}
