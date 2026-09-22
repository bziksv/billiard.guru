import { cookies } from "next/headers";
import {
  COOKIE_CONSENT_COOKIE,
  COOKIE_CONSENT_MAX_AGE_SEC,
  COOKIE_CONSENT_VALUE,
} from "@/lib/legal";

export function cookieConsentCookieOptions() {
  return {
    name: COOKIE_CONSENT_COOKIE,
    value: COOKIE_CONSENT_VALUE,
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_CONSENT_MAX_AGE_SEC,
  };
}

/** Marketing analytics allowed only with consent cookie. */
export async function hasMarketingAnalyticsConsent(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(COOKIE_CONSENT_COOKIE)?.value === COOKIE_CONSENT_VALUE;
}
