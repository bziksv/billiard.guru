type ClubOwnerFields = {
  phone: string;
  telegramId: string | null;
};

type PlayerOwnerFields = {
  phone: string;
  telegramId: string | null;
  role?: string;
};

export function clubOwnedByPlayer(
  club: ClubOwnerFields,
  player: PlayerOwnerFields | null | undefined,
): boolean {
  if (!player) return false;
  if (player.role === "SUPERADMIN") return true;
  if (player.telegramId && club.telegramId === player.telegramId) return true;
  if (club.phone === player.phone) return true;
  return false;
}
