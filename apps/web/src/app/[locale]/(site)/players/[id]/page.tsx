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
import { buildLocalizedPlayerDetailMetadata } from "@/lib/seo-locale";
import { getLocale, getTranslations } from "next-intl/server";

const PUBLIC_STATUSES = ["OPEN", "ACTIVE", "FINISHED"] as const;
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
              {player.registrations.map((r) => (
                <li key={r.id} className="site-card px-4 py-3 text-sm">
                  <Link
                    href={`/tournaments/${r.tournament.id}`}
                    className="font-medium hover:text-emerald-400"
                  >
                    {resolveLocalizedField(locale, r.tournament.name, r.tournament.nameEn)}
                  </Link>
                  <p className="mt-1 text-zinc-500">
                    {localizedClubName(locale, r.tournament.club.name, r.tournament.club.nameLatin)} · {tournamentStatusLabel(r.tournament.status)}
                  </p>
                  <StatusBadge
                    status={r.status}
                    label={registrationStatusLabel(r.status)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageMain>
    </>
  );
}
