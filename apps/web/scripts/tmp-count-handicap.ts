import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(".env"), override: true });
import { createPrismaClient } from "../src/lib/prisma";

async function main() {
  const prisma = createPrismaClient();
  const off = await prisma.tournament.groupBy({
    by: ["status"],
    where: { handicapHalfStep: false },
    _count: true,
  });
  const on = await prisma.tournament.count({ where: { handicapHalfStep: true } });
  const offTotal = await prisma.tournament.count({
    where: { handicapHalfStep: false },
  });
  console.log("halfStep ON:", on);
  console.log("halfStep OFF:", offTotal, JSON.stringify(off));

  const defs = await prisma.tournamentDefaults.findMany({
    select: { id: true, clubId: true, handicapHalfStep: true },
  });
  console.log("defaults", defs);

  const samples = await prisma.tournament.findMany({
    where: { handicapHalfStep: false },
    select: { id: true, name: true, status: true, startsAt: true },
    orderBy: { startsAt: "desc" },
    take: 20,
  });
  console.log("recent OFF:");
  for (const s of samples) {
    console.log(
      `  ${s.status.padEnd(12)} ${(s.startsAt?.toISOString()?.slice(0, 10) ?? "?").padEnd(10)} ${s.name.slice(0, 55)}`,
    );
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
