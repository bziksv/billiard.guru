import { Link } from "@/i18n/navigation";
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
import { getLocalizedBracketFormatLabels } from "@/lib/bracket-formats/settings-server";
import type { AdminTournament } from "@/lib/tournament-admin";
import { buildPublicTournamentBracketView } from "@/lib/tournament-public-bracket";
import type { AppLocale } from "@/i18n/routing";
import { localizedClubName } from "@/lib/latin-names";
import { localizedGeoName } from "@/lib/geo-display";
import { resolveLocalizedField } from "@/lib/localized-db-text";
import { getCanonicalSiteOrigin } from "@/lib/canonical-site-url";
import { buildLocalizedTournamentBracketMetadata } from "@/lib/seo-locale";
import { StatusBadge } from "@/components/admin/status-badge";
import { APP_NAME } from "@/lib/brand";
import { getLocale, getTranslations } from "next-intl/server";

const TOURNAMENT_STATUSES = ["OPEN", "ACTIVE", "FINISHED"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "pages.tournamentBracket" });
  const tournament = await findPublicTournamentById(id, { club: true });
  if (
    !tournament ||
    !PUBLIC_TOURNAMENT_STATUSES.includes(
      tournament.status as (typeof PUBLIC_TOURNAMENT_STATUSES)[number],
    )
  ) {
    return { title: t("notFound") };
  }
  const appLocale = locale as AppLocale;
  const name = resolveLocalizedField(appLocale, tournament.name, tournament.nameEn);
  return buildLocalizedTournamentBracketMetadata(name, id, locale);
}

export default async function TournamentBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;

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

  const formatLabels = await getLocalizedBracketFormatLabels(locale);
  const formatDisplay = formatLabels[tournament.format] ?? tournament.format;
  const adminTournament = tournament as unknown as AdminTournament;
  const { matches, standings } = buildPublicTournamentBracketView(adminTournament);
  const tournamentName = resolveLocalizedField(locale, tournament.name, tournament.nameEn);
  const statusKey = TOURNAMENT_STATUSES.find((s) => s === tournament.status);
  const statusLabel = statusKey ? t(`tournamentStatus.${statusKey}`) : tournament.status;
  const bracketUrl = `/tournaments/${tournament.id}/bracket`;
  const siteOrigin = getCanonicalSiteOrigin();

  return (
    <>
      <PageHeader title={t("pages.tournamentBracket.title", { name: tournamentName })}>
        <Link href={`/tournaments/${tournament.id}`} className="site-btn-ghost text-emerald-400">
          {t("pages.tournamentBracket.back")}
        </Link>
      </PageHeader>
      <PageMain className="space-y-6 pt-0">
        <SiteCard className="flex flex-wrap items-center gap-3 text-sm">
          <StatusBadge status={tournament.status} label={statusLabel} />
          <span className="text-zinc-400">{formatDisplay}</span>
          <span className="text-zinc-500">
            {localizedClubName(locale, tournament.club.name, tournament.club.nameLatin)} ·{" "}
            {formatStartsAt(tournament.startsAt, locale)}
          </span>
        </SiteCard>

        <p className="text-xs text-zinc-500">
          {t("pages.tournamentBracket.publicLink")}{" "}
          <Link href={bracketUrl} className="break-all text-emerald-400 hover:underline">
            {siteOrigin}
            {locale === "en" ? "/en" : ""}
            {bracketUrl}
          </Link>
        </p>

        <PublicTournamentBracketPanel
          tournamentId={tournament.id}
          tournamentName={tournamentName}
          format={tournament.format}
          matches={matches}
          standings={standings}
          handicapHalfStep={tournament.handicapHalfStep}
        />

        <p className="text-center text-xs text-zinc-600">
          {APP_NAME} ·{" "}
          {localizedGeoName(
            tournament.club.city.nameRu,
            locale,
            tournament.club.city.nameEn,
          )}
        </p>
      </PageMain>
    </>
  );
}
