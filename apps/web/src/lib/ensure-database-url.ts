import { existsSync, readFileSync } from "fs";
import { resolve, join } from "path";
import { parse } from "dotenv";

/**
 * Shell env (e.g. ~/.zshrc) can export a stale DATABASE_URL that overrides .env.
 * For this app, apps/web/.env is the source of truth.
 */
export function ensureDatabaseUrlFromEnvFile() {
  if (process.env.DATABASE_URL) return;

  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    for (const rel of [".env", "apps/web/.env"]) {
      const envPath = join(dir, rel);
      if (!existsSync(envPath)) continue;

      const parsed = parse(readFileSync(envPath, "utf-8"));
      if (parsed.DATABASE_URL) {
        process.env.DATABASE_URL = parsed.DATABASE_URL;
        return;
      }
    }

    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
}
