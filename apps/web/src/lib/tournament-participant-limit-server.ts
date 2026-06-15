import { getResolvedParticipantRules } from "@/lib/bracket-formats/settings-server";
import {
  countActiveTournamentSlots,
  validateCanAddParticipants,
} from "@/lib/tournament-participant-limit";
import { validateFormatChangeParticipantCount } from "@/lib/bracket-participant-rules";
import { prisma } from "@/lib/prisma";

export async function getTournamentParticipantContext(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrations: { select: { status: true } },
      teams: { select: { status: true } },
    },
  });
  if (!tournament) {
    throw new Error("Турнир не найден");
  }
  const rules = await getResolvedParticipantRules(tournament.format);
  const count = countActiveTournamentSlots(tournament);
  return { tournament, rules, count };
}

export async function assertCanAddTournamentParticipants(
  tournamentId: string,
  adding: number,
): Promise<void> {
  const { rules, count } = await getTournamentParticipantContext(tournamentId);
  const check = validateCanAddParticipants(rules, count, adding);
  if (!check.ok) throw new Error(check.error);
}

export async function assertTournamentFitsFormat(
  format: string,
  tournamentId: string,
): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrations: { select: { status: true } },
      teams: { select: { status: true } },
    },
  });
  if (!tournament) throw new Error("Турнир не найден");

  const rules = await getResolvedParticipantRules(format);
  const count = countActiveTournamentSlots({ ...tournament, format });
  const check = validateFormatChangeParticipantCount(format, count, rules);
  if (!check.ok) {
    throw new Error(`Нельзя выбрать эту сетку: ${check.error}`);
  }
}
