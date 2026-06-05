/**
 * Турнир «тест эксельки» — FIXED_SWISS_64, 64 участника, сетка по шаблону LLB (64-16 ×2gr.xls).
 *
 *   cd apps/web && npx tsx scripts/create-excel-test-tournament.ts
 *   cd apps/web && npx tsx scripts/create-excel-test-tournament.ts --club-id <id>
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { createPrismaClient } from "../src/lib/prisma";
import { generateFixedSwissGrid } from "../src/lib/bracket-service";
import { fixedSwissMatchNo } from "../src/lib/fixed-swiss-grid";

const TOURNAMENT_NAME = "тест эксельки";
const PARTICIPANTS = 64;

async function main() {
  const prisma = createPrismaClient();
  const clubIdArg = process.argv.find((a) => a.startsWith("--club-id="))?.split("=")[1];

  const existing = await prisma.tournament.findFirst({
    where: { name: TOURNAMENT_NAME },
    select: { id: true, clubId: true },
  });
  if (existing) {
    await prisma.tournament.delete({ where: { id: existing.id } });
    console.log(`Удалён прежний турнир «${TOURNAMENT_NAME}» (${existing.id})`);
  }

  let clubId = clubIdArg;
  if (!clubId) {
    const ref = await prisma.tournament.findFirst({
      where: { format: "FIXED_SWISS_64" },
      orderBy: { createdAt: "desc" },
      select: { clubId: true },
    });
    clubId = ref?.clubId;
  }
  if (!clubId) {
    const club = await prisma.club.findFirst({
      where: { isVerified: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
    clubId = club?.id;
    if (club) console.log(`Клуб: ${club.name}`);
  }
  if (!clubId) throw new Error("Не найден clubId — передайте --club-id=");

  let players = await prisma.player.findMany({
    where: { lastName: { startsWith: "Тест" } },
    orderBy: [{ rating: "desc" }, { createdAt: "asc" }],
    take: PARTICIPANTS,
    select: { id: true, lastName: true, rating: true },
  });
  if (players.length < PARTICIPANTS) {
    const byPhone = await prisma.player.findMany({
      where: {
        phone: {
          in: Array.from({ length: PARTICIPANTS }, (_, i) =>
            `+790000000${String(i + 1).padStart(2, "0")}`,
          ),
        },
      },
      orderBy: { phone: "asc" },
      select: { id: true, lastName: true, rating: true },
    });
    players = byPhone;
  }
  if (players.length < PARTICIPANTS) {
    throw new Error(
      `Нужно ${PARTICIPANTS} игроков (Тест1… или +79000000001…). Запустите: npm run db:seed`,
    );
  }

  const tournament = await prisma.tournament.create({
    data: {
      name: TOURNAMENT_NAME,
      description:
        "Сверка с эталоном Excel «64-16 ×2gr.xls» (FIXED_SWISS_64, 115 встреч).",
      clubId,
      format: "FIXED_SWISS_64",
      status: "DRAFT",
      handicapHalfStep: true,
      publishedAt: new Date(),
    },
  });

  const now = new Date();
  await prisma.tournamentRegistration.createMany({
    data: players.map((p) => ({
      tournamentId: tournament.id,
      playerId: p.id,
      clubId,
      source: "CLUB" as const,
      status: "CONFIRMED" as const,
      confirmedAt: now,
    })),
    skipDuplicates: true,
  });

  await generateFixedSwissGrid(prisma, tournament.id);

  const matchCount = await prisma.tournamentMatch.count({
    where: { tournamentId: tournament.id },
  });
  const sample = [
    [1, 1],
    [2, 17],
    [3, 9],
    [3, 17],
    [5, 1],
    [6, 1],
    [7, 1],
  ] as const;
  const maxRound = 7;
  for (const [r, s] of sample) {
    const no = fixedSwissMatchNo(r, s, matchCount, maxRound);
    console.log(`  R${r}s${s} => #${no}`);
  }

  const manageUrl = `http://localhost:3010/manage/clubs/${clubId}/tournaments/${tournament.id}`;
  console.log("\nГотово:");
  console.log(`  id: ${tournament.id}`);
  console.log(`  встреч: ${matchCount}`);
  console.log(`  сетка: ${manageUrl}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
