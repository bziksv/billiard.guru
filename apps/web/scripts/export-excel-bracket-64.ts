/**
 * Экспорт позиций # из 64-16 ×2gr.xls → JSON для /admin/brackets.
 *   cd apps/web && npx tsx scripts/export-excel-bracket-64.ts
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(__dirname, "export-excel-bracket-64.py");
execSync(`python3 "${script}"`, { stdio: "inherit" });
