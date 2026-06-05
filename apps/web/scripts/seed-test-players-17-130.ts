/**
 * Добавляет тестовых игроков Тест17 … Тест130 (Тест1–16 уже в seed).
 * Запуск: npx tsx scripts/seed-test-players-17-130.ts
 */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/prisma";
import { randomTestPlayerRating, testPlayerPhone } from "../prisma/seed-data/test-players";

const prisma = createPrismaClient();

async function main() {
  const voronezh = await prisma.city.findFirst({
    where: { nameRu: "Воронеж" },
  });
  if (!voronezh) {
    throw new Error("Город Воронеж не найден — сначала npm run db:seed");
  }

  for (let i = 17; i <= 130; i++) {
    const phone = testPlayerPhone(i);
    const rating = randomTestPlayerRating();
    await prisma.player.upsert({
      where: { phone },
      update: {
        firstName: "Игрок",
        lastName: `Тест${i}`,
        cityId: voronezh.id,
        isVerified: true,
        rating,
        confirmToken: null,
      },
      create: {
        firstName: "Игрок",
        lastName: `Тест${i}`,
        cityId: voronezh.id,
        phone,
        isVerified: true,
        rating,
        telegramUsername: `test_player_${i}`,
      },
    });
  }

  console.log("Test players: Тест17 … Тест130");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
