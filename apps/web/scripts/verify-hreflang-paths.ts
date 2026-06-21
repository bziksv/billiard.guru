/**
 * Check hreflang pairs: every EN-ready path has matching RU and EN URLs.
 * npx tsx scripts/verify-hreflang-paths.ts
 */
import { EN_READY_EXACT, EN_READY_PREFIXES } from "../src/i18n/en-ready-paths";
import {
  getAllBilliardGameParams,
  getAllBilliardTableSlugs,
} from "../src/lib/billiard-rules/get-rules-content";
import { getAllBracketFormatSeoSlugs } from "../src/lib/bracket-formats/seo";
import { getAllLegalDocSlugs } from "../src/lib/legal-content";

function collectPaths(): string[] {
  const paths = new Set<string>(EN_READY_EXACT);

  for (const tableSlug of getAllBilliardTableSlugs("ru")) {
    paths.add(`/rules/${tableSlug}`);
  }
  for (const { tableSlug, gameSlug } of getAllBilliardGameParams("ru")) {
    paths.add(`/rules/${tableSlug}/${gameSlug}`);
  }
  for (const slug of getAllBracketFormatSeoSlugs()) {
    paths.add(`/brackets/${slug}`);
  }
  for (const doc of getAllLegalDocSlugs()) {
    paths.add(`/legal/${doc}`);
  }

  return [...paths].sort();
}

function isEnReady(path: string): boolean {
  if (EN_READY_EXACT.has(path)) return true;
  return EN_READY_PREFIXES.some((prefix) => path.startsWith(prefix));
}

const paths = collectPaths();
const errors: string[] = [];

for (const path of paths) {
  if (!isEnReady(path)) {
    errors.push(`path not in EN_READY scope: ${path}`);
  }
}

if (errors.length > 0) {
  console.error("Hreflang path errors:\n");
  for (const e of errors) console.error("  •", e);
  process.exit(1);
}

console.log(`Hreflang paths OK: ${paths.length} RU paths have EN scope.`);
