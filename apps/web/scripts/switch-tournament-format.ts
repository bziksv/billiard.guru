/**
 * Сменить формат турнира и пересоздать сетку.
 * npx tsx scripts/switch-tournament-format.ts [tournamentId] [format]
 */
import { prisma } from "../src/lib/prisma";
import { regenerateBracket } from "../src/lib/bracket-service";

const tournamentId = process.argv[2] ?? "cmqf3zlvf00003i3kcusdpfnz";
const format = process.argv[3] ?? "FIXED_SWISS_128R8_2_3_mesta";

async function main() {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { name: true, format: true },
  });
  if (!t) throw new Error("Tournament not found");
  console.log(`Was: ${t.format}`);
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { format },
  });
  await regenerateBracket(prisma, tournamentId);
  const count = await prisma.tournamentMatch.count({
    where: { tournamentId },
  });
  console.log(`Now: ${format}, matches: ${count}`);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
