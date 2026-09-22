import { createHmac, timingSafeEqual } from "crypto";
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

function previewSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return secret;
}

/** Signed preview cookie: targetId + adminPlayerId bound via HMAC. */
export function signPreviewValue(targetId: string, adminPlayerId: string): string {
  const body = Buffer.from(
    JSON.stringify({ t: targetId, a: adminPlayerId }),
  ).toString("base64url");
  const sig = createHmac("sha256", previewSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPreviewValue(
  raw: string | undefined | null,
  adminPlayerId: string,
): string | null {
  if (!raw) return null;
  try {
    const [body, sig] = raw.split(".");
    if (!body || !sig) return null;
    const expected = createHmac("sha256", previewSecret()).update(body).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      t?: string;
      a?: string;
    };
    if (!payload.t || !payload.a) return null;
    if (payload.a !== adminPlayerId) return null;
    return payload.t;
  } catch {
    return null;
  }
}

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

/** Активен только если реальная сессия — SUPERADMIN и cookie подписана на этого admin. */
export async function getImpersonationState(
  realRole: UserRole | null,
  adminPlayerId?: string | null,
): Promise<ImpersonationState | null> {
  if (realRole !== "SUPERADMIN" || !adminPlayerId) return null;

  const cookieStore = await cookies();
  const playerId = verifyPreviewValue(
    cookieStore.get(VIEW_AS_PLAYER_COOKIE)?.value,
    adminPlayerId,
  );
  const clubId = verifyPreviewValue(
    cookieStore.get(VIEW_AS_CLUB_COOKIE)?.value,
    adminPlayerId,
  );
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
