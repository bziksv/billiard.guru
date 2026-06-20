import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicTournamentBracketPanel } from "@/components/site/public-tournament-bracket-panel";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import {
  formatStartsAt,
  PUBLIC_TOURNAMENT_STATUSES,
} from "@/lib/public-display";
import { findPublicTournamentById } from "@/lib/tournament-public-read";
import { getBracketFormatLabel } from "@/lib/bracket-formats/settings-server";
import type { AdminTournament } from "@/lib/tournament-admin";
import { buildPublicTournamentBracketView } from "@/lib/tournament-public-bracket";
import { tournamentFormatDisplayLabel } from "@/lib/tournament-format-display";
import {
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/validators";
import { StatusBadge } from "@/components/admin/status-badge";
import { APP_NAME } from "@/lib/brand";
import { tournamentBracketMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tournament = await findPublicTournamentById(id, { club: true });
  if (
    !tournament ||
    !PUBLIC_TOURNAMENT_STATUSES.includes(
      tournament.status as (typeof PUBLIC_TOURNAMENT_STATUSES)[number],
    )
  ) {
    return { title: "Сетка не найдена" };
  }
  return tournamentBracketMetadata(tournament.name, id);
}

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
  const adminTournament = tournament as unknown as AdminTournament;
  const { matches, standings } = buildPublicTournamentBracketView(adminTournament);

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

        <PublicTournamentBracketPanel
          tournamentId={tournament.id}
          tournamentName={tournament.name}
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
