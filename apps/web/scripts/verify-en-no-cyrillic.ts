/**
 * Fail if Cyrillic appears in EN content files (except allowlisted tokens).
 * npx tsx scripts/verify-en-no-cyrillic.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");
const CYRILLIC = /[А-Яа-яЁё]/;

const SCAN_DIRS = [
  "lib/billiard-rules/en",
  "lib/bracket-formats/en",
  "lib/legal/en",
];

/** Tokens that may legitimately contain Cyrillic in EN files. */
const ALLOWLIST = new Set<string>(["billiard.guru"]);

function scanFile(filePath: string): string[] {
  const rel = relative(process.cwd(), filePath);
  const content = readFileSync(filePath, "utf8");
  const errors: string[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!CYRILLIC.test(line)) continue;
    const trimmed = line.trim();
    if ([...ALLOWLIST].some((token) => trimmed.includes(token) && !CYRILLIC.test(trimmed.replace(token, "")))) {
      continue;
    }
    errors.push(`${rel}:${i + 1}: ${trimmed.slice(0, 120)}`);
  }
  return errors;
}

function walkDir(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkDir(full, files);
    else if (/\.(ts|tsx|json)$/.test(name)) files.push(full);
  }
  return files;
}

const errors: string[] = [];
for (const dir of SCAN_DIRS) {
  const abs = join(ROOT, dir);
  for (const file of walkDir(abs)) {
    errors.push(...scanFile(file));
  }
}

if (errors.length > 0) {
  console.error("Cyrillic found in EN content files:\n");
  for (const e of errors) console.error("  •", e);
  process.exit(1);
}

console.log("EN content OK: no unexpected Cyrillic in scanned files.");
