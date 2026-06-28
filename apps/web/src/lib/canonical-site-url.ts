const DEFAULT_ORIGIN = "https://billiard.guru";

/** localhost / loopback / *.local — никогда не годятся как публичный origin. */
function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.endsWith(".local")
  );
}

/** Канонический origin без www — для metadataBase, sitemap, canonical. */
export function getCanonicalSiteOrigin(raw = process.env.NEXT_PUBLIC_APP_URL): string {
  const value = raw?.trim() || DEFAULT_ORIGIN;
  try {
    const url = new URL(value);
    // На проде APP_URL/NEXT_PUBLIC_APP_URL может быть localhost — для публичных
    // ссылок (SEO, sitemap, canonical) это всегда ошибка.
    if (isLocalHostname(url.hostname)) {
      return DEFAULT_ORIGIN;
    }
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
  for (const raw of [process.env.NEXT_PUBLIC_APP_URL, process.env.APP_URL]) {
    const trimmed = raw?.trim().replace(/\/$/, "");
    if (!trimmed) continue;
    try {
      if (!isLocalHostname(new URL(trimmed).hostname)) return trimmed;
    } catch {
      // невалидный URL — пробуем следующий, иначе DEFAULT_ORIGIN
    }
  }
  // Жёсткий fallback: НЕ через getCanonicalSiteOrigin (она читает тот же
  // NEXT_PUBLIC_APP_URL=localhost) — иначе вернулся бы localhost.
  return DEFAULT_ORIGIN;
}
