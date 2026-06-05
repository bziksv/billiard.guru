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
import { prisma } from "@/lib/prisma";
import {
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/validators";
import { StatusBadge } from "@/components/admin/status-badge";
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

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
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
    team1: m.team1,
    team2: m.team2,
  }));

  const standings: SwissStandingView[] = tournament.teams.map((t) => ({
    ...t,
    swissPoints: t.swissPoints,
  }));

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
            {TOURNAMENT_FORMAT_LABELS[tournament.format] ?? tournament.format}
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
