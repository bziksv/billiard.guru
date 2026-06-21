/**
 * Включить Telegram-уведомления по турниру (suppressNotifications=false).
 * Опционально — рассылка «турнир рядом» (только OPEN, если не передан --force-resend).
 *
 * npx tsx scripts/enable-tournament-notifications.ts <tournamentId> [--force-resend]
 */
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { notifyNearbyPlayersAboutTournament } from "@/lib/tournament-approval";

const tournamentId = process.argv[2];
const forceResend = process.argv.includes("--force-resend");

if (!tournamentId) {
  console.error(
    "Usage: npx tsx scripts/enable-tournament-notifications.ts <tournamentId> [--force-resend]",
  );
  process.exit(1);
}

async function main() {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      status: true,
      suppressNotifications: true,
    },
  });
  if (!tournament) {
    console.error("Турнир не найден:", tournamentId);
    process.exit(1);
  }

  if (!tournament.suppressNotifications) {
    console.log(`Уведомления уже включены: «${tournament.name}» (${tournament.status})`);
    return;
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { suppressNotifications: false },
  });

  await writeAuditLog({
    actorType: "admin",
    actorId: "script",
    action: "tournament.notifications.enabled",
    entityType: "tournament",
    entityId: tournamentId,
    summary: `Включены уведомления по турниру «${tournament.name}»`,
  });

  console.log(`✓ suppressNotifications=false для «${tournament.name}» (${tournament.status})`);

  const shouldResend =
    forceResend || tournament.status === "OPEN" || tournament.status === "PENDING_CLUB_APPROVAL";

  if (!shouldResend) {
    console.log(
      "Рассылку «турнир рядом» не отправляли (турнир уже идёт). Добавьте --force-resend при необходимости.",
    );
    return;
  }

  const result = await notifyNearbyPlayersAboutTournament(tournamentId);
  console.log(
    `Рассылка «турнир рядом»: отправлено ${result.sent}, ошибок ${result.failed}, пропущено ${result.skipped}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
