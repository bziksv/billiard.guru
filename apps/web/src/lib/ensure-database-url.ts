import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { resolve, join } from "path";
import { parse } from "dotenv";

/**
 * Shell env (e.g. ~/.zshrc) can export a stale DATABASE_URL that overrides .env.
 * Load full .env for standalone (Passenger cwd = .next/standalone).
 */
export function ensureDatabaseUrlFromEnvFile() {
  const candidates: string[] = [];
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    candidates.push(join(dir, ".env"));
    candidates.push(join(dir, "apps/web/.env"));
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;

    const parsed = parse(readFileSync(envPath, "utf-8"));
    config({ path: envPath, override: false });

    // apps/web/.env always wins over stale shell DATABASE_URL (e.g. from ~/.zshrc)
    if (parsed.DATABASE_URL) {
      process.env.DATABASE_URL = parsed.DATABASE_URL;
      return;
    }
  }
}
