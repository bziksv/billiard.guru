import { AuthError, getSession } from "@/lib/auth";
import { requireClubManageAccess } from "@/lib/club-manage";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";

export async function requireTournamentManageAccess(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { club: { include: { city: { include: { country: true } } } } },
  });
  if (!tournament) {
    throw new AuthError("Турнир не найден", 404);
  }

  const { player } = await requireClubManageAccess(tournament.clubId);
  const session = await getSession();
  if (!session) {
    throw new AuthError("Требуется вход", 401);
  }
  return { tournament, player, session };
}

export async function requireMatchManageAccess(matchId: string) {
  const match = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    select: { tournamentId: true },
  });
  if (!match) {
    throw new AuthError("Матч не найден", 404);
  }
  return requireTournamentManageAccess(match.tournamentId);
}

export function tournamentManageActorType(session: SessionPayload) {
  return session.role === "SUPERADMIN" ? ("admin" as const) : ("club" as const);
}

export async function assertClubOwnsTournament(tournamentId: string, clubId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { clubId: true },
  });
  if (!tournament || tournament.clubId !== clubId) {
    throw new AuthError("Недостаточно прав", 403);
  }
}
