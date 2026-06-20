import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/admin/status-badge";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { TournamentRegisterButton } from "@/components/site/tournament-register-button";
import { RegistrationCancelButton } from "@/components/site/registration-cancel-button";
import { TournamentPublicView } from "@/components/site/tournament-public-view";
import type { PublicParticipantRow } from "@/lib/tournament-public-standings";
import { getCurrentPlayer } from "@/lib/auth";
import {
  formatStartsAt,
  isPairFormat,
  playerName,
  PUBLIC_TOURNAMENT_STATUSES,
  PUBLIC_PARTICIPANT_STATUSES,
  teamLabel,
} from "@/lib/public-display";
import { findPublicTournamentById } from "@/lib/tournament-public-read";
import { formatRatingRange } from "@/lib/play-listing-display";
import {
  getEffectivePlayerRatingForTournament,
  playerRatingExceedsTournamentMax,
  tournamentRatingLimitMessage,
} from "@/lib/tournament-rating-limit-server";
import { formatRating } from "@/lib/rating";
import { getBracketFormatLabel } from "@/lib/bracket-formats/settings-server";
import { tournamentFormatDisplayLabel } from "@/lib/tournament-format-display";
import type { AdminTournament } from "@/lib/tournament-admin";
import {
  buildPublicTournamentStandings,
  defaultPublicTournamentTab,
} from "@/lib/tournament-public-standings";
import {
  REGISTRATION_STATUS_LABELS,
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/validators";
import { buildPublicTournamentBracketView } from "@/lib/tournament-public-bracket";
import { buildPublicMatchRows } from "@/lib/tournament-public-matches";
import { tournamentDetailMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";

async function getMyParticipation(
  tournamentId: string,
  playerId: string,
  pair: boolean,
) {
  if (pair) {
    return prisma.tournamentTeam.findFirst({
      where: {
        tournamentId,
        status: { notIn: ["CANCELLED", "REJECTED"] },
        OR: [{ player1Id: playerId }, { player2Id: playerId }],
      },
      include: { player1: true, player2: true },
    });
  }
  return prisma.tournamentRegistration.findFirst({
    where: {
      tournamentId,
      playerId,
      status: { notIn: ["CANCELLED", "REJECTED"] },
    },
    include: { player: true },
  });
}

function buildParticipantRows(
  tournament: AdminTournament,
  pair: boolean,
): PublicParticipantRow[] {
  const publicStatuses = new Set<string>(PUBLIC_PARTICIPANT_STATUSES);
  const publicTeams = tournament.teams.filter((t) => publicStatuses.has(t.status));
  const confirmedTeams = publicTeams.filter((t) => t.status === "CONFIRMED");

  const pendingNote = (status: string) =>
    status === "PENDING" ? "заявка ожидает подтверждения" : undefined;

  if (pair || (tournament.matches.length > 0 && confirmedTeams.length > 0)) {
    const teams = tournament.matches.length > 0 ? confirmedTeams : publicTeams;
    return teams.map((team) => ({
      id: team.id,
      name: teamLabel(team),
      href: team.player2
        ? `/players/${team.player1.id}`
        : `/players/${team.player1.id}`,
      city: team.player1.city?.nameRu ?? undefined,
      ratingLabel: formatRating(
        pair
          ? (team.player1.rating + (team.player2?.rating ?? team.player1.rating)) / (team.player2 ? 2 : 1)
          : team.player1.rating,
      ),
      note: pendingNote(team.status),
    }));
  }

  return tournament.registrations
    .filter((r) => publicStatuses.has(r.status))
    .map((r) => ({
      id: r.player.id,
      name: playerName(r.player),
      href: `/players/${r.player.id}`,
      city: r.player.city?.nameRu ?? undefined,
      ratingLabel: formatRating(r.player.rating),
      note: pendingNote(r.status),
    }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tournament = await findPublicTournamentById(id, {
    club: { include: { city: true } },
  });
  if (
    !tournament ||
    !PUBLIC_TOURNAMENT_STATUSES.includes(
      tournament.status as (typeof PUBLIC_TOURNAMENT_STATUSES)[number],
    )
  ) {
    return { title: "Турнир не найден" };
  }
  return tournamentDetailMetadata(
    tournament.name,
    tournament.club.name,
    tournament.club.city.nameRu,
    id,
  );
}

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await findPublicTournamentById(id, {
    club: {
      include: {
        city: { include: { country: true } },
      },
    },
    registrations: {
      where: { status: { in: [...PUBLIC_PARTICIPANT_STATUSES] } },
      include: { player: { include: { city: true } } },
      orderBy: { createdAt: "asc" },
    },
    teams: {
      where: { status: { in: [...PUBLIC_PARTICIPANT_STATUSES] } },
      include: {
        player1: { include: { city: true } },
        player2: { include: { city: true } },
      },
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

  const pair = isPairFormat(tournament.format);
  const formatLabel = await getBracketFormatLabel(tournament.format);
  const formatDisplay = tournamentFormatDisplayLabel({
    format: tournament.format,
    formatLabel,
  });

  const adminTournament = tournament as unknown as AdminTournament;
  const standings = buildPublicTournamentStandings(adminTournament);
  const participants = buildParticipantRows(adminTournament, pair);
  const matchCount = tournament.matches.length;
  const registrationOpen = tournament.status === "OPEN";

  const player = await getCurrentPlayer();
  const myParticipation = player
    ? await getMyParticipation(tournament.id, player.id, pair)
    : null;

  let registrationBlockedByRating: string | null = null;
  if (player && tournament.ratingMax != null && !myParticipation) {
    const effectiveRating = await getEffectivePlayerRatingForTournament(
      player.id,
      tournament.clubId,
      player.rating,
      tournament.ratingSource ?? "CLUB",
    );
    if (playerRatingExceedsTournamentMax(effectiveRating, tournament.ratingMax)) {
      registrationBlockedByRating = `Ваш рейтинг ${formatRating(effectiveRating)} — ${tournamentRatingLimitMessage(tournament.ratingMax).toLowerCase()}`;
    }
  }

  const ratingLimitLabel =
    tournament.ratingMax != null
      ? formatRatingRange(null, tournament.ratingMax)
      : null;

  const defaultTab = defaultPublicTournamentTab(standings, registrationOpen);

  const bracketView =
    matchCount > 0 ? buildPublicTournamentBracketView(adminTournament) : null;
  const publicMatches = bracketView
    ? buildPublicMatchRows(bracketView.matches, tournament.format)
    : [];

  const bracketPanel = bracketView
    ? {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        format: tournament.format,
        matches: bracketView.matches,
        standings: bracketView.standings,
        handicapHalfStep: tournament.handicapHalfStep,
      }
    : null;

  return (
    <>
      <PageHeader title={tournament.name}>
        <Link href="/tournaments" className="site-btn-ghost text-emerald-400">
          ← Турниры
        </Link>
      </PageHeader>
      <PageMain className="space-y-8 pt-0">
        <SiteCard>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={tournament.status}
              label={TOURNAMENT_STATUS_LABELS[tournament.status] ?? tournament.status}
            />
            {matchCount > 0 && (
              <span className="text-xs text-[var(--text-muted)]">
                {participants.length} участников · {matchCount} встреч
              </span>
            )}
          </div>
          <p className="mt-3 text-[var(--text-secondary)]">{formatDisplay}</p>
          <p className="mt-1 text-sm text-zinc-500">
            <Link href={`/clubs/${tournament.club.id}`} className="hover:text-emerald-400">
              {tournament.club.name}
            </Link>
            {" · "}
            {tournament.club.city.nameRu}, {tournament.club.city.country.nameRu}
          </p>
          <p className="mt-1 text-sm text-zinc-500">{formatStartsAt(tournament.startsAt)}</p>
          {ratingLimitLabel && (
            <p className="mt-1 text-sm text-zinc-500">
              Участники: {ratingLimitLabel} (сначала рейтинг в клубе, иначе общий)
            </p>
          )}
          <p className="mt-1 text-sm text-zinc-500">
            Фора:{" "}
            {tournament.handicapHalfStep
              ? "с учётом шага рейтинга 0,5"
              : "только целая часть разницы рейтингов (без +1 в нечётных)"}
          </p>
          {tournament.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
              {tournament.description}
            </p>
          )}
        </SiteCard>

        {registrationOpen && (
          <SiteCard className="text-sm">
            {!player ? (
              <p className="text-[var(--text-secondary)]">
                <Link
                  href={`/login?next=/tournaments/${tournament.id}`}
                  className="font-medium text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Войдите
                </Link>
                , чтобы записаться на турнир.
              </p>
            ) : myParticipation ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                {pair && "player1" in myParticipation ? (
                  <>
                    Вы участвуете в паре{" "}
                    <span className="font-medium">{teamLabel(myParticipation)}</span>
                    {" · "}
                    <StatusBadge
                      status={myParticipation.status}
                      label={
                        REGISTRATION_STATUS_LABELS[myParticipation.status] ??
                        myParticipation.status
                      }
                    />
                  </>
                ) : myParticipation && "player" in myParticipation ? (
                  <>
                    {myParticipation.status === "PENDING" ? (
                      <>Заявка подана — ожидает подтверждения организатора</>
                    ) : myParticipation.status === "CONFIRMED" ? (
                      <>Вы участвуете в турнире</>
                    ) : (
                      <>
                        Статус заявки:{" "}
                        {REGISTRATION_STATUS_LABELS[myParticipation.status] ??
                          myParticipation.status}
                      </>
                    )}
                    {" · "}
                    <StatusBadge
                      status={myParticipation.status}
                      label={
                        REGISTRATION_STATUS_LABELS[myParticipation.status] ??
                        myParticipation.status
                      }
                    />
                  </>
                ) : null}
                {myParticipation && "player" in myParticipation && (
                  <RegistrationCancelButton
                    registrationId={myParticipation.id}
                    tournamentStatus={tournament.status}
                    registrationStatus={myParticipation.status}
                    bracketFormed={matchCount > 0}
                    className="mt-3"
                  />
                )}
                <p className="mt-2 text-[var(--text-secondary)]">
                  <Link
                    href="/cabinet"
                    className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Личный кабинет
                  </Link>
                </p>
              </div>
            ) : pair ? (
              <div className="home-content-card rounded-xl px-4 py-3 home-card-body">
                <p>
                  Запись на парный турнир — через клуб-организатор. Попросите
                  администратора клуба зарегистрировать вашу пару.
                </p>
                {registrationBlockedByRating && (
                  <p className="mt-2 text-amber-800 dark:text-amber-200/90">
                    {registrationBlockedByRating}
                  </p>
                )}
              </div>
            ) : registrationBlockedByRating ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200/90">
                {registrationBlockedByRating}
              </p>
            ) : (
              <TournamentRegisterButton tournamentId={tournament.id} />
            )}
          </SiteCard>
        )}

        <TournamentPublicView
          standings={standings}
          participants={participants}
          matches={publicMatches}
          matchCount={matchCount}
          defaultTab={defaultTab}
          pair={pair}
          bracket={bracketPanel}
        />
      </PageMain>
    </>
  );
}
