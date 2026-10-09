import {
  computeTournamentStandings,
  formatTournamentStandingPlace,
  type AdminTournament,
  type AdminTournamentMatch,
  type AdminTournamentTeam,
} from "@/lib/tournament-admin";
import { playerName, PUBLIC_PARTICIPANT_STATUSES } from "@/lib/public-display";
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
  /** Партнёр в парном турнире (имя). */
  partnerName?: string;
  /** Ссылка на профиль партнёра. */
  partnerHref?: string;
  /** Сыгранные встречи с двумя сторонами (без bye). */
  played?: number;
  wins?: number;
  /** Доля побед 0..1. */
  winRate?: number | null;
};

type TeamPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
};

function partnerFromTeam(
  playerId: string,
  team: {
    player1Id: string;
    player2Id: string | null;
    player1: TeamPlayer;
    player2: TeamPlayer | null;
  },
): { name: string; href: string } | null {
  if (!team.player2Id || !team.player2) return null;
  const partner =
    team.player1Id === playerId
      ? team.player2
      : team.player2Id === playerId
        ? team.player1
        : null;
  if (!partner) return null;
  return { name: playerName(partner), href: `/players/${partner.id}` };
}

function playerLabel(p: { firstName: string; lastName: string }): string {
  return [p.lastName, p.firstName].filter(Boolean).join(" ").trim() || "Игрок";
}

function toAdminTeam(row: {
  id: string;
  status: string;
  swissPoints: number | null;
  ratingOverride: number | null;
  player1: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
  };
  player2: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
  } | null;
}): AdminTournamentTeam {
  return {
    id: row.id,
    status: row.status,
    swissPoints: row.swissPoints ?? undefined,
    ratingOverride: row.ratingOverride,
    player1: {
      id: row.player1.id,
      firstName: row.player1.firstName,
      lastName: row.player1.lastName,
      rating: row.player1.rating,
      phone: "",
    },
    player2: row.player2
      ? {
          id: row.player2.id,
          firstName: row.player2.firstName,
          lastName: row.player2.lastName,
          rating: row.player2.rating,
          phone: "",
        }
      : null,
  };
}

/**
 * Место, партнёр и статистика встреч по турнирам игрока.
 * Без полных include протокола — только id/статусы/очки для standings.
 */
export async function loadPlayerTournamentPlaces(
  playerId: string,
  tournaments: { id: string; status: string }[],
): Promise<Map<string, PlayerTournamentPlaceInfo>> {
  const result = new Map<string, PlayerTournamentPlaceInfo>();
  if (tournaments.length === 0) return result;

  const tournamentIds = tournaments.map((t) => t.id);
  const finishedIds = tournaments
    .filter((t) => t.status === "FINISHED")
    .map((t) => t.id);

  const playerSelect = {
    id: true,
    firstName: true,
    lastName: true,
    middleName: true,
  } as const;

  const ratingPlayerSelect = {
    id: true,
    firstName: true,
    lastName: true,
    rating: true,
  } as const;

  const [myTeams, finishedRows, subRows] = await Promise.all([
    prisma.tournamentTeam.findMany({
      where: {
        tournamentId: { in: tournamentIds },
        OR: [{ player1Id: playerId }, { player2Id: playerId }],
        status: { in: [...PUBLIC_PARTICIPANT_STATUSES] },
      },
      select: {
        id: true,
        tournamentId: true,
        player1Id: true,
        player2Id: true,
        player1: { select: playerSelect },
        player2: { select: playerSelect },
      },
    }),
    finishedIds.length === 0
      ? Promise.resolve([])
      : prisma.tournament.findMany({
          where: { id: { in: finishedIds } },
          select: {
            id: true,
            name: true,
            format: true,
            status: true,
            clubId: true,
            teams: {
              where: { status: { in: [...PUBLIC_PARTICIPANT_STATUSES] } },
              select: {
                id: true,
                status: true,
                swissPoints: true,
                ratingOverride: true,
                player1: { select: ratingPlayerSelect },
                player2: { select: ratingPlayerSelect },
              },
            },
            matches: {
              select: {
                id: true,
                round: true,
                slot: true,
                status: true,
                team1Id: true,
                team2Id: true,
                winnerTeamId: true,
              },
              orderBy: [{ round: "asc" }, { slot: "asc" }],
            },
          },
        }),
    finishedIds.length === 0
      ? Promise.resolve([])
      : prisma.tournamentPlayerSubstitution.findMany({
          where: {
            tournamentId: { in: finishedIds },
            OR: [
              { outgoingPlayerId: playerId },
              { incomingPlayerId: playerId },
            ],
          },
          select: {
            tournamentId: true,
            outgoingPlayerId: true,
            incomingPlayer: { select: { firstName: true, lastName: true } },
          },
        }),
  ]);

  const teamsByTournament = new Map<string, typeof myTeams>();
  for (const tm of myTeams) {
    const list = teamsByTournament.get(tm.tournamentId) ?? [];
    list.push(tm);
    teamsByTournament.set(tm.tournamentId, list);
  }

  const myTeamIds = myTeams.map((tm) => tm.id);
  const matches =
    myTeamIds.length === 0
      ? []
      : await prisma.tournamentMatch.findMany({
          where: {
            tournamentId: { in: tournamentIds },
            status: { in: ["FINISHED", "WALKOVER"] },
            winnerTeamId: { not: null },
            team1Id: { not: null },
            team2Id: { not: null },
            OR: [
              { team1Id: { in: myTeamIds } },
              { team2Id: { in: myTeamIds } },
            ],
          },
          select: {
            tournamentId: true,
            team1Id: true,
            team2Id: true,
            winnerTeamId: true,
          },
        });

  const statsByTournament = new Map<string, { played: number; wins: number }>();
  const teamIdSet = new Set(myTeamIds);
  for (const m of matches) {
    if (!m.team1Id || !m.team2Id || !m.winnerTeamId) continue;
    const mine = teamIdSet.has(m.team1Id)
      ? m.team1Id
      : teamIdSet.has(m.team2Id)
        ? m.team2Id
        : null;
    if (!mine) continue;
    const st = statsByTournament.get(m.tournamentId) ?? { played: 0, wins: 0 };
    st.played += 1;
    if (m.winnerTeamId === mine) st.wins += 1;
    statsByTournament.set(m.tournamentId, st);
  }

  for (const tid of tournamentIds) {
    const info: PlayerTournamentPlaceInfo = {};
    const teams = teamsByTournament.get(tid) ?? [];
    const partnerTeam = teams.find((tm) => tm.player2Id) ?? teams[0] ?? null;
    if (partnerTeam) {
      const partner = partnerFromTeam(playerId, partnerTeam);
      if (partner) {
        info.partnerName = partner.name;
        info.partnerHref = partner.href;
      }
    }
    const st = statsByTournament.get(tid);
    if (st && st.played > 0) {
      info.played = st.played;
      info.wins = st.wins;
      info.winRate = st.wins / st.played;
    }
    if (info.partnerName || info.played) {
      result.set(tid, info);
    }
  }

  const myTeamIdsByTournament = new Map<string, string[]>();
  for (const tm of myTeams) {
    const list = myTeamIdsByTournament.get(tm.tournamentId) ?? [];
    list.push(tm.id);
    myTeamIdsByTournament.set(tm.tournamentId, list);
  }

  for (const t of finishedRows) {
    const info = result.get(t.id) ?? {};
    const adminTeams = t.teams.map(toAdminTeam);
    const byId = new Map(adminTeams.map((tm) => [tm.id, tm]));

    const adminMatches: AdminTournamentMatch[] = t.matches.map((m) => {
      const team1 = m.team1Id ? byId.get(m.team1Id) ?? null : null;
      const team2 = m.team2Id ? byId.get(m.team2Id) ?? null : null;
      const winnerTeam = m.winnerTeamId
        ? byId.get(m.winnerTeamId) ?? null
        : null;
      return {
        id: m.id,
        round: m.round,
        slot: m.slot,
        status: m.status,
        team1Id: m.team1Id,
        team2Id: m.team2Id,
        winnerTeamId: m.winnerTeamId,
        team1,
        team2,
        winnerTeam,
      };
    });

    try {
      const standings = computeTournamentStandings({
        id: t.id,
        name: t.name,
        format: t.format,
        status: t.status,
        clubId: t.clubId,
        club: { name: "", city: undefined },
        registrations: [],
        teams: adminTeams,
        matches: adminMatches,
      } as AdminTournament);

      const myIds = new Set(myTeamIdsByTournament.get(t.id) ?? []);
      const row = standings.find(
        (r) => r.teamId != null && myIds.has(r.teamId),
      );
      if (row) {
        const label = formatTournamentStandingPlace(row);
        if (label && label !== "—") info.place = label;
      }
    } catch {
      // протокол не построился — место не показываем
    }

    if (info.place || info.gavePlaceTo || info.partnerName || info.played) {
      result.set(t.id, info);
    }
  }

  for (const sub of subRows) {
    if (sub.outgoingPlayerId !== playerId) continue;
    const info = result.get(sub.tournamentId) ?? {};
    info.gavePlaceTo = playerLabel(sub.incomingPlayer);
    result.set(sub.tournamentId, info);
  }

  return result;
}
