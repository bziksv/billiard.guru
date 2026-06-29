import { StatusBadge } from "@/components/admin/status-badge";
import { BookingCancelButton } from "@/components/site/booking-cancel-button";
import { RegistrationCancelButton } from "@/components/site/registration-cancel-button";
import { CoachProfileEditor } from "@/components/cabinet/coach-profile-editor";
import { NotificationPreferencesEditor } from "@/components/cabinet/notification-preferences-editor";
import { PlayerAboutEditor } from "@/components/cabinet/player-about-editor";
import { PlayerCitySettings } from "@/components/cabinet/player-city-settings";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { Link } from "@/i18n/navigation";
import { redirect as nextRedirect } from "next/navigation";
import { getCurrentPlayer, isSuperAdmin } from "@/lib/auth";
import { localizedClubName } from "@/lib/latin-names";
import { localizedGeoName } from "@/lib/geo-display";
import { resolveLocalizedField } from "@/lib/localized-db-text";
import { formatRating } from "@/lib/rating";
import { bookingFormatLabel, formatBookingRange } from "@/lib/table-booking";
import { PlayerStatsCard } from "@/components/site/player-stats-card";
import { computePlayerMatchStats } from "@/lib/player-stats";
import { prisma } from "@/lib/prisma";
import { TOURNAMENT_FORMAT_LABELS } from "@/lib/validators";
import type { AppLocale } from "@/i18n/routing";
import { getLocale, getTranslations } from "next-intl/server";

export default async function CabinetPage() {
  const t = await getTranslations();
  const tc = await getTranslations("pages.cabinet");
  const locale = (await getLocale()) as AppLocale;
  const player = await getCurrentPlayer();
  if (!player) {
    nextRedirect("/login?next=/cabinet");
  }

  const registrations = await prisma.tournamentRegistration.findMany({
    where: {
      playerId: player.id,
      status: { notIn: ["CANCELLED", "REJECTED"] },
    },
    include: {
      tournament: {
        include: {
          club: true,
          _count: { select: { matches: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const tableBookings = await prisma.tableBooking.findMany({
    where: {
      playerId: player.id,
      status: { notIn: ["CANCELLED", "REJECTED"] },
      endsAt: { gte: new Date() },
    },
    include: { club: { select: { id: true, name: true, nameLatin: true } } },
    orderBy: { startsAt: "asc" },
  });

  const teams = await prisma.tournamentTeam.findMany({
    where: {
      OR: [{ player1Id: player.id }, { player2Id: player.id }],
    },
    include: {
      tournament: { include: { club: true } },
      player1: true,
      player2: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const pairTeams = teams.filter((team) => team.player2);
  const stats = await computePlayerMatchStats(player.id);
  const cityLabel = localizedGeoName(player.city.nameRu, locale, player.city.nameEn);
  const countryLabel = localizedGeoName(
    player.city.country.nameRu,
    locale,
    player.city.country.nameEn,
  );

  return (
    <>
      <PageHeader
        title={t("nav.cabinet")}
        lead={`${player.lastName} ${player.firstName}${player.middleName ? ` ${player.middleName}` : ""}`}
      />
      <PageMain className="space-y-8 pt-0">
        <SiteCard>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">{tc("city")}</dt>
              <dd className="mt-1">
                {cityLabel}, {countryLabel}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">{tc("phone")}</dt>
              <dd className="mt-1">{player.phone}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">{tc("rating")}</dt>
              <dd className="mt-1 font-mono text-emerald-400">
                {formatRating(player.rating)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">{tc("role")}</dt>
              <dd className="mt-1">
                {t(`userRole.${player.role}` as "userRole.PLAYER")}
              </dd>
            </div>
            {player.telegramUsername && (
              <div>
                <dt className="text-zinc-500">Telegram</dt>
                <dd className="mt-1">@{player.telegramUsername}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/players/${player.id}`} className="site-btn-secondary">
              {tc("publicProfile")}
            </Link>
            {isSuperAdmin(player.role) && (
              <Link href="/admin" className="site-btn-primary">
                {t("nav.admin")}
              </Link>
            )}
          </div>
        </SiteCard>

        <PlayerStatsCard stats={stats} />

        <PlayerCitySettings initialCityId={player.cityId} />

        <NotificationPreferencesEditor />

        <PlayerAboutEditor playerId={player.id} />

        <CoachProfileEditor playerId={player.id} />

        <section>
          <h2 className="site-section-title mb-3">{tc("bookingsTitle")}</h2>
          {tableBookings.length === 0 ? (
            <p className="text-sm text-zinc-500">
              {tc("bookingsEmpty")}{" "}
              <Link href="/clubs" className="text-emerald-400 hover:underline">
                {tc("chooseClub")}
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {tableBookings.map((b) => (
                <li key={b.id} className="site-card px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/clubs/${b.club.id}`} className="font-medium hover:text-emerald-400">
                      {localizedClubName(locale, b.club.name, b.club.nameLatin)}
                    </Link>
                    <StatusBadge
                      status={b.status}
                      label={t(`registrationStatus.${b.status}` as "registrationStatus.PENDING")}
                    />
                  </div>
                  <p className="mt-1 text-zinc-400">
                    {bookingFormatLabel(b.tableFormat)} ·{" "}
                    {formatBookingRange(b.startsAt, b.endsAt, locale)}
                  </p>
                  <BookingCancelButton
                    clubId={b.clubId}
                    bookingId={b.id}
                    startsAt={b.startsAt.toISOString()}
                    className="mt-2"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="site-section-title mb-3">{tc("registrationsTitle")}</h2>
          {registrations.length === 0 ? (
            <p className="text-sm text-zinc-500">
              {tc("registrationsEmpty")}{" "}
              <Link href="/tournaments" className="text-emerald-400 hover:underline">
                {tc("browseTournaments")}
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {registrations.map((r) => (
                <li key={r.id} className="site-card px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/tournaments/${r.tournament.id}`}
                      className="font-medium hover:text-emerald-400"
                    >
                      {resolveLocalizedField(locale, r.tournament.name, r.tournament.nameEn)}
                    </Link>
                    <StatusBadge
                      status={r.status}
                      label={t(`registrationStatus.${r.status}` as "registrationStatus.PENDING")}
                    />
                  </div>
                  <p className="mt-1 text-zinc-400">
                    {TOURNAMENT_FORMAT_LABELS[r.tournament.format]} ·{" "}
                    {localizedClubName(locale, r.tournament.club.name, r.tournament.club.nameLatin)} ·{" "}
                    {t(`tournamentStatus.${r.tournament.status}` as "tournamentStatus.OPEN")}
                  </p>
                  <RegistrationCancelButton
                    registrationId={r.id}
                    tournamentStatus={r.tournament.status}
                    registrationStatus={r.status}
                    bracketFormed={r.tournament._count.matches > 0}
                    className="mt-2"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {pairTeams.length > 0 && (
          <section>
            <h2 className="site-section-title mb-3">{tc("teamsTitle")}</h2>
            <ul className="space-y-2">
              {pairTeams.map((team) => {
                const partner =
                  team.player1Id === player.id ? team.player2 : team.player1;
                return (
                  <li key={team.id} className="site-card px-4 py-3 text-sm">
                    <Link
                      href={`/tournaments/${team.tournament.id}`}
                      className="font-medium hover:text-emerald-400"
                    >
                      {resolveLocalizedField(locale, team.tournament.name, team.tournament.nameEn)}
                    </Link>
                    <p className="mt-1 text-zinc-400">
                      {tc("partner")}:{" "}
                      {partner
                        ? `${partner.lastName} ${partner.firstName}`
                        : "—"}
                      {" · "}
                      {localizedClubName(locale, team.tournament.club.name, team.tournament.club.nameLatin)}
                    </p>
                    <StatusBadge
                      status={team.status}
                      label={t(`registrationStatus.${team.status}` as "registrationStatus.PENDING")}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="site-section-title">{tc("pokatatTitle")}</h2>
            <Link href="/pokatat?tab=create" className="site-btn-primary text-sm">
              {tc("pokatatPublish")}
            </Link>
          </div>
          <p className="mb-4 text-sm text-zinc-400">{tc("pokatatLead")}</p>
          <Link href="/pokatat?tab=mine" className="text-sm text-emerald-400 hover:underline">
            {tc("pokatatMine")}
          </Link>
        </section>
      </PageMain>
    </>
  );
}
