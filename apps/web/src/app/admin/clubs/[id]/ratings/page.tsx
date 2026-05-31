import { notFound } from "next/navigation";
import { ClubPlayerRatingsPanel } from "@/components/admin/club-player-ratings";
import { prisma } from "@/lib/prisma";

export default async function ClubPlayerRatingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const club = await prisma.club.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!club) notFound();

  return <ClubPlayerRatingsPanel clubId={club.id} clubName={club.name} />;
}
