/** Парсинг DATABASE_URL (mysql/mariadb) для CLI и адаптера. */
export function parseDatabaseUrl(raw: string) {
  const normalized = raw.replace(/^mysql:\/\//, "mariadb://");
  const url = new URL(normalized);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
}

export function getDatabaseUrlFromEnv(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL не задан");
  }
  return raw;
}
