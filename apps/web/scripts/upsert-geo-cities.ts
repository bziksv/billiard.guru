import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { createPrismaClient } from "../src/lib/prisma";
import { GEO_DATA } from "../prisma/seed-data/geo";
import { CITY_COORDINATES } from "../prisma/seed-data/city-coordinates";

async function main() {
  const prisma = createPrismaClient();
  let cities = 0;
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
      cities += 1;
      if (cities % 50 === 0) console.log("upserted", cities, "last", cityName);
    }
  }
  const ru = await prisma.city.count({
    where: { country: { nameRu: "Россия" } },
  });
  console.log("done, total cities processed", cities, "Russia in DB", ru);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
