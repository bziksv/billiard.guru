/**
 * Проверка уникальности title, description и keywords для всех SEO-записей.
 * npx tsx scripts/verify-seo-uniqueness.ts
 */
import { collectAllSeoEntries, validateSeoUniqueness } from "../src/lib/seo";

const entries = collectAllSeoEntries();
const errors = validateSeoUniqueness(entries);

if (errors.length > 0) {
  console.error("SEO uniqueness errors:\n");
  for (const e of errors) console.error("  •", e);
  process.exit(1);
}

console.log(`SEO OK: ${entries.length} entries, all titles/descriptions/keywords unique.`);
