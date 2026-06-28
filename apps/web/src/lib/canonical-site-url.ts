const DEFAULT_ORIGIN = "https://billiard.guru";

/** Канонический origin без www — для metadataBase, sitemap, canonical. */
export function getCanonicalSiteOrigin(raw = process.env.NEXT_PUBLIC_APP_URL): string {
  const value = raw?.trim() || DEFAULT_ORIGIN;
  try {
    const url = new URL(value);
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
    }
    return url.origin;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

export function isWwwHost(host: string): boolean {
  const normalized = host.toLowerCase().split(",")[0]?.trim() ?? "";
  return normalized.startsWith("www.");
}

export function stripWwwHost(host: string): string {
  const normalized = host.split(",")[0]?.trim() ?? host;
  return normalized.startsWith("www.") ? normalized.slice(4) : normalized;
}

export function isLocalDevHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.startsWith("localhost") ||
    h.startsWith("127.0.0.1") ||
    h.endsWith(".local") ||
    h.includes(":")
  );
}

/**
 * База для публичных ссылок в Telegram-уведомлениях/боте.
 * Берём NEXT_PUBLIC_APP_URL → APP_URL, но НИКОГДА не отдаём localhost:
 * в проде APP_URL=http://localhost:3010, а Telegram отклоняет inline-кнопки
 * с localhost-URL («Wrong HTTP URL») — и сообщение целиком не отправляется.
 * Не зависим от NODE_ENV (на Passenger он может быть не задан).
 */
export function getNotificationLinkBase(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL)?.trim();
  if (raw) {
    const trimmed = raw.replace(/\/$/, "");
    try {
      const host = new URL(trimmed).hostname.toLowerCase();
      const isLocal =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "0.0.0.0" ||
        host.endsWith(".local");
      if (!isLocal) return trimmed;
    } catch {
      // невалидный URL — отдаём канонический origin
    }
  }
  return getCanonicalSiteOrigin();
}
