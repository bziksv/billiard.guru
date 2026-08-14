import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { LocalizedUserText } from "@/components/site/localized-user-text";
import type { AppLocale } from "@/i18n/routing";
import { formatGeoLocation } from "@/lib/geo-display";
import { formatRating } from "@/lib/rating";
import { localizedPlayerName } from "@/lib/latin-names";
import { prisma } from "@/lib/prisma";
import { PlayerStatsCard } from "@/components/site/player-stats-card";
import { PlayerRatingDynamicsCard } from "@/components/site/player-rating-dynamics-card";
import { PlayerTournamentHistory } from "@/components/site/player-tournament-history";
import { computePlayerMatchStats } from "@/lib/player-stats";
import { loadPlayerTournamentPlaces } from "@/lib/player-tournament-places-server";
import { buildLocalizedPlayerDetailMetadata } from "@/lib/seo-locale";
import { getLocale, getTranslations } from "next-intl/server";

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
        include: {
          tournament: {
            include: {
              club: true,
              _count: {
                select: {
                  registrations: { where: { status: "CONFIRMED" } },
                  teams: { where: { status: "CONFIRMED" } },
                },
              },
            },
          },
        },
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

        <PlayerRatingDynamicsCard playerId={player.id} />

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
          <PlayerTournamentHistory
            items={player.registrations}
            places={places}
          />
        </section>
      </PageMain>
    </>
  );
}
