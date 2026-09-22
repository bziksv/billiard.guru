import {
  COOKIE_CONSENT_COOKIE,
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_MAX_AGE_SEC,
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_VALUE,
} from "@/lib/legal";

export function hasClientAnalyticsConsent(): boolean {
  try {
    if (localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === COOKIE_CONSENT_VALUE) {
      return true;
    }
  } catch {
    /* ignore */
  }
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim() === `${COOKIE_CONSENT_COOKIE}=${COOKIE_CONSENT_VALUE}`);
}

/** Persist consent (localStorage + cookie) and optionally notify PageviewBeacon. */
export function persistCookieConsentClient(options?: { notify?: boolean }): void {
  const notify = options?.notify !== false;

  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, COOKIE_CONSENT_VALUE);
  } catch {
    /* ignore */
  }

  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_CONSENT_COOKIE}=${COOKIE_CONSENT_VALUE}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE_SEC}; SameSite=Lax${secure}`;

  if (notify) {
    window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
  }
}

/** Ensure cookie exists for API gate without re-firing analytics. */
export function syncCookieConsentFromStorage(): boolean {
  try {
    if (localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) !== COOKIE_CONSENT_VALUE) {
      return false;
    }
  } catch {
    return hasClientAnalyticsConsent();
  }
  const hasCookie = document.cookie
    .split(";")
    .some((c) => c.trim() === `${COOKIE_CONSENT_COOKIE}=${COOKIE_CONSENT_VALUE}`);
  if (!hasCookie) {
    persistCookieConsentClient({ notify: false });
  }
  return true;
}
