import { clubOwnedByPlayer, type ClubOwnerFields, type PlayerOwnerFields } from "@/lib/club-access";
import { listClubsOwnedByPlayer } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";

export type ClubListItem = {
  id: string;
  name: string;
  city: { nameRu: string };
};

export async function isClubStaffMember(clubId: string, playerId: string): Promise<boolean> {
  const row = await prisma.clubStaff.findUnique({
    where: { clubId_playerId: { clubId, playerId } },
    select: { id: true },
  });
  return Boolean(row);
}

/** Владелец клуба (телефон / Telegram клуба) или назначенный сотрудник. */
export async function playerCanManageClub(
  club: ClubOwnerFields & { id: string },
  player: PlayerOwnerFields & { id: string } | null | undefined,
): Promise<boolean> {
  if (!player) return false;
  if (clubOwnedByPlayer(club, player)) return true;
  return isClubStaffMember(club.id, player.id);
}

export function requireClubOwnerOnly(
  club: ClubOwnerFields,
  player: PlayerOwnerFields | null | undefined,
): string | null {
  if (!player) return "Требуется вход";
  if (!clubOwnedByPlayer(club, player)) {
    return "Только владелец клуба может управлять сотрудниками";
  }
  return null;
}

export async function listClubsManagedByPlayer(player: {
  id: string;
  phone: string;
  telegramId: string | null;
}): Promise<ClubListItem[]> {
  const owned = await listClubsOwnedByPlayer(player);
  const byId = new Map(owned.map((c) => [c.id, c]));

  const staffRows = await prisma.clubStaff.findMany({
    where: { playerId: player.id },
    select: {
      club: {
        select: { id: true, name: true, city: { select: { nameRu: true } } },
      },
    },
  });

  for (const row of staffRows) {
    if (!byId.has(row.club.id)) byId.set(row.club.id, row.club);
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export async function listClubStaff(clubId: string) {
  return prisma.clubStaff.findMany({
    where: { clubId },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          telegramUsername: true,
          isVerified: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
