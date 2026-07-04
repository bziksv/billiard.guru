/**
 * Расстановка первого тура по эталону LLB (скриншот demo.llb.su).
 *
 * npx tsx scripts/setup-tournament-llb-pairings.ts
 */
import { prisma } from "../src/lib/prisma";
import {
  generateFixedSwissGrid,
  regenerateBracket,
} from "../src/lib/bracket-service";

const tournamentId = "cmr66ftja000evh9wntbv356e";

/** seed → уникальный фрагмент ФИО (фамилия или имя, если в профиле перепутаны) */
const SEED_NAME: Record<number, string> = {
  1: "Сарин",
  2: "Коба",
  3: "Емельянов",
  4: "Виленский",
  5: "Бутко",
  6: "Курьязович",
  7: "Зуев",
  8: "Тепляков",
  9: "Хольнозаров",
  10: "Лысенко",
  11: "Коняшин",
  12: "Шаймарданов",
  13: "Файницкий",
  14: "Борзов", // в профиле: lastName «Умед», firstName «Борзов»
  15: "Гоборов",
  16: "Куклин",
};

function findTeamByName(
  teams: Array<{ id: string; player1: { firstName: string; lastName: string } }>,
  name: string,
) {
  return teams.find(
    (t) => t.player1.lastName === name || t.player1.firstName === name,
  );
}

/** #1–#8: [team1Seed, team2Seed] — team1 сверху в карточке */
const ROUND1_PAIRINGS: Array<[number, number]> = [
  [1, 16], // Сарин — Куклин
  [9, 8], // Хольнозаров — Тепляков
  [5, 12], // Бутко — Шаймарданов
  [13, 4], // Файницкий — Виленский
  [3, 14], // Емельянов — Борзов
  [11, 6], // Коняшин — Курьязович
  [7, 10], // Зуев — Лысенко
  [15, 2], // Гоборов — Коба
];

async function main() {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");

  const confirmedCount = await prisma.tournamentRegistration.count({
    where: { tournamentId, status: "CONFIRMED" },
  });
  if (confirmedCount !== 16) {
    throw new Error(`Ожидалось 16 подтверждённых игроков, найдено ${confirmedCount}`);
  }

  const existing = await prisma.tournamentMatch.count({ where: { tournamentId } });
  if (existing > 0) {
    console.log("Пересоздание сетки…");
    await regenerateBracket(prisma, tournamentId);
  } else {
    console.log("Формирование сетки…");
    await generateFixedSwissGrid(prisma, tournamentId);
  }

  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentId, status: "CONFIRMED" },
    include: { player1: true },
  });
  if (teams.length !== 16) {
    throw new Error(`Ожидалось 16 команд, найдено ${teams.length}`);
  }

  const seedToTeamId = new Map<number, string>();
  for (let seed = 1; seed <= 16; seed++) {
    const name = SEED_NAME[seed]!;
    const match = findTeamByName(teams, name);
    if (!match) throw new Error(`Игрок «${name}» (seed ${seed}) не найден`);
    seedToTeamId.set(seed, match.id);
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
      `  seed ${String(seed).padStart(2)}: ${t.player1.lastName} ${t.player1.firstName}`,
    );
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
    const a = `${m.team1?.player1?.lastName} ${m.team1?.player1?.firstName?.[0] ?? ""}.`;
    const b = `${m.team2?.player1?.lastName} ${m.team2?.player1?.firstName?.[0] ?? ""}.`;
    const s1 = m.team1?.seed ?? "?";
    const s2 = m.team2?.seed ?? "?";
    console.log(`  #${m.slot}: (${s1}) ${a} vs (${s2}) ${b}`);
  }

  const total = await prisma.tournamentMatch.count({ where: { tournamentId } });
  console.log(`\nГотово: ${total} встреч, первый тур как на LLB`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
