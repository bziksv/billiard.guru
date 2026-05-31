import { AuthError, getCurrentPlayer } from "@/lib/auth";
import { clubOwnedByPlayer } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

export async function requireClubManageAccess(clubId: string) {
  const player = await getCurrentPlayer();
  if (!player) {
    throw new AuthError("Требуется вход", 401);
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { city: { include: { country: true } } },
  });
  if (!club) {
    throw new AuthError("Клуб не найден", 404);
  }

  if (player.role !== "SUPERADMIN" && !clubOwnedByPlayer(club, player)) {
    throw new AuthError("Недостаточно прав", 403);
  }

  return { player, club };
}

/** Рейтинг игрока в контексте клуба: клубный индекс или общий системный. */
export async function getPlayerRatingInClub(
  playerId: string,
  clubId: string,
  systemRating: number,
): Promise<number> {
  const row = await prisma.clubPlayerRating.findUnique({
    where: { clubId_playerId: { clubId, playerId } },
  });
  return row?.rating ?? systemRating;
}
