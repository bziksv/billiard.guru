/**
 * Удалить заявку игрока на турнир и повторно отправить ему «турнир рядом».
 * npx tsx scripts/resend-tournament-nearby-player.ts <tournamentId> <playerId>
 */
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { sendTournamentNearbyAnnounceToPlayer } from "@/lib/tournament-approval";

const tournamentId = process.argv[2];
const playerId = process.argv[3];

if (!tournamentId || !playerId) {
  console.error(
    "Usage: npx tsx scripts/resend-tournament-nearby-player.ts <tournamentId> <playerId>",
  );
  process.exit(1);
}

async function main() {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, firstName: true, lastName: true, telegramId: true },
  });
  if (!player) {
    console.error("Player not found:", playerId);
    process.exit(1);
  }

  const deleted = await prisma.tournamentRegistration.deleteMany({
    where: { tournamentId, playerId },
  });
  console.log(`Deleted registrations: ${deleted.count}`);

  if (deleted.count > 0) {
    await writeAuditLog({
      actorType: "admin",
      actorId: "script",
      action: "tournament.registration.deleted",
      entityType: "tournament",
      entityId: tournamentId,
      summary: `Удалена заявка ${player.lastName} ${player.firstName}`,
      payload: { playerId },
    });
  }

  const result = await sendTournamentNearbyAnnounceToPlayer(tournamentId, playerId);
  if (!result.ok) {
    console.error("Notify failed:", result.error);
    process.exit(1);
  }

  console.log(
    `OK: «турнир рядом» отправлен ${player.lastName} ${player.firstName} (telegram ${player.telegramId})`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
