import { prisma } from "../src/lib/prisma";
import { buildBracketMatchNumbers } from "../src/lib/tournament-match-schedule";
import { fixedSwissMatchNo } from "../src/lib/fixed-swiss-grid";
import { buildFixedSwissTemplate } from "../src/lib/fixed-swiss-grid";

const tid = process.argv[2] ?? "cmpylq3xb004cod3khmdqxu7r";

async function main() {
  const t = await prisma.tournament.findUnique({
    where: { id: tid },
    select: { format: true, name: true },
  });
  if (!t) {
    console.error("tournament not found");
    process.exit(1);
  }
  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId: tid },
    orderBy: [{ round: "asc" }, { slot: "asc" }],
    select: { id: true, round: true, slot: true },
  });
  const maxRound = Math.max(0, ...matches.map((m) => m.round));
  const count = matches.length;
  console.log({ name: t.name, format: t.format, count, maxRound });

  const byRound: Record<number, number> = {};
  for (const m of matches) byRound[m.round] = (byRound[m.round] ?? 0) + 1;
  console.log("byRound", byRound);

  const expected = buildFixedSwissTemplate(64, t.format.includes("BRONZE") ? "FIXED_SWISS_64_BRONZE" : "FIXED_SWISS_64");
  console.log("expected template matches", expected.matches.length);

  const nums = buildBracketMatchNumbers(
    matches.map((m) => ({
      id: m.id,
      round: m.round,
      slot: m.slot,
      status: "PENDING",
      team1: null,
      team2: null,
    })),
    t.format,
  );

  const sample = [
    [1, 1],
    [2, 17],
    [3, 9],
    [3, 17],
    [3, 21],
    [3, 24],
    [5, 1],
    [5, 8],
    [6, 1],
    [7, 1],
  ] as const;
  for (const [r, s] of sample) {
    const m = matches.find((x) => x.round === r && x.slot === s);
    const no = m ? nums.get(m.id) : fixedSwissMatchNo(r, s, count, maxRound);
    console.log(`R${r}s${s} => #${no}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
