/**
 * Удаляет тестовых игроков Тест1…Тест300 (firstName «Игрок», phone +7900000…).
 * Запуск: cd apps/web && npx tsx scripts/delete-test-players.ts
 */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/prisma";

const prisma = createPrismaClient();

async function main() {
  const testPlayers = await prisma.player.findMany({
    where: {
      firstName: "Игрок",
      lastName: { startsWith: "Тест" },
      phone: { startsWith: "+7900000" },
    },
    select: { id: true, lastName: true, firstName: true, phone: true },
    orderBy: { lastName: "asc" },
  });

  if (testPlayers.length === 0) {
    console.log("Тестовых игроков не найдено.");
    return;
  }

  console.log(`Найдено: ${testPlayers.length}`);
  console.log(
    `Примеры: ${testPlayers
      .slice(0, 3)
      .map((p) => `${p.lastName} ${p.firstName}`)
      .join(", ")}…`,
  );

  const ids = testPlayers.map((p) => p.id);

  await prisma.$transaction([
    prisma.tournamentRegistration.deleteMany({ where: { playerId: { in: ids } } }),
    prisma.ratingChange.deleteMany({ where: { playerId: { in: ids } } }),
    prisma.loginChallenge.deleteMany({ where: { playerId: { in: ids } } }),
    prisma.tournamentTeam.deleteMany({
      where: { OR: [{ player1Id: { in: ids } }, { player2Id: { in: ids } }] },
    }),
    prisma.ideaVote.deleteMany({ where: { playerId: { in: ids } } }),
    prisma.idea.deleteMany({ where: { authorId: { in: ids } } }),
    prisma.playListingResponse.deleteMany({ where: { playerId: { in: ids } } }),
    prisma.playListing.deleteMany({ where: { authorId: { in: ids } } }),
    prisma.clubStaff.deleteMany({ where: { playerId: { in: ids } } }),
    prisma.tableBooking.deleteMany({ where: { playerId: { in: ids } } }),
    prisma.clubPlayerRating.deleteMany({ where: { playerId: { in: ids } } }),
    prisma.coachRating.deleteMany({
      where: { OR: [{ coachId: { in: ids } }, { raterId: { in: ids } }] },
    }),
    prisma.playerNotificationPreference.deleteMany({
      where: { playerId: { in: ids } },
    }),
    prisma.playerRatingSnapshotRow.deleteMany({ where: { playerId: { in: ids } } }),
    prisma.player.deleteMany({ where: { id: { in: ids } } }),
  ]);

  console.log(`Удалено игроков: ${testPlayers.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
