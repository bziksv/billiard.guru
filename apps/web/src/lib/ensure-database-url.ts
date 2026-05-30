import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { parse } from "dotenv";

/**
 * Shell env (e.g. ~/.zshrc) can export a stale DATABASE_URL that overrides .env.
 * For this app, apps/web/.env is the source of truth.
 */
export function ensureDatabaseUrlFromEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const parsed = parse(readFileSync(envPath, "utf-8"));
  if (parsed.DATABASE_URL) {
    process.env.DATABASE_URL = parsed.DATABASE_URL;
  }
}
