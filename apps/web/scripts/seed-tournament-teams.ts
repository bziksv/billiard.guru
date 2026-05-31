/**
 * Одноразово: 10 тест-игроков → 5 пар в «Парный турнир 31 мая».
 *   cd apps/web && npx tsx scripts/seed-tournament-teams.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { createPrismaClient } from "../src/lib/prisma";
import { normalizePlayerPair } from "../src/lib/pair-tournament";

const TOURNAMENT_NAME = "Парный турнир 31 мая";

async function main() {
  const prisma = createPrismaClient();

  const tournament = await prisma.tournament.findFirst({
    where: { name: TOURNAMENT_NAME },
    include: { club: true },
    orderBy: { createdAt: "asc" },
  });

  if (!tournament) {
    throw new Error(`Турнир «${TOURNAMENT_NAME}» не найден`);
  }

  const players = await prisma.player.findMany({
    where: {
      phone: {
        in: Array.from({ length: 10 }, (_, i) =>
          `+790000000${String(i + 1).padStart(2, "0")}`,
        ),
      },
    },
    orderBy: { phone: "asc" },
  });

  if (players.length !== 10) {
    throw new Error(`Найдено ${players.length}/10 тест-игроков. Сначала: npm run db:seed`);
  }

  let teamsCreated = 0;
  for (let i = 0; i < 10; i += 2) {
    const p1 = players[i];
    const p2 = players[i + 1];
    const [player1Id, player2Id] = normalizePlayerPair(p1.id, p2.id);

    await prisma.tournamentTeam.upsert({
      where: {
        tournamentId_player1Id: {
          tournamentId: tournament.id,
          player1Id,
        },
      },
      update: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        clubId: tournament.clubId,
        source: "CLUB",
      },
      create: {
        tournamentId: tournament.id,
        player1Id,
        player2Id,
        clubId: tournament.clubId,
        source: "CLUB",
        status: "CONFIRMED",
        confirmedAt: new Date(),
        name: `${p1.lastName} / ${p2.lastName}`,
      },
    });
    teamsCreated++;
    console.log(`  ✓ ${p1.lastName} + ${p2.lastName}`);
  }

  console.log(
    `\nГотово: ${teamsCreated} команд в «${tournament.name}» (${tournament.format}, id=${tournament.id})`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
