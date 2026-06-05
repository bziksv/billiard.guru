/**
 * PNG планировки клуба (для проверки и отладки бота).
 *
 *   cd apps/web && npx tsx scripts/render-floor-plan-image.ts --club-id <id>
 *   cd apps/web && npx tsx scripts/render-floor-plan-image.ts --club-name "Клуб Тест"
 */
import { mkdir, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { config } from "dotenv";
import { prisma } from "../src/lib/prisma";
import { renderFloorPlanPngForBooking } from "../src/lib/floor-plan-image";
import type { ClubTableFormatId } from "../src/lib/club-table-formats";

config({ path: resolve(__dirname, "../.env"), override: true });

function arg(name: string) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const clubId = arg("--club-id");
  const clubName = arg("--club-name");
  const format = (arg("--format") ?? "PYRAMID") as ClubTableFormatId;
  const out = arg("--out") ?? resolve(__dirname, "../tmp/floor-plan-preview.png");

  const club = clubId
    ? await prisma.club.findUnique({ where: { id: clubId } })
    : await prisma.club.findFirst({
        where: clubName ? { name: { contains: clubName } } : { bookingEnabled: true },
        orderBy: { name: "asc" },
      });

  if (!club) {
    console.error("Клуб не найден");
    process.exit(1);
  }

  const png = await renderFloorPlanPngForBooking(
    club.floorPlan,
    format,
    [],
  );
  if (!png) {
    console.error("Не удалось сгенерировать PNG (нет планировки?)");
    process.exit(1);
  }

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, png);
  console.log(`✓ ${club.name} → ${out} (${png.length} bytes)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
