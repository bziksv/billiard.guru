import { cookies } from "next/headers";
import type { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const VIEW_AS_PLAYER_COOKIE = "setka_view_as_player";
export const VIEW_AS_CLUB_COOKIE = "setka_view_as_club";
const PREVIEW_TTL_SEC = 4 * 60 * 60;

export type ImpersonationState = {
  playerId: string | null;
  clubId: string | null;
  playerName?: string;
  clubName?: string;
};

export function previewCookieOptions(name: string, value: string) {
  return {
    name,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PREVIEW_TTL_SEC,
  };
}

export function clearPreviewCookie(name: string) {
  return {
    name,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

/** Активен только если реальная сессия — SUPERADMIN. */
export async function getImpersonationState(
  realRole: UserRole | null,
): Promise<ImpersonationState | null> {
  if (realRole !== "SUPERADMIN") return null;

  const cookieStore = await cookies();
  const playerId = cookieStore.get(VIEW_AS_PLAYER_COOKIE)?.value ?? null;
  const clubId = cookieStore.get(VIEW_AS_CLUB_COOKIE)?.value ?? null;
  if (!playerId && !clubId) return null;

  const [player, club] = await Promise.all([
    playerId
      ? prisma.player.findUnique({
          where: { id: playerId },
          select: { firstName: true, lastName: true },
        })
      : null,
    clubId
      ? prisma.club.findUnique({ where: { id: clubId }, select: { name: true } })
      : null,
  ]);

  return {
    playerId,
    clubId,
    playerName: player ? `${player.lastName} ${player.firstName}` : undefined,
    clubName: club?.name,
  };
}

export async function findPlayerForClub(clubId: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { phone: true, telegramId: true },
  });
  if (!club) return null;

  const or: Array<{ phone: string } | { telegramId: string }> = [{ phone: club.phone }];
  if (club.telegramId) or.push({ telegramId: club.telegramId });

  return prisma.player.findFirst({
    where: { OR: or },
    include: { city: { include: { country: true } } },
  });
}

export async function listClubsOwnedByPlayer(player: {
  phone: string;
  telegramId: string | null;
}) {
  const or: Array<{ phone: string } | { telegramId: string }> = [{ phone: player.phone }];
  if (player.telegramId) or.push({ telegramId: player.telegramId });

  return prisma.club.findMany({
    where: { OR: or },
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: { select: { nameRu: true } } },
  });
}
