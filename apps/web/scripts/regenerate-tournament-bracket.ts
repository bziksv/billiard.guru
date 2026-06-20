import { prisma } from "../src/lib/prisma";
import { regenerateBracket } from "../src/lib/bracket-service";

const tournamentId = process.argv[2] ?? "cmqf3zlvf00003i3kcusdpfnz";

async function main() {
  await regenerateBracket(prisma, tournamentId);
  const count = await prisma.tournamentMatch.count({ where: { tournamentId } });
  const maxRound = await prisma.tournamentMatch.aggregate({
    where: { tournamentId },
    _max: { round: true },
  });
  console.log(
    `OK: ${tournamentId} — ${count} matches, maxRound ${maxRound._max.round}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
