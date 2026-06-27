/**
 * Конвертация демо-фото клуба в WebP (ресайз + сжатие) тем же конвейером,
 * что и загрузка фото клубов. Тест логики image-processing + подготовка ассетов.
 *
 * Usage: npx tsx scripts/convert-demo-club-photos.ts
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { processImageToWebp } from "../src/lib/image-processing";

const DEMO_DIR = path.join(process.cwd(), "public", "demo");
const FILES = ["club-test.jpg", "club-test-2.jpg", "club-test-3.jpg"];

function fmtKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} КБ`;
}

async function main() {
  for (const name of FILES) {
    const src = path.join(DEMO_DIR, name);
    const input = await readFile(src);
    const outName = name.replace(/\.jpg$/i, ".webp");
    const out = path.join(DEMO_DIR, outName);

    const webp = await processImageToWebp(input);
    await writeFile(out, webp);

    const inMeta = await sharp(input).metadata();
    const outMeta = await sharp(webp).metadata();
    console.log(
      `${name} (${inMeta.width}×${inMeta.height}, ${fmtKb(input.length)}, ${inMeta.format}) ` +
        `→ ${outName} (${outMeta.width}×${outMeta.height}, ${fmtKb(webp.length)}, ${outMeta.format}) ` +
        `· -${(100 - (webp.length / input.length) * 100).toFixed(0)}%`,
    );
  }
  console.log("Готово.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
