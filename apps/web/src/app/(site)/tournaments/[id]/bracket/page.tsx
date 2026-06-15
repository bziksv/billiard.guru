import Link from "next/link";
import { notFound } from "next/navigation";
import { TournamentBracket } from "@/components/bracket/tournament-bracket";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import type { BracketMatchView, SwissStandingView } from "@/lib/bracket-view";
import {
  formatStartsAt,
  PUBLIC_TOURNAMENT_STATUSES,
} from "@/lib/public-display";
import { findPublicTournamentById } from "@/lib/tournament-public-read";
import { getBracketFormatLabel } from "@/lib/bracket-formats/settings-server";
import { computeTournamentStandings } from "@/lib/tournament-admin";
import type { AdminTournament } from "@/lib/tournament-admin";
import { isFixedSwissFormat } from "@/lib/pair-tournament";
import { tournamentFormatDisplayLabel } from "@/lib/tournament-format-display";
import {
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/validators";
import { StatusBadge } from "@/components/admin/status-badge";
import { resolveMatchStreamUrl, resolveTableLabel } from "@/lib/tournament-stream";
import { APP_NAME } from "@/lib/brand";

export const metadata = {
  robots: { index: true, follow: true },
};

export default async function TournamentBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await findPublicTournamentById(id, {
    club: { include: { city: { include: { country: true } } } },
    teams: {
      where: { status: "CONFIRMED" },
      include: { player1: true, player2: true },
      orderBy: [{ swissPoints: "desc" }, { seed: "asc" }],
    },
    matches: {
      include: {
        team1: { include: { player1: true, player2: true } },
        team2: { include: { player1: true, player2: true } },
        winnerTeam: { include: { player1: true, player2: true } },
      },
      orderBy: [{ round: "asc" }, { slot: "asc" }],
    },
  });

  if (
    !tournament ||
    !PUBLIC_TOURNAMENT_STATUSES.includes(
      tournament.status as (typeof PUBLIC_TOURNAMENT_STATUSES)[number],
    )
  ) {
    notFound();
  }

  const formatLabel = await getBracketFormatLabel(tournament.format);
  const streamContext = {
    tableIds: tournament.tableIds,
    tableStreams: tournament.tableStreams,
  };
  const floorPlan = tournament.club.floorPlan;

  const matches: BracketMatchView[] = tournament.matches.map((m) => ({
    id: m.id,
    round: m.round,
    slot: m.slot,
    status: m.status,
    winnerTeamId: m.winnerTeamId,
    team1Score: m.team1Score,
    team2Score: m.team2Score,
    startedAt: m.startedAt?.toISOString() ?? null,
    finishedAt: m.finishedAt?.toISOString() ?? null,
    tableId: m.tableId,
    streamUrl: resolveMatchStreamUrl({ tableId: m.tableId }, streamContext, floorPlan),
    tableLabel: resolveTableLabel(m.tableId, floorPlan, tournament.club.tableCounts),
    team1: m.team1,
    team2: m.team2,
  }));

  const standings: SwissStandingView[] = (() => {
    const base: SwissStandingView[] = tournament.teams.map((t) => ({
      ...t,
      swissPoints: t.swissPoints,
    }));
    if (!isFixedSwissFormat(tournament.format) || tournament.matches.length === 0) {
      return base;
    }
    const adminInput = {
      ...tournament,
      registrations: [],
    } as AdminTournament;
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

  const bracketUrl = `/tournaments/${tournament.id}/bracket`;

  return (
    <>
      <PageHeader title={`Сетка — ${tournament.name}`}>
        <Link
          href={`/tournaments/${tournament.id}`}
          className="site-btn-ghost text-emerald-400"
        >
          ← Турнир
        </Link>
      </PageHeader>
      <PageMain className="space-y-6 pt-0">
        <SiteCard className="flex flex-wrap items-center gap-3 text-sm">
          <StatusBadge
            status={tournament.status}
            label={TOURNAMENT_STATUS_LABELS[tournament.status] ?? tournament.status}
          />
          <span className="text-zinc-400">
            {tournamentFormatDisplayLabel({ format: tournament.format, formatLabel })}
          </span>
          <span className="text-zinc-500">
            {tournament.club.name} · {formatStartsAt(tournament.startsAt)}
          </span>
        </SiteCard>

        <p className="text-xs text-zinc-500">
          Публичная ссылка на сетку (без входа):{" "}
          <Link href={bracketUrl} className="break-all text-emerald-400 hover:underline">
            {process.env.NEXT_PUBLIC_APP_URL ?? "https://billiard.guru"}
            {bracketUrl}
          </Link>
        </p>

        <TournamentBracket
          format={tournament.format}
          matches={matches}
          standings={standings}
          handicapHalfStep={tournament.handicapHalfStep}
        />

        <p className="text-center text-xs text-zinc-600">
          {APP_NAME} · {tournament.club.city.nameRu}
        </p>
      </PageMain>
    </>
  );
}
