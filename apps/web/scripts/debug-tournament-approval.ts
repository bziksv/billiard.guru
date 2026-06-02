import { prisma } from "@/lib/prisma";
import {
  approveTournamentByClub,
  publishTournamentFromManage,
} from "@/lib/tournament-approval";

const tournamentId = process.argv[2];
if (!tournamentId) {
  console.error("Usage: npx tsx scripts/debug-tournament-approval.ts <tournamentId> [telegramId] [playerId]");
  process.exit(1);
}

const telegramId = process.argv[3];
const playerId = process.argv[4];

async function main() {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      club: {
        select: { id: true, name: true, phone: true, telegramId: true, isVerified: true },
      },
    },
  });
  console.log({
    id: t?.id,
    name: t?.name,
    status: t?.status,
    token: t?.clubApprovalToken,
    clubTelegramId: t?.club.telegramId,
    format: t?.format,
  });

  if (telegramId && t?.clubApprovalToken) {
    const result = await approveTournamentByClub(t.clubApprovalToken, telegramId);
    console.log("approve result:", result);
  }

  if (playerId) {
    try {
      const result = await publishTournamentFromManage(tournamentId, playerId);
      console.log("publish result:", result);
    } catch (err) {
      console.error("publish threw:", err);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
