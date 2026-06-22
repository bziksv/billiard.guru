import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/admin/status-badge";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { LocalizedUserText } from "@/components/site/localized-user-text";
import { TournamentRegisterButton } from "@/components/site/tournament-register-button";
import { RegistrationCancelButton } from "@/components/site/registration-cancel-button";
import { TournamentPublicView } from "@/components/site/tournament-public-view";
import type { PublicParticipantRow } from "@/lib/tournament-public-standings";
import { getCurrentPlayer } from "@/lib/auth";
import { localizedClubName, localizedPlayerName, localizedTeamLabel } from "@/lib/latin-names";
import {
  formatStartsAt,
  isPairFormat,
  PUBLIC_TOURNAMENT_STATUSES,
  PUBLIC_PARTICIPANT_STATUSES,
} from "@/lib/public-display";
import { findPublicTournamentById } from "@/lib/tournament-public-read";
import { formatRatingRange } from "@/lib/play-listing-display";
import {
  getEffectivePlayerRatingForTournament,
  playerRatingExceedsTournamentMax,
} from "@/lib/tournament-rating-limit-server";
import { formatRating } from "@/lib/rating";
import { getLocalizedBracketFormatLabels } from "@/lib/bracket-formats/settings-server";
import type { AdminTournament } from "@/lib/tournament-admin";
import {
  buildPublicTournamentStandings,
  defaultPublicTournamentTab,
} from "@/lib/tournament-public-standings";
import { buildPublicTournamentBracketView } from "@/lib/tournament-public-bracket";
import { buildPublicMatchRows } from "@/lib/tournament-public-matches";
import { buildLocalizedTournamentDetailMetadata } from "@/lib/seo-locale";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { resolveLocalizedField } from "@/lib/localized-db-text";
import { localizedGeoName } from "@/lib/geo-display";

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
  pendingNote: string,
  locale: AppLocale,
): PublicParticipantRow[] {
  const publicStatuses = new Set<string>(PUBLIC_PARTICIPANT_STATUSES);
  const publicTeams = tournament.teams.filter((team) => publicStatuses.has(team.status));
  const confirmedTeams = publicTeams.filter((team) => team.status === "CONFIRMED");

  const noteForStatus = (status: string) =>
    status === "PENDING" ? pendingNote : undefined;

  const cityLabel = (city?: { nameRu: string; nameEn?: string | null } | null) =>
    city ? localizedGeoName(city.nameRu, locale, city.nameEn) : undefined;

  if (pair || (tournament.matches.length > 0 && confirmedTeams.length > 0)) {
    const teams = tournament.matches.length > 0 ? confirmedTeams : publicTeams;
    return teams.map((team) => ({
      id: team.id,
      name: localizedTeamLabel(locale, team),
      href: team.player2
        ? `/players/${team.player1.id}`
        : `/players/${team.player1.id}`,
      city: cityLabel(team.player1.city),
      ratingLabel: formatRating(
        pair
          ? (team.player1.rating + (team.player2?.rating ?? team.player1.rating)) /
              (team.player2 ? 2 : 1)
          : team.player1.rating,
      ),
      note: noteForStatus(team.status),
    }));
  }

  return tournament.registrations
    .filter((r) => publicStatuses.has(r.status))
    .map((r) => ({
      id: r.player.id,
      name: localizedPlayerName(locale, r.player),
      href: `/players/${r.player.id}`,
      city: cityLabel(r.player.city),
      ratingLabel: formatRating(r.player.rating),
      note: noteForStatus(r.status),
    }));
}

const TOURNAMENT_STATUSES = ["OPEN", "ACTIVE", "FINISHED"] as const;
const REG_STATUSES = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations("detail.notFound");
  const tournament = await findPublicTournamentById(id, {
    club: { include: { city: true } },
  });
  if (
    !tournament ||
    !PUBLIC_TOURNAMENT_STATUSES.includes(
      tournament.status as (typeof PUBLIC_TOURNAMENT_STATUSES)[number],
    )
  ) {
    return { title: t("tournament") };
  }
  const appLocale = locale as AppLocale;
  return buildLocalizedTournamentDetailMetadata(
    resolveLocalizedField(appLocale, tournament.name, tournament.nameEn),
    localizedClubName(appLocale, tournament.club.name, tournament.club.nameLatin),
    localizedGeoName(tournament.club.city.nameRu, appLocale, tournament.club.city.nameEn),
    id,
    locale,
  );
}

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;

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
  const formatLabels = await getLocalizedBracketFormatLabels(locale);
  const formatDisplay = formatLabels[tournament.format] ?? tournament.format;

  const adminTournament = tournament as unknown as AdminTournament;
  const standings = buildPublicTournamentStandings(adminTournament);
  const participants = buildParticipantRows(
    adminTournament,
    pair,
    t("detail.tournament.pendingNote"),
    locale,
  );
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
      registrationBlockedByRating = t("detail.tournament.ratingBlocked", {
        rating: formatRating(effectiveRating),
        limit: formatRating(tournament.ratingMax),
      });
    }
  }

  const ratingLimitLabel =
    tournament.ratingMax != null
      ? formatRatingRange(null, tournament.ratingMax, locale)
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

  const statusKey = TOURNAMENT_STATUSES.find((s) => s === tournament.status);
  const statusLabel = statusKey ? t(`tournamentStatus.${statusKey}`) : tournament.status;

  function registrationStatusLabel(status: string) {
    const key = REG_STATUSES.find((s) => s === status);
    return key ? t(`registrationStatus.${key}`) : status;
  }

  return (
    <>
      <PageHeader title={resolveLocalizedField(locale, tournament.name, tournament.nameEn)}>
        <Link href="/tournaments" className="site-btn-ghost text-emerald-400">
          {t("detail.back.tournaments")}
        </Link>
      </PageHeader>
      <PageMain className="space-y-8 pt-0">
        <SiteCard>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={tournament.status} label={statusLabel} />
            {matchCount > 0 && (
              <span className="text-xs text-[var(--text-muted)]">
                {t("detail.tournament.participantsMatches", {
                  participants: participants.length,
                  matches: matchCount,
                })}
              </span>
            )}
          </div>
          <p className="mt-3 text-[var(--text-secondary)]">{formatDisplay}</p>
          <p className="mt-1 text-sm text-zinc-500">
            <Link href={`/clubs/${tournament.club.id}`} className="hover:text-emerald-400">
              {localizedClubName(locale, tournament.club.name, tournament.club.nameLatin)}
            </Link>
            {" · "}
            {localizedGeoName(tournament.club.city.nameRu, locale, tournament.club.city.nameEn)}
            {", "}
            {localizedGeoName(
              tournament.club.city.country.nameRu,
              locale,
              tournament.club.city.country.nameEn,
            )}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {formatStartsAt(tournament.startsAt, locale)}
          </p>
          {ratingLimitLabel && (
            <p className="mt-1 text-sm text-zinc-500">
              {t("detail.tournament.participantsLabel", { range: ratingLimitLabel })}
            </p>
          )}
          <p className="mt-1 text-sm text-zinc-500">
            {tournament.handicapHalfStep
              ? t("detail.tournament.handicapHalfStep")
              : t("detail.tournament.handicapInteger")}
          </p>
          {tournament.description && (
            <div className="mt-4">
              <LocalizedUserText
                text={tournament.description}
                textEn={tournament.descriptionEn}
                linkify
              />
            </div>
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
                  {t("detail.tournament.signInToRegister")}
                </Link>
                {t("detail.tournament.signInSuffix")}
              </p>
            ) : myParticipation ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                {pair && "player1" in myParticipation ? (
                  <>
                    {t("detail.tournament.pairParticipating", {
                      team: localizedTeamLabel(locale, myParticipation),
                    })}
                    {" · "}
                    <StatusBadge
                      status={myParticipation.status}
                      label={registrationStatusLabel(myParticipation.status)}
                    />
                  </>
                ) : myParticipation && "player" in myParticipation ? (
                  <>
                    {myParticipation.status === "PENDING" ? (
                      <>{t("detail.tournament.applicationPending")}</>
                    ) : myParticipation.status === "CONFIRMED" ? (
                      <>{t("detail.tournament.youAreRegistered")}</>
                    ) : (
                      <>
                        {t("detail.tournament.applicationStatus", {
                          status: registrationStatusLabel(myParticipation.status),
                        })}
                      </>
                    )}
                    {" · "}
                    <StatusBadge
                      status={myParticipation.status}
                      label={registrationStatusLabel(myParticipation.status)}
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
                    {t("detail.tournament.cabinet")}
                  </Link>
                </p>
              </div>
            ) : pair ? (
              <div className="home-content-card rounded-xl px-4 py-3 home-card-body">
                <p>{t("detail.tournament.pairRegistration")}</p>
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
