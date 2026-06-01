import Link from "next/link";
import { redirect } from "next/navigation";
import { ClubNewsPanel } from "@/components/club/club-news-panel";
import { requireClubOwnerPageAccess } from "@/lib/club-owner-access";

export default async function ManageClubNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireClubOwnerPageAccess(id);

  if (!access.allowed) {
    if (access.reason === "login") redirect(`/login?next=/manage/clubs/${id}/news`);
    redirect("/cabinet");
  }

  return (
    <ClubNewsPanel
      clubId={id}
      clubName={access.club.name}
      siteHref={`/clubs/${id}#club-news`}
    />
  );
}
