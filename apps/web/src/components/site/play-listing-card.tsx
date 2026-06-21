"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { formatRating } from "@/lib/rating";
import { formatGeoLocation } from "@/lib/geo-display";
import type { AppLocale } from "@/i18n/routing";
import { resolveLocalizedField } from "@/lib/localized-db-text";
import {
  formatGameFormat,
  formatPlayersNeeded,
  formatPlayListingSchedule,
  formatRatingRange,
  shouldShowPlayersNeededBadge,
} from "@/lib/play-listing-display";
import type { SerializedPlayListing } from "@/lib/play-listing-server";
import { SiteCard } from "@/components/site/site-card";

export function PlayListingCard({
  listing,
  showStatus,
}: {
  listing: SerializedPlayListing;
  showStatus?: boolean;
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("playListing");
  const title = resolveLocalizedField(locale, listing.title, listing.titleEn);
  const body = listing.body
    ? resolveLocalizedField(locale, listing.body, listing.bodyEn)
    : null;
  const ratingRange = formatRatingRange(listing.ratingMin, listing.ratingMax, locale);
  const gameFormat = formatGameFormat(listing.gameFormat, locale);
  const schedule = formatPlayListingSchedule(listing, locale);
  const location = formatGeoLocation(
    listing.city.nameRu,
    listing.city.country?.nameRu,
    locale,
    listing.city.nameEn,
    listing.city.country?.nameEn,
  );

  return (
    <SiteCard className="group transition hover:border-emerald-800/60">
      <Link href={`/pokatat/${listing.id}`} className="block">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="site-badge site-badge--accent">
                {t(`kind.${listing.kind}` as "kind.SPARRING")}
              </span>
              <span className="site-badge site-badge--muted">
                {t(`schedule.${listing.scheduleType}` as "schedule.ONE_TIME")}
              </span>
              {showStatus && listing.status !== "OPEN" && (
                <span className="site-badge site-badge--muted">
                  {t(`status.${listing.status}` as "status.OPEN")}
                </span>
              )}
            </div>
            <h2 className="play-listing-card-title">{title}</h2>
          </div>
          {listing.responseCount > 0 && (
            <span className="site-badge site-badge--muted shrink-0 px-2 py-1">
              {t("responses", { count: listing.responseCount })}
            </span>
          )}
        </div>

        {body && (
          <p className="play-listing-card-body mt-2 line-clamp-2 text-sm">{body}</p>
        )}

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="play-listing-card-meta text-xs">{t("when")}</dt>
            <dd className="play-listing-card-value mt-0.5">{schedule}</dd>
          </div>
          <div>
            <dt className="play-listing-card-meta text-xs">{t("where")}</dt>
            <dd className="play-listing-card-value mt-0.5">
              {listing.club ? (
                <>
                  {listing.club.name}
                  <span className="play-listing-card-meta"> · </span>
                </>
              ) : null}
              {location}
            </dd>
          </div>
          {ratingRange && (
            <div>
              <dt className="play-listing-card-meta text-xs">{t("rating")}</dt>
              <dd className="play-listing-card-value mt-0.5">{ratingRange}</dd>
            </div>
          )}
          {gameFormat && (
            <div>
              <dt className="play-listing-card-meta text-xs">{t("format")}</dt>
              <dd className="play-listing-card-value mt-0.5">{gameFormat}</dd>
            </div>
          )}
        </dl>

        <div className="play-listing-card-footer mt-4 flex flex-wrap items-center gap-3 pt-4 text-xs">
          <span>
            {listing.author.lastName} {listing.author.firstName}
            <span className="play-listing-card-meta"> · </span>
            {formatRating(listing.author.rating)}
          </span>
          {shouldShowPlayersNeededBadge(listing.playersNeeded) && (
            <span>{t("seeking", { label: formatPlayersNeeded(listing.playersNeeded, locale) })}</span>
          )}
          {listing.myResponseStatus && listing.myResponseStatus !== "WITHDRAWN" && (
            <span className="font-medium text-emerald-500">{t("youResponded")}</span>
          )}
        </div>
      </Link>
    </SiteCard>
  );
}
