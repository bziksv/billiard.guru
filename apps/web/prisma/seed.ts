import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { createPrismaClient } from "../src/lib/prisma";
import { GEO_DATA } from "./seed-data/geo";
import { CITY_COORDINATES } from "./seed-data/city-coordinates";
import { randomTestPlayerRating, testPlayerPhone } from "./seed-data/test-players";

const prisma: PrismaClient = createPrismaClient();

async function main() {
  for (const entry of GEO_DATA) {
    const country = await prisma.country.upsert({
      where: { nameRu: entry.country },
      update: {},
      create: { nameRu: entry.country },
    });

    for (const cityName of entry.cities) {
      const coords = CITY_COORDINATES[cityName];
      await prisma.city.upsert({
        where: {
          countryId_nameRu: { countryId: country.id, nameRu: cityName },
        },
        update: {
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        },
        create: {
          nameRu: cityName,
          countryId: country.id,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        },
      });
    }
  }

  console.log(`Seeded ${GEO_DATA.length} countries`);

  await prisma.player.updateMany({
    where: { phone: "+79507775325" },
    data: { role: "SUPERADMIN" },
  });
  console.log("Superadmin: +79507775325");

  const voronezh = await prisma.city.findFirst({
    where: { nameRu: "Воронеж" },
  });
  if (!voronezh) {
    throw new Error("Город Воронеж не найден — сначала выполните seed geo");
  }

  for (let i = 1; i <= 300; i++) {
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
  console.log("Test players: Тест1 … Тест300 (+79000000001 … +79000000300)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
