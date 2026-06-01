import { redirect } from "next/navigation";
import { ClubBookingSettingsEditor } from "@/components/club/club-booking-settings-editor";
import { requireClubOwnerPageAccess } from "@/lib/club-owner-access";

export default async function ManageClubBookingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireClubOwnerPageAccess(id);

  if (!access.allowed) {
    if (access.reason === "login") redirect(`/login?next=/manage/clubs/${id}/bookings`);
    redirect("/cabinet");
  }

  return <ClubBookingSettingsEditor clubId={id} clubName={access.club.name} />;
}
