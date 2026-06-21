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
