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
  return getImpersonationState(session.role);
}

export async function getCurrentPlayer() {
  const session = await getSession();
  if (!session) return null;

  const impersonation = await getImpersonationState(session.role);
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

export async function requireSession(options?: { superadmin?: boolean }) {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Требуется вход", 401);
  }
  if (options?.superadmin && session.role !== "SUPERADMIN") {
    throw new AuthError("Недостаточно прав", 403);
  }
  return session;
}

export async function requireSuperAdmin() {
  return requireSession({ superadmin: true });
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
