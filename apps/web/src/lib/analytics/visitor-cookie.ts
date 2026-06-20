import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { VISITOR_COOKIE, VISITOR_TTL_MS } from "@/lib/analytics/constants";

const VISITOR_ID_RE = /^[0-9a-f-]{36}$/i;

export function visitorCookieOptions(id: string) {
  return {
    name: VISITOR_COOKIE,
    value: id,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_TTL_MS / 1000,
  };
}

export async function getOrCreateVisitorId(): Promise<{ id: string; isNew: boolean }> {
  const jar = await cookies();
  const existing = jar.get(VISITOR_COOKIE)?.value;
  if (existing && VISITOR_ID_RE.test(existing)) {
    return { id: existing, isNew: false };
  }
  return { id: randomUUID(), isNew: true };
}
