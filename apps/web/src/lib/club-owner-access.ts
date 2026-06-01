import { clubOwnedByPlayer } from "@/lib/club-access";
import { getImpersonation, getSession } from "@/lib/auth";
import { listClubsManagedByPlayer, playerCanManageClub } from "@/lib/club-staff";
import { prisma } from "@/lib/prisma";

export async function requireClubOwnerPageAccess(clubId: string) {
  const session = await getSession();
  if (!session) return { allowed: false as const, reason: "login" as const };

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { city: { include: { country: true } } },
  });
  if (!club) return { allowed: false as const, reason: "not_found" as const };

  const impersonation = await getImpersonation();

  if (session.role === "SUPERADMIN") {
    if (impersonation?.clubId === clubId) {
      return { allowed: true as const, club, preview: true as const };
    }
    const player = await prisma.player.findUnique({ where: { id: session.playerId } });
    if (player && (await playerCanManageClub(club, player))) {
      return { allowed: true as const, club, preview: false as const };
    }
    if (impersonation?.playerId) {
      const viewPlayer = await prisma.player.findUnique({
        where: { id: impersonation.playerId },
      });
      if (viewPlayer && (await playerCanManageClub(club, viewPlayer))) {
        return { allowed: true as const, club, preview: true as const };
      }
    }
    return { allowed: false as const, reason: "forbidden" as const };
  }

  const player = await prisma.player.findUnique({
    where: { id: session.playerId },
  });
  if (!player || !(await playerCanManageClub(club, player))) {
    return { allowed: false as const, reason: "forbidden" as const };
  }

  return { allowed: true as const, club, preview: false as const };
}

export async function getAccessibleOwnedClubs() {
  const session = await getSession();
  if (!session) return [];

  const impersonation = await getImpersonation();

  if (session.role === "SUPERADMIN" && impersonation?.clubId) {
    const club = await prisma.club.findUnique({
      where: { id: impersonation.clubId },
      select: { id: true, name: true, city: { select: { nameRu: true } } },
    });
    return club ? [club] : [];
  }

  const { getCurrentPlayer } = await import("@/lib/auth");
  const player = await getCurrentPlayer();
  if (!player) return [];

  return listClubsManagedByPlayer(player);
}

export async function isClubOwnerForClub(
  club: { phone: string; telegramId: string | null },
  player: { phone: string; telegramId: string | null; role?: string } | null,
): Promise<boolean> {
  return clubOwnedByPlayer(club, player);
}
