import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { createPrismaClient } from "../src/lib/prisma";
import { GEO_DATA } from "./seed-data/geo";
import { CITY_COORDINATES } from "./seed-data/city-coordinates";

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
