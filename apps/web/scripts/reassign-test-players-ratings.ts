/**
 * Переназначает рейтинги Тест1 … Тест130: 0–6, шаг 0,5, случайно.
 * npx tsx scripts/reassign-test-players-ratings.ts
 */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/prisma";
import { randomTestPlayerRating } from "../prisma/seed-data/test-players";

const prisma = createPrismaClient();

async function main() {
  let updated = 0;
  for (let i = 1; i <= 130; i++) {
    const rating = randomTestPlayerRating(6);
    const result = await prisma.player.updateMany({
      where: {
        firstName: "Игрок",
        lastName: `Тест${i}`,
      },
      data: { rating },
    });
    if (result.count > 0) updated += result.count;
  }
  console.log(`Рейтинги обновлены: ${updated} игроков (Тест1 … Тест130, 0–6, шаг 0,5)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
