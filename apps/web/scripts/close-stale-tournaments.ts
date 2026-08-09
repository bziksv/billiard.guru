import { closeStaleTournaments } from "../src/lib/tournament-stale";
import { prisma } from "../src/lib/prisma";

async function main() {
  const n = await closeStaleTournaments({ force: true });
  const by = await prisma.tournament.groupBy({ by: ["status"], _count: true });
  console.log("closed", n);
  console.log(by);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
