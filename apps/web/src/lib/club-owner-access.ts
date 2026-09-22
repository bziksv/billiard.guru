import { clubOwnedByPlayer } from "@/lib/club-access";
import { getCurrentPlayer, getImpersonation, getRealPlayer, getSession } from "@/lib/auth";
import { listClubsOwnedByPlayer } from "@/lib/impersonate";
import { listClubsManagedByPlayer, playerCanManageClub } from "@/lib/club-staff";
import { prisma } from "@/lib/prisma";

export type ManageClubNavItem = {
  id: string;
  name: string;
  city?: { nameRu: string } | null;
  isOwner: boolean;
};

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

/** True if current viewer is club owner (or SA). Staff → false. */
export async function viewerIsClubOwner(
  club: { phone: string; telegramId: string | null },
): Promise<boolean> {
  const real = await getRealPlayer();
  if (real?.role === "SUPERADMIN") return true;
  const player = await getCurrentPlayer();
  if (!player) return false;
  return clubOwnedByPlayer(club, player);
}

export async function getAccessibleOwnedClubs(): Promise<ManageClubNavItem[]> {
  const session = await getSession();
  if (!session) return [];

  const impersonation = await getImpersonation();

  if (session.role === "SUPERADMIN" && impersonation?.clubId) {
    const club = await prisma.club.findUnique({
      where: { id: impersonation.clubId },
      select: { id: true, name: true, city: { select: { nameRu: true } } },
    });
    // Preview as club → owner UX for staff nav.
    return club ? [{ ...club, isOwner: true }] : [];
  }

  const player = await getCurrentPlayer();
  if (!player) return [];

  const [managed, owned] = await Promise.all([
    listClubsManagedByPlayer(player),
    listClubsOwnedByPlayer(player),
  ]);
  const ownedIds = new Set(owned.map((c) => c.id));
  const isSa = session.role === "SUPERADMIN";

  return managed.map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    isOwner: isSa || ownedIds.has(c.id),
  }));
}

export async function isClubOwnerForClub(
  club: { phone: string; telegramId: string | null },
  player: { phone: string; telegramId: string | null; role?: string } | null,
): Promise<boolean> {
  return clubOwnedByPlayer(club, player);
}
