import { prisma } from "../src/lib/prisma";
import { fixedSwissMatchNo } from "../src/lib/fixed-swiss-grid";

const tournamentId = process.argv[2] ?? "cmqm4uori000d5r9w2t8y4h64";

async function main() {
  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    orderBy: [{ round: "asc" }, { slot: "asc" }],
    include: {
      team1: { include: { player1: true } },
      team2: { include: { player1: true } },
      winnerTeam: { include: { player1: true } },
    },
  });
  const mc = matches.length;
  const mr = Math.max(...matches.map((m) => m.round));
  const short = (id: string | null | undefined) => {
    if (!id) return "—";
    const m = matches.flatMap((x) => [x.team1, x.team2, x.winnerTeam]).find((t) => t?.id === id);
    return m?.player1?.name?.split(" ")[0] ?? id.slice(0, 8);
  };
  for (const m of matches) {
    const no = fixedSwissMatchNo(m.round, m.slot, mc, mr);
    console.log(
      `#${String(no).padStart(2)} ${short(m.team1Id)} vs ${short(m.team2Id)} → ${short(m.winnerTeamId)}`,
    );
  }
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true, name: true },
  });
  console.log(`\n${t?.name}\nStatus: ${t?.status}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
