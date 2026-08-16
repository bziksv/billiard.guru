import type { BracketMatchView, SwissStandingView } from "@/lib/bracket-view";
import {
  computeTournamentStandings,
  type AdminTournament,
  type AdminTournamentMatch,
  type AdminTournamentTeam,
} from "@/lib/tournament-admin";
import { isFixedSwissFormat } from "@/lib/pair-tournament";
import { resolveMatchStreamUrl, resolveTableLabel } from "@/lib/tournament-stream";
import {
  applyMatchStartRatingsToTeam,
  type MatchStartRatingsMap,
  type TournamentRatingSource,
} from "@/lib/tournament-rating-display";

type BracketTournamentInput = {
  format: string;
  ratingSource?: TournamentRatingSource;
  tableIds?: unknown;
  tableStreams?: unknown;
  club: {
    floorPlan?: unknown;
    tableCounts?: unknown;
  };
  teams: AdminTournamentTeam[];
  matches: AdminTournamentMatch[];
};

function isoDate(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export function buildPublicTournamentBracketView(
  tournament: BracketTournamentInput,
  opts?: { matchStartRatings?: MatchStartRatingsMap },
): {
  matches: BracketMatchView[];
  standings: SwissStandingView[];
} {
  const streamContext = {
    tableIds: tournament.tableIds,
    tableStreams: tournament.tableStreams,
  };
  const floorPlan = tournament.club.floorPlan;
  const ratingSource = tournament.ratingSource ?? "SYSTEM";
  const matchStartRatings = opts?.matchStartRatings;

  const matches: BracketMatchView[] = tournament.matches.map((m) => ({
    id: m.id,
    round: m.round,
    slot: m.slot,
    status: m.status,
    winnerTeamId: m.winnerTeamId ?? m.winnerTeam?.id ?? null,
    team1Score: m.team1Score,
    team2Score: m.team2Score,
    startedAt: isoDate(m.startedAt),
    finishedAt: isoDate(m.finishedAt),
    tableId: m.tableId ?? null,
    streamUrl: resolveMatchStreamUrl({ tableId: m.tableId ?? null }, streamContext, floorPlan),
    tableLabel: resolveTableLabel(m.tableId ?? null, floorPlan, tournament.club.tableCounts),
    team1: applyMatchStartRatingsToTeam(
      m.team1,
      m.id,
      matchStartRatings,
      ratingSource,
    ),
    team2: applyMatchStartRatingsToTeam(
      m.team2,
      m.id,
      matchStartRatings,
      ratingSource,
    ),
  }));

  const standings: SwissStandingView[] = (() => {
    const base: SwissStandingView[] = tournament.teams.map((t) => ({
      ...t,
      swissPoints: t.swissPoints ?? 0,
    }));
    if (!isFixedSwissFormat(tournament.format) || tournament.matches.length === 0) {
      return base;
    }
    const adminInput = {
      ...tournament,
      registrations: [],
    } as unknown as AdminTournament;
    const placeByTeamId = new Map(
      computeTournamentStandings(adminInput)
        .filter((row) => row.teamId && row.place != null)
        .map((row) => [row.teamId!, { place: row.place, placeTo: row.placeTo ?? null }]),
    );
    return base
      .map((team) => {
        const p = placeByTeamId.get(team.id);
        return p ? { ...team, place: p.place, placeTo: p.placeTo } : team;
      })
      .sort((a, b) => {
        if (a.place != null && b.place != null) return a.place - b.place;
        if (a.place != null) return -1;
        if (b.place != null) return 1;
        return b.swissPoints - a.swissPoints;
      });
  })();

  return { matches, standings };
}
