import { prisma } from "@/lib/prisma";

/** После сноса сетки вернуть турнир в OPEN (регистрация и новая сетка). */
export async function reopenTournamentIfBracketEmpty(
  tournamentId: string,
): Promise<boolean> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      status: true,
      _count: { select: { matches: true } },
    },
  });
  if (!tournament || tournament._count.matches > 0) return false;
  if (tournament.status !== "ACTIVE" && tournament.status !== "FINISHED") {
    return false;
  }
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "OPEN" },
  });
  return true;
}
