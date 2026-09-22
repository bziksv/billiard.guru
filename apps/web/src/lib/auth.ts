import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { UserRole } from "@/generated/prisma/client";
import { getImpersonationState } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from "@/lib/session";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getImpersonation() {
  const session = await getSession();
  if (!session) return null;
  return getImpersonationState(session.role, session.playerId);
}

export async function getCurrentPlayer() {
  const session = await getSession();
  if (!session) return null;

  const impersonation = await getImpersonationState(session.role, session.playerId);
  const playerId = impersonation?.playerId ?? session.playerId;

  return prisma.player.findUnique({
    where: { id: playerId },
    include: { city: { include: { country: true } } },
  });
}

/** Реальный игрок из сессии (без режима просмотра). */
export async function getRealPlayer() {
  const session = await getSession();
  if (!session) return null;
  return prisma.player.findUnique({
    where: { id: session.playerId },
    include: { city: { include: { country: true } } },
  });
}

/**
 * H5: admin preview is read-only. Blocks mutations while view-as cookies are set.
 * No-op when preview is inactive.
 */
export async function assertNotPreviewWrite() {
  const session = await getSession();
  if (!session) return;
  const impersonation = await getImpersonationState(session.role, session.playerId);
  if (impersonation?.playerId || impersonation?.clubId) {
    throw new AuthError(
      "Режим просмотра: только чтение. Выйдите из preview, чтобы изменять данные.",
      403,
    );
  }
}

/** Current player for mutations — fails closed in preview. */
export async function requireWritablePlayer() {
  await assertNotPreviewWrite();
  const player = await getCurrentPlayer();
  if (!player) {
    throw new AuthError("Требуется вход", 401);
  }
  return player;
}

export async function requireSession(options?: { superadmin?: boolean }) {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Требуется вход", 401);
  }
  if (options?.superadmin) {
    const real = await getRealPlayer();
    if (!real || real.role !== "SUPERADMIN") {
      throw new AuthError("Недостаточно прав", 403);
    }
  }
  return session;
}

export async function requireSuperAdmin() {
  return requireSession({ superadmin: true });
}

/** SUPERADMIN mutations — blocked while view-as preview cookies are set. */
export async function requireWritableSuperAdmin() {
  await assertNotPreviewWrite();
  return requireSuperAdmin();
}

/** Logged-in admin or anyone who manages at least one club (tournament roster UIs). */
export async function requirePlayersDirectoryAccess() {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Требуется вход", 401);
  }
  const real = await getRealPlayer();
  if (real?.role === "SUPERADMIN") {
    return { session, player: real, mode: "admin" as const };
  }
  const player = await getCurrentPlayer();
  if (!player) {
    throw new AuthError("Требуется вход", 401);
  }
  const { listClubsManagedByPlayer } = await import("@/lib/club-staff");
  const clubs = await listClubsManagedByPlayer(player);
  if (clubs.length === 0) {
    throw new AuthError("Недостаточно прав", 403);
  }
  return { session, player, mode: "manage" as const };
}

export function isSuperAdmin(role: UserRole) {
  return role === "SUPERADMIN";
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}
