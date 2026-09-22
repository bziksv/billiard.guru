import type { AdminTournament } from "@/lib/tournament-admin";
import { PUBLIC_PARTICIPANT_STATUSES } from "@/lib/public-display";
import { buildPublicTournamentStandings } from "@/lib/tournament-public-standings";
import { listTournamentSubstitutions } from "@/lib/bracket-substitute";
import { prisma } from "@/lib/prisma";

/** Медаль для 1–3 места. */
export function placeMedal(placeLabel: string): string {
  if (placeLabel === "1") return "🥇";
  if (placeLabel === "2") return "🥈";
  if (placeLabel === "3") return "🥉";
  return "🏅";
}

export type PlayerTournamentPlaceInfo = {
  /** Место в протоколе («1», «5–6»), если есть. */
  place?: string;
  /** Кому отдал слот при mid-bracket замене. */
  gavePlaceTo?: string;
};

/**
 * Занятое игроком место и отметки о замене в завершённых турнирах.
 */
export async function loadPlayerTournamentPlaces(
  playerId: string,
  tournaments: { id: string; status: string }[],
): Promise<Map<string, PlayerTournamentPlaceInfo>> {
  const result = new Map<string, PlayerTournamentPlaceInfo>();
  const finishedIds = tournaments
    .filter((t) => t.status === "FINISHED")
    .map((t) => t.id);
  if (finishedIds.length === 0) return result;

  const rows = await prisma.tournament.findMany({
    where: { id: { in: finishedIds } },
    include: {
      club: { include: { city: { include: { country: true } } } },
      registrations: {
        where: { status: { in: [...PUBLIC_PARTICIPANT_STATUSES] } },
        include: { player: { include: { city: true } } },
      },
      teams: {
        where: { status: { in: [...PUBLIC_PARTICIPANT_STATUSES] } },
        include: {
          player1: { include: { city: true } },
          player2: { include: { city: true } },
        },
      },
      matches: {
        include: {
          team1: { include: { player1: true, player2: true } },
          team2: { include: { player1: true, player2: true } },
          winnerTeam: { include: { player1: true, player2: true } },
        },
        orderBy: [{ round: "asc" }, { slot: "asc" }],
      },
    },
  });

  const href = `/players/${playerId}`;
  for (const t of rows) {
    try {
      const substitutions = await listTournamentSubstitutions(t.id);
      const standings = buildPublicTournamentStandings({
        ...(t as unknown as AdminTournament),
        substitutions,
      });
      const row = standings.rows.find(
        (r) => r.playerHref === href || r.secondPlayerHref === href,
      );
      const info: PlayerTournamentPlaceInfo = {};
      if (row?.placeLabel && row.placeLabel !== "—") {
        info.place = row.placeLabel;
      }
      const outgoing = substitutions.find((s) => s.outgoingPlayerId === playerId);
      if (outgoing) {
        info.gavePlaceTo = outgoing.incomingLabel;
      }
      if (info.place || info.gavePlaceTo) {
        result.set(t.id, info);
      }
    } catch {
      // протокол не построился — место не показываем
    }
  }
  return result;
}
