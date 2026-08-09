import { createHmac, timingSafeEqual } from "crypto";
import type { UserRole } from "@/generated/prisma/client";

export const SESSION_COOKIE = "setka_session";

/** Срок сессии для всех ролей (скользящее продление при активности). */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Продлевать cookie, если осталось меньше половины TTL. */
const SESSION_REFRESH_RATIO = 0.5;

export interface SessionPayload {
  playerId: string;
  role: UserRole;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return secret;
}

/** Cookie Secure: prod или явный HTTPS (Passenger иногда без NODE_ENV). */
export function sessionCookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "1") return true;
  if (process.env.COOKIE_SECURE === "0") return false;
  if (process.env.NODE_ENV === "production") return true;
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  return appUrl.startsWith("https://");
}

export function createSessionToken(playerId: string, role: UserRole): string {
  const payload: SessionPayload = {
    playerId,
    role,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;

    const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!payload.playerId || !payload.role || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

/** Нужно ли перевыпустить cookie (скользящая сессия). */
export function shouldRefreshSession(payload: SessionPayload): boolean {
  const remaining = payload.exp - Date.now();
  return remaining < SESSION_TTL_MS * SESSION_REFRESH_RATIO;
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

/** Опции для очистки cookie — те же флаги, что при выдаче. */
export function clearSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: 0,
  };
}
