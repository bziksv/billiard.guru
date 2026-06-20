"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { AnalyticsSurfaceId } from "@/lib/analytics/constants";
import { COOKIE_CONSENT_STORAGE_KEY } from "@/lib/legal";

function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function PageviewBeacon({ surface }: { surface: AnalyticsSurfaceId }) {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (surface === "MARKETING" && !hasAnalyticsConsent()) return;
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
  }, [pathname, surface]);

  return null;
}
