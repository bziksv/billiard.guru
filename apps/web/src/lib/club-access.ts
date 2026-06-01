export type ClubOwnerFields = {
  phone: string;
  telegramId: string | null;
};

export type PlayerOwnerFields = {
  id?: string;
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
