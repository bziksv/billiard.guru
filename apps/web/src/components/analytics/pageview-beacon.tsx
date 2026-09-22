"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AnalyticsSurfaceId } from "@/lib/analytics/constants";
import { hasClientAnalyticsConsent } from "@/lib/cookie-consent-client";
import { COOKIE_CONSENT_EVENT } from "@/lib/legal";

export function PageviewBeacon({ surface }: { surface: AnalyticsSurfaceId }) {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);
  const [consentTick, setConsentTick] = useState(0);

  useEffect(() => {
    if (surface !== "MARKETING") return;
    const onConsent = () => {
      lastSent.current = null;
      setConsentTick((n) => n + 1);
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
  }, [surface]);

  useEffect(() => {
    if (!pathname) return;
    if (surface === "MARKETING" && !hasClientAnalyticsConsent()) return;
    const key = `${surface}:${pathname}`;
    if (lastSent.current === key) return;
    lastSent.current = key;

    const referrer =
      typeof document !== "undefined" && document.referrer
        ? document.referrer.slice(0, 512)
        : undefined;

    const timezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : undefined;

    void fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, surface, referrer, timezone }),
      keepalive: true,
    }).catch(() => {
      /* ignore */
    });
  }, [pathname, surface, consentTick]);

  return null;
}
