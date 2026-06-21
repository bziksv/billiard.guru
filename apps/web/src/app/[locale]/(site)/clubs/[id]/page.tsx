import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/admin/status-badge";
import { ClubBookingWidget } from "@/components/site/club-booking-widget";
import { ClubFloorPlanLive } from "@/components/club/club-floor-plan-live";
import { ClubMap } from "@/components/site/club-map";
import { ClubInfoPanel } from "@/components/site/club-info-panel";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { TournamentCard } from "@/components/site/tournament-card";
import { ClubPhotoGallery } from "@/components/site/club-photo-gallery";
import { LocalizedUserText } from "@/components/site/localized-user-text";
import { getCurrentPlayer } from "@/lib/auth";
import { clubPhotoUrls } from "@/lib/club-photos";
import { floorPlanHasItems } from "@/lib/club-floor-plan";
import { localizedGeoName } from "@/lib/geo-display";
import { PUBLIC_TOURNAMENT_STATUSES } from "@/lib/public-display";
import {
  tournamentListInclude,
  tournamentListOrderBy,
} from "@/lib/public-queries";
import { getLocalizedBracketFormatLabels } from "@/lib/bracket-formats/settings-server";
import { prisma } from "@/lib/prisma";
import type { AppLocale } from "@/i18n/routing";
import { resolveLocalizedField, resolveLocalizedPriceTiers } from "@/lib/localized-db-text";
import { priceTiersToJson } from "@/lib/club-schedule";
import { buildLocalizedClubDetailMetadata } from "@/lib/seo-locale";
import { getLocale, getTranslations } from "next-intl/server";

function formatNewsDate(date: Date, locale: string) {
  return date.toLocaleDateString(locale === "en" ? "en-US" : "ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations("detail.notFound");
  const club = await prisma.club.findUnique({
    where: { id },
    include: { city: true },
  });
  if (!club) return { title: t("club") };
  const appLocale = locale as AppLocale;
  return buildLocalizedClubDetailMetadata(
    localizedGeoName(club.name, appLocale),
    localizedGeoName(club.city.nameRu, appLocale, club.city.nameEn),
    id,
    locale,
  );
}

export default async function ClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;

  const club = await prisma.club.findUnique({
    where: { id },
    include: {
      city: { include: { country: true } },
      news: {
        where: { status: "APPROVED" },
        orderBy: { publishedAt: "desc" },
        take: 20,
      },
      tournaments: {
        where: { status: { in: [...PUBLIC_TOURNAMENT_STATUSES] } },
        include: tournamentListInclude,
        orderBy: tournamentListOrderBy,
      },
    },
  });

  if (!club) notFound();

  const formatLabels = await getLocalizedBracketFormatLabels(locale);
  const player = await getCurrentPlayer();
  const mapLat = club.latitude ?? club.city.latitude;
  const mapLng = club.longitude ?? club.city.longitude;
  const upcoming = club.tournaments.filter((tournament) => tournament.status !== "FINISHED");
  const past = club.tournaments.filter((tournament) => tournament.status === "FINISHED");
  const photos = clubPhotoUrls(club);
  const hasFloorPlan = floorPlanHasItems(club.floorPlan);
  const localizedPriceTiers = priceTiersToJson(
    resolveLocalizedPriceTiers(locale, club.priceTiers, club.priceTiersEn),
  );

  return (
    <>
      <PageHeader title={club.name}>
        <Link href="/clubs" className="site-btn-ghost text-emerald-400">
          {t("detail.back.clubs")}
        </Link>
      </PageHeader>
      <PageMain className="space-y-8 pt-0">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <SiteCard className="overflow-hidden p-0">
            <ClubPhotoGallery photos={photos} alt={club.name} />
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={club.isVerified ? "CONFIRMED" : "PENDING"}
                  label={
                    club.isVerified ? t("clubCard.verified") : t("clubCard.pendingTelegram")
                  }
                />
              </div>
              <p className="home-card-body mt-3 text-sm">
                {localizedGeoName(club.city.nameRu, locale, club.city.nameEn)},{" "}
                {localizedGeoName(club.city.country.nameRu, locale, club.city.country.nameEn)}
              </p>
              {club.address && (
                <p className="home-card-muted mt-1 text-sm">
                  {resolveLocalizedField(locale, club.address, club.addressEn)}
                </p>
              )}
              {club.email && (
                <p className="mt-3 text-sm">
                  <a
                    href={`mailto:${club.email}`}
                    className="text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    {club.email}
                  </a>
                </p>
              )}
              {club.description && (
                <div className="mt-4">
                  <LocalizedUserText
                    text={club.description}
                    textEn={club.descriptionEn}
                    linkify
                  />
                </div>
              )}
              {hasFloorPlan && (
                <div id="club-floor" className="mt-6 scroll-mt-28">
                  <h2 className="site-section-title mb-3 text-lg">{t("detail.club.floorPlan")}</h2>
                  <ClubFloorPlanLive
                    clubId={club.id}
                    floorPlan={club.floorPlan}
                    priceTiers={localizedPriceTiers}
                  />
                </div>
              )}
            </div>
          </SiteCard>

          <ClubInfoPanel
            phone={club.displayPhone ?? ""}
            phoneCountryName={club.city.country.nameRu}
            telegramUsername={club.telegramUsername}
            workingHours={club.workingHours}
            workingHoursEn={club.workingHoursEn}
            weeklyHours={club.weeklyHours}
            gamePrice={club.gamePrice}
            gamePriceEn={club.gamePriceEn}
            priceTiers={club.priceTiers}
            priceTiersEn={club.priceTiersEn}
            tableCount={club.tableCount}
            tableCounts={club.tableCounts}
            bookingEnabled={club.bookingEnabled}
            clubId={club.id}
          />
        </div>

        <section>
          <h2 className="site-section-title mb-4">{t("detail.club.onMap")}</h2>
          <SiteCard>
            <ClubMap
              name={club.name}
              address={club.address}
              latitude={mapLat}
              longitude={mapLng}
              cityName={club.city.nameRu}
              countryName={club.city.country.nameRu}
            />
          </SiteCard>
        </section>

        {club.bookingEnabled && (
          <section id="club-booking" className="scroll-mt-28">
            <h2 className="site-section-title mb-4">{t("detail.club.booking")}</h2>
            <SiteCard>
              <ClubBookingWidget
                clubId={club.id}
                clubName={club.name}
                bookingEnabled={club.bookingEnabled}
                bookingAdvanceDays={club.bookingAdvanceDays}
                tableCounts={club.tableCounts}
                floorPlan={club.floorPlan}
                priceTiers={localizedPriceTiers}
                isLoggedIn={Boolean(player)}
              />
            </SiteCard>
          </section>
        )}

        {club.news.length > 0 && (
          <section id="club-news">
            <h2 className="site-section-title mb-4">{t("detail.club.news")}</h2>
            <ul className="space-y-4">
              {club.news.map((item) => (
                <li key={item.id}>
                  <SiteCard>
                    <time className="home-card-muted text-xs">
                      {formatNewsDate(item.publishedAt ?? item.createdAt, locale)}
                    </time>
                    <h3 className="home-card-title mt-1 text-lg font-semibold">
                      {resolveLocalizedField(locale, item.title, item.titleEn)}
                    </h3>
                    <div className="mt-2">
                      <LocalizedUserText text={item.body} textEn={item.bodyEn} linkify />
                    </div>
                  </SiteCard>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="site-section-title mb-4">{t("detail.club.upcomingTournaments")}</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("detail.club.noUpcoming")}</p>
          ) : (
            <ul className="space-y-4">
              {upcoming.map((tournament) => (
                <li key={tournament.id}>
                  <TournamentCard
                    tournament={{ ...tournament, formatLabel: formatLabels[tournament.format] }}
                    href={`/tournaments/${tournament.id}`}
                    compact
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="site-section-title mb-4">{t("detail.club.pastTournaments")}</h2>
          {past.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("detail.club.noPast")}</p>
          ) : (
            <ul className="space-y-4">
              {past.map((tournament) => (
                <li key={tournament.id}>
                  <TournamentCard
                    tournament={{ ...tournament, formatLabel: formatLabels[tournament.format] }}
                    href={`/tournaments/${tournament.id}`}
                    compact
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
