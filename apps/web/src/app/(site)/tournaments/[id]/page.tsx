import Link from "next/link";
import { notFound } from "next/navigation";
import { TournamentBracket } from "@/components/bracket/tournament-bracket";
import { StatusBadge } from "@/components/admin/status-badge";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { TournamentRegisterButton } from "@/components/site/tournament-register-button";
import { RegistrationCancelButton } from "@/components/site/registration-cancel-button";
import { getCurrentPlayer } from "@/lib/auth";
import type { BracketMatchView, SwissStandingView } from "@/lib/bracket-view";
import {
  formatStartsAt,
  isPairFormat,
  playerName,
  PUBLIC_TOURNAMENT_STATUSES,
  teamLabel,
} from "@/lib/public-display";
import { prisma } from "@/lib/prisma";
import { findPublicTournamentById } from "@/lib/tournament-public-read";
import { formatRatingRange } from "@/lib/play-listing-display";
import {
  getEffectivePlayerRatingForTournament,
  playerRatingExceedsTournamentMax,
  tournamentRatingLimitMessage,
} from "@/lib/tournament-rating-limit-server";
import { formatRating } from "@/lib/rating";
import { resolveMatchStreamUrl, resolveTableLabel } from "@/lib/tournament-stream";
import { getBracketFormatLabel } from "@/lib/bracket-formats/settings-server";
import { tournamentFormatDisplayLabel } from "@/lib/tournament-format-display";
import {
  REGISTRATION_STATUS_LABELS,
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/validators";

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

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await findPublicTournamentById(id, {
    club: { include: { city: { include: { country: true } } } },
    registrations: {
      where: { status: "CONFIRMED" },
      include: { player: true },
      orderBy: { createdAt: "asc" },
    },
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

  const pair = isPairFormat(tournament.format);
  const formatLabel = await getBracketFormatLabel(tournament.format);
  const streamContext = {
    tableIds: tournament.tableIds,
    tableStreams: tournament.tableStreams,
  };
  const floorPlan = tournament.club.floorPlan;
  const bracketMatches: BracketMatchView[] = tournament.matches.map((m) => ({
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
  const standings: SwissStandingView[] = tournament.teams.map((t) => ({
    ...t,
    swissPoints: t.swissPoints,
  }));

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
          </div>
          <p className="mt-3 text-zinc-400">
            {tournamentFormatDisplayLabel({ format: tournament.format, formatLabel })}
          </p>
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
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
              {tournament.description}
            </p>
          )}
        </SiteCard>

        <section>
          <h2 className="site-section-title mb-3">{pair ? "Команды" : "Участники"}</h2>
          {pair ? (
            tournament.teams.length === 0 ? (
              <p className="text-sm text-zinc-500">Пока никто не зарегистрирован.</p>
            ) : (
              <ul className="space-y-2">
                {tournament.teams.map((team) => (
                  <li key={team.id} className="site-card px-4 py-3 text-sm">
                    <span className="font-medium">{teamLabel(team)}</span>
                    <span className="text-zinc-500">
                      {" "}
                      — {playerName(team.player1)}
                      {team.player2 ? `, ${playerName(team.player2)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )
          ) : tournament.registrations.length === 0 ? (
            <p className="text-sm text-zinc-500">Пока никто не зарегистрирован.</p>
          ) : (
            <ul className="space-y-2">
              {tournament.registrations.map((r) => (
                <li key={r.id} className="site-card px-4 py-3 text-sm">
                  <Link href={`/players/${r.player.id}`} className="hover:text-emerald-400">
                    {playerName(r.player)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {tournament.status === "OPEN" && (
            <div className="mt-4 text-sm">
              {!player ? (
                <p className="text-emerald-300/90">
                  <Link
                    href={`/login?next=/tournaments/${tournament.id}`}
                    className="underline hover:text-emerald-200"
                  >
                    Войдите
                  </Link>
                  , чтобы записаться на турнир.
                </p>
              ) : myParticipation ? (
                <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-emerald-200">
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
                      bracketFormed={tournament.matches.length > 0}
                      className="mt-3"
                    />
                  )}
                  <p className="mt-2 text-zinc-400">
                    <Link href="/cabinet" className="text-emerald-400 hover:underline">
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
                    <p className="mt-2 text-amber-200/90">{registrationBlockedByRating}</p>
                  )}
                </div>
              ) : registrationBlockedByRating ? (
                <p className="rounded-xl border border-amber-900/40 bg-amber-950/30 px-4 py-3 text-amber-200/90">
                  {registrationBlockedByRating}
                </p>
              ) : (
                <TournamentRegisterButton tournamentId={tournament.id} />
              )}
            </div>
          )}
        </section>

        {tournament.matches.length > 0 && (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="site-section-title">Сетка</h2>
              <Link
                href={`/tournaments/${tournament.id}/bracket`}
                className="site-btn-secondary text-sm"
              >
                Открыть сетку →
              </Link>
            </div>
            <TournamentBracket
              format={tournament.format}
              matches={bracketMatches}
              standings={standings}
              handicapHalfStep={tournament.handicapHalfStep}
            />
          </section>
        )}
      </PageMain>
    </>
  );
}
