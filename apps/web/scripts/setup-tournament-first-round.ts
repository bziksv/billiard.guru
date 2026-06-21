/**
 * Расстановка посева и первого тура по эталону (16→8 FIXED_SWISS_16R2).
 *
 * npx tsx scripts/setup-tournament-first-round.ts [tournamentId]
 */
import { prisma } from "../src/lib/prisma";
import {
  generateFixedSwissGrid,
  regenerateBracket,
} from "../src/lib/bracket-service";

const tournamentId =
  process.argv[2] ?? "cmqm4uori000d5r9w2t8y4h64";

/** seed → фамилия (уникальная в турнире) */
const SEED_BY_LAST_NAME: Record<number, string> = {
  1: "Файницкий",
  2: "Чулков",
  3: "Сарин",
  4: "Подшивалов",
  5: "Разживин",
  6: "Кислов",
  7: "Колганов",
  8: "Бородкин",
  9: "Сухов",
  10: "Ульянцев",
  11: "Тищенко", // Дмитрий — см. TIshchenkoSeed
  12: "Галустов",
  13: "Воронцов",
  14: "Данцев",
  15: "Тищенко", // Станислав
  16: "Виленский",
};

/** Уточнение для двух Тищенко: seed → имя */
const TIshchenkoSeed: Record<number, string> = {
  11: "Дмитрий",
  15: "Станислав",
};

/** #1–#8: [team1Seed, team2Seed] — team1 сверху в карточке */
const ROUND1_PAIRINGS: Array<[number, number]> = [
  [1, 16],
  [9, 8],
  [5, 12],
  [13, 4],
  [3, 14],
  [11, 6],
  [7, 10],
  [15, 2],
];

async function findTeamBySeed(
  teams: Array<{
    id: string;
    seed: number | null;
    player1: { firstName: string; lastName: string } | null;
  }>,
  seed: number,
): Promise<string> {
  const lastName = SEED_BY_LAST_NAME[seed];
  if (!lastName) throw new Error(`Unknown seed ${seed}`);

  const candidates = teams.filter((t) => t.player1?.lastName === lastName);
  if (candidates.length === 0) {
    throw new Error(`Игрок «${lastName}» (seed ${seed}) не найден в турнире`);
  }
  if (candidates.length === 1) return candidates[0]!.id;

  const firstHint = TIshchenkoSeed[seed];
  if (!firstHint) {
    throw new Error(
      `Несколько «${lastName}», укажите TIshchenkoSeed для seed ${seed}`,
    );
  }
  const match = candidates.find((t) => t.player1?.firstName === firstHint);
  if (!match) {
    throw new Error(
      `«${lastName} ${firstHint}» (seed ${seed}) не найден`,
    );
  }
  return match.id;
}

async function main() {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");

  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentId, status: "CONFIRMED" },
    include: { player1: true },
  });
  if (teams.length !== 16) {
    throw new Error(`Ожидалось 16 команд, найдено ${teams.length}`);
  }

  const seedToTeamId = new Map<number, string>();
  for (let seed = 1; seed <= 16; seed++) {
    seedToTeamId.set(seed, await findTeamBySeed(teams, seed));
  }

  await prisma.tournamentTeam.updateMany({
    where: { tournamentId },
    data: { seed: null },
  });
  for (const [seed, teamId] of seedToTeamId) {
    await prisma.tournamentTeam.update({
      where: { id: teamId },
      data: { seed },
    });
    const t = teams.find((x) => x.id === teamId)!;
    console.log(
      `  seed ${String(seed).padStart(2)}: ${t.player1?.lastName} ${t.player1?.firstName}`,
    );
  }

  const existing = await prisma.tournamentMatch.count({ where: { tournamentId } });
  if (existing > 0) {
    console.log("\nПересоздание сетки…");
    await regenerateBracket(prisma, tournamentId);
  } else {
    console.log("\nФормирование сетки…");
    await generateFixedSwissGrid(prisma, tournamentId);
  }

  for (let slot = 1; slot <= 8; slot++) {
    const [s1, s2] = ROUND1_PAIRINGS[slot - 1]!;
    await prisma.tournamentMatch.update({
      where: {
        tournamentId_round_slot: { tournamentId, round: 1, slot },
      },
      data: {
        team1Id: seedToTeamId.get(s1)!,
        team2Id: seedToTeamId.get(s2)!,
        winnerTeamId: null,
        status: "SCHEDULED",
        team1Score: null,
        team2Score: null,
        finishedAt: null,
        startedAt: null,
      },
    });
  }

  await prisma.tournamentMatch.updateMany({
    where: { tournamentId, round: { gt: 1 } },
    data: {
      team1Id: null,
      team2Id: null,
      winnerTeamId: null,
      status: "SCHEDULED",
      team1Score: null,
      team2Score: null,
      finishedAt: null,
      startedAt: null,
    },
  });

  console.log("\nПервый тур:");
  const r1 = await prisma.tournamentMatch.findMany({
    where: { tournamentId, round: 1 },
    orderBy: { slot: "asc" },
    include: {
      team1: { include: { player1: true } },
      team2: { include: { player1: true } },
    },
  });
  for (const m of r1) {
    const n = m.slot;
    const a = `${m.team1?.player1?.lastName} ${m.team1?.player1?.firstName?.[0] ?? ""}.`;
    const b = `${m.team2?.player1?.lastName} ${m.team2?.player1?.firstName?.[0] ?? ""}.`;
    console.log(`  #${n}: ${a} vs ${b}`);
  }

  const total = await prisma.tournamentMatch.count({ where: { tournamentId } });
  console.log(`\n✅ Готово: ${total} встреч, первый тур по эталону`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
