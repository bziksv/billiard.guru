const PROD_DB_HOST_HINTS = ["beget.tech", "billiard.guru"] as const;

function databaseHost(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  try {
    const normalized = rawUrl.replace(/^mysql:\/\//, "http://");
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isProductionDatabaseUrl(rawUrl: string | undefined): boolean {
  const host = databaseHost(rawUrl);
  if (!host) return false;
  return PROD_DB_HOST_HINTS.some((hint) => host.includes(hint));
}

/** Dev against prod DB can break the live site when schema/data diverges from deployed code. */
export function warnIfDevelopmentUsesProductionDatabase(): void {
  if (process.env.NODE_ENV === "production") return;
  if (process.env.ALLOW_PRODUCTION_DATABASE === "1") return;

  const url = process.env.DATABASE_URL;
  if (!isProductionDatabaseUrl(url)) return;

  const host = databaseHost(url);
  // eslint-disable-next-line no-console -- intentional startup warning for developers
  console.warn(
    [
      "",
      "⚠️  DATABASE_URL указывает на боевую БД (" + (host ?? "?") + ").",
      "   Локальные правки (новые enum, форматы сеток) могут положить billiard.guru,",
      "   пока на сервере старый билд.",
      "   Используйте локальную MySQL (см. apps/web/.env.example) или ALLOW_PRODUCTION_DATABASE=1.",
      "",
    ].join("\n"),
  );
}
