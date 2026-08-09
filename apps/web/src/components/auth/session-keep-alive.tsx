"use client";

import { useEffect } from "react";

/** Пинг сессии, чтобы cookie продлевалась при работе в админке/кабинете. */
const PING_INTERVAL_MS = 15 * 60 * 1000;

export function SessionKeepAlive() {
  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (cancelled || document.visibilityState === "hidden") return;
      try {
        await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
      } catch {
        /* ignore */
      }
    }

    void ping();
    const id = window.setInterval(() => void ping(), PING_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void ping();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
