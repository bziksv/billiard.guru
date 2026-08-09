import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { LocalizedUserText } from "@/components/site/localized-user-text";
import type { AppLocale } from "@/i18n/routing";
import { formatGeoLocation } from "@/lib/geo-display";
import { resolveLocalizedField } from "@/lib/localized-db-text";
import { formatRating } from "@/lib/rating";
import { localizedClubName, localizedPlayerName } from "@/lib/latin-names";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/admin/status-badge";
import { PlayerStatsCard } from "@/components/site/player-stats-card";
import { computePlayerMatchStats } from "@/lib/player-stats";
import {
  loadPlayerTournamentPlaces,
  placeMedal,
} from "@/lib/player-tournament-places-server";
import { buildLocalizedPlayerDetailMetadata } from "@/lib/seo-locale";
import { cn } from "@/lib/cn";
import { getLocale, getTranslations } from "next-intl/server";

const PUBLIC_STATUSES = ["OPEN", "ACTIVE", "FINISHED", "DID_NOT_TAKE_PLACE"] as const;
const REG_STATUSES = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations("detail.notFound");
  const player = await prisma.player.findUnique({
    where: { id },
    include: { city: { include: { country: true } } },
  });
  if (!player) return { title: t("player") };
  const appLocale = locale as AppLocale;
  const cityLabel = player.city
    ? formatGeoLocation(
        player.city.nameRu,
        player.city.country.nameRu,
        appLocale,
        player.city.nameEn,
        player.city.country.nameEn,
      )
    : null;
  const metadata = buildLocalizedPlayerDetailMetadata(
    localizedPlayerName(appLocale, player),
    cityLabel,
    id,
    locale,
  );
  // Неподтверждённые игроки (добавлены клубом, без привязки Telegram) видны
  // в протоколах турниров, но в каталог не попадают — не индексируем.
  if (!player.isVerified) {
    metadata.robots = { index: false, follow: true };
  }
  return metadata;
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      city: { include: { country: true } },
      registrations: {
        include: { tournament: { include: { club: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!player) notFound();

  const stats = await computePlayerMatchStats(player.id);
  const places = await loadPlayerTournamentPlaces(
    player.id,
    player.registrations.map((r) => ({
      id: r.tournament.id,
      status: r.tournament.status,
    })),
  );

  function tournamentStatusLabel(status: string) {
    const key = PUBLIC_STATUSES.find((s) => s === status);
    return key ? t(`tournamentStatus.${key}`) : status;
  }

  function registrationStatusLabel(status: string) {
    const key = REG_STATUSES.find((s) => s === status);
    return key ? t(`registrationStatus.${key}`) : status;
  }

  return (
    <>
      <PageHeader title={localizedPlayerName(locale, player)}>
        <Link href="/players" className="site-btn-ghost text-emerald-400">
          {t("detail.back.players")}
        </Link>
      </PageHeader>
      <PageMain className="space-y-8 pt-0">
        <SiteCard>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">{t("detail.player.city")}</dt>
              <dd className="mt-1">
                {formatGeoLocation(
                  player.city.nameRu,
                  player.city.country.nameRu,
                  locale,
                  player.city.nameEn,
                  player.city.country.nameEn,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">{t("detail.player.rating")}</dt>
              <dd className="mt-1 font-mono text-lg text-emerald-400">
                {formatRating(player.rating)}
              </dd>
            </div>
            {player.telegramUsername && (
              <div>
                <dt className="text-zinc-500">Telegram</dt>
                <dd className="mt-1">@{player.telegramUsername}</dd>
              </div>
            )}
          </dl>
          {player.isCoach && (
            <div className="mt-4">
              <Link href={`/coaches/${player.id}`} className="site-btn-primary text-sm">
                {t("detail.player.coachProfile")}
              </Link>
            </div>
          )}
        </SiteCard>

        <PlayerStatsCard stats={stats} />

        {player.about?.trim() && (
          <section>
            <h2 className="site-section-title mb-3">{t("detail.player.about")}</h2>
            <SiteCard>
              <LocalizedUserText text={player.about} textEn={player.aboutEn} />
            </SiteCard>
          </section>
        )}

        <section>
          <h2 className="site-section-title mb-3">{t("detail.player.tournaments")}</h2>
          {player.registrations.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("detail.player.noTournaments")}</p>
          ) : (
            <ul className="space-y-2">
              {player.registrations.map((r) => {
                const place = places.get(r.tournament.id);
                const top =
                  place === "1" ? 1 : place === "2" ? 2 : place === "3" ? 3 : 0;
                return (
                  <li
                    key={r.id}
                    className="site-card flex items-center gap-4 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/tournaments/${r.tournament.id}`}
                        className="font-medium hover:text-emerald-400"
                      >
                        {resolveLocalizedField(
                          locale,
                          r.tournament.name,
                          r.tournament.nameEn,
                        )}
                      </Link>
                      <p className="mt-1 text-zinc-500">
                        {localizedClubName(
                          locale,
                          r.tournament.club.name,
                          r.tournament.club.nameLatin,
                        )}{" "}
                        · {tournamentStatusLabel(r.tournament.status)}
                      </p>
                      <StatusBadge
                        status={r.status}
                        label={registrationStatusLabel(r.status)}
                      />
                    </div>
                    {place && (
                      <div
                        className={cn(
                          "flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2 text-center min-w-[4.75rem]",
                          top === 1 &&
                            "bg-amber-500/15 ring-1 ring-amber-500/35 text-amber-800 dark:text-amber-200",
                          top === 2 &&
                            "bg-zinc-400/15 ring-1 ring-zinc-400/40 text-zinc-700 dark:text-zinc-200",
                          top === 3 &&
                            "bg-orange-700/10 ring-1 ring-orange-700/30 text-orange-900 dark:text-orange-200",
                          top === 0 &&
                            "bg-emerald-500/10 ring-1 ring-emerald-500/25 text-emerald-800 dark:text-emerald-300",
                        )}
                        title={`${place} ${t("detail.player.placeSuffix")}`}
                      >
                        {top > 0 && (
                          <span className="text-lg leading-none" aria-hidden>
                            {placeMedal(place)}
                          </span>
                        )}
                        <span className="font-mono text-lg font-semibold tabular-nums leading-tight">
                          {place}
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                          {t("detail.player.placeSuffix")}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </PageMain>
    </>
  );
}
