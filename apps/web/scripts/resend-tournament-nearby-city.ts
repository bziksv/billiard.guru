/**
 * Повторная рассылка «турнир рядом» всем игрокам города клуба.
 * npx tsx scripts/resend-tournament-nearby-city.ts <tournamentId> [--force]
 */
import { sendTournamentNearbyAnnounceToClubCity } from "@/lib/tournament-approval";
import { prisma } from "@/lib/prisma";

const args = process.argv.slice(2);
const tournamentId = args.find((a) => !a.startsWith("--"));
const force = args.includes("--force");

if (!tournamentId) {
  console.error("Usage: npx tsx scripts/resend-tournament-nearby-city.ts <tournamentId> [--force]");
  process.exit(1);
}

async function main() {
  const result = await sendTournamentNearbyAnnounceToClubCity(tournamentId, { force });
  console.log(
    `Город ${result.cityName}: отправлено ${result.sent}, ошибок ${result.failed}, пропущено ${result.skipped} (batch ${result.batchId})`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
