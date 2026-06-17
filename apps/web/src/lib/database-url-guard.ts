const SHARED_DB_HOST_HINTS = ["beget.tech", "billiard.guru"] as const;

function databaseHost(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  try {
    const normalized = rawUrl.replace(/^mysql:\/\//, "http://");
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Одна общая БД Beget для dev и prod — нормальный режим проекта. */
export function isSharedProductionDatabaseUrl(rawUrl: string | undefined): boolean {
  const host = databaseHost(rawUrl);
  if (!host) return false;
  return SHARED_DB_HOST_HINTS.some((hint) => host.includes(hint));
}
