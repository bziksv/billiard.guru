import Link from "next/link";
import { formatRating } from "@/lib/rating";
import {
  formatGameFormat,
  formatPlayListingSchedule,
  formatRatingRange,
  PLAY_LISTING_KIND_LABELS,
  PLAY_LISTING_SCHEDULE_LABELS,
  PLAY_LISTING_STATUS_LABELS,
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
  const ratingRange = formatRatingRange(listing.ratingMin, listing.ratingMax);
  const gameFormat = formatGameFormat(listing.gameFormat);
  const schedule = formatPlayListingSchedule(listing);

  return (
    <SiteCard className="group transition hover:border-emerald-800/60">
      <Link href={`/pokatat/${listing.id}`} className="block">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="site-badge site-badge--accent">
                {PLAY_LISTING_KIND_LABELS[listing.kind] ?? listing.kind}
              </span>
              <span className="site-badge site-badge--muted">
                {PLAY_LISTING_SCHEDULE_LABELS[listing.scheduleType] ?? listing.scheduleType}
              </span>
              {showStatus && listing.status !== "OPEN" && (
                <span className="site-badge site-badge--muted">
                  {PLAY_LISTING_STATUS_LABELS[listing.status] ?? listing.status}
                </span>
              )}
            </div>
            <h2 className="play-listing-card-title">{listing.title}</h2>
          </div>
          {listing.responseCount > 0 && (
            <span className="site-badge site-badge--muted shrink-0 px-2 py-1">
              {listing.responseCount} откл.
            </span>
          )}
        </div>

        {listing.body && (
          <p className="play-listing-card-body mt-2 line-clamp-2 text-sm">{listing.body}</p>
        )}

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="play-listing-card-meta text-xs">Когда</dt>
            <dd className="play-listing-card-value mt-0.5">{schedule}</dd>
          </div>
          <div>
            <dt className="play-listing-card-meta text-xs">Где</dt>
            <dd className="play-listing-card-value mt-0.5">
              {listing.club ? (
                <>
                  {listing.club.name}
                  <span className="play-listing-card-meta"> · </span>
                </>
              ) : null}
              {listing.city.nameRu}
            </dd>
          </div>
          {ratingRange && (
            <div>
              <dt className="play-listing-card-meta text-xs">Рейтинг партнёра</dt>
              <dd className="play-listing-card-value mt-0.5">{ratingRange}</dd>
            </div>
          )}
          {gameFormat && (
            <div>
              <dt className="play-listing-card-meta text-xs">Формат</dt>
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
          {listing.playersNeeded > 1 && (
            <span>Ищет {listing.playersNeeded} игроков</span>
          )}
          {listing.myResponseStatus && listing.myResponseStatus !== "WITHDRAWN" && (
            <span className="font-medium text-emerald-500">Вы откликнулись</span>
          )}
        </div>
      </Link>
    </SiteCard>
  );
}
