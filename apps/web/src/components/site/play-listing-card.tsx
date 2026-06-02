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
              <span className="rounded-full bg-emerald-950/60 px-2 py-0.5 text-xs font-medium text-emerald-400">
                {PLAY_LISTING_KIND_LABELS[listing.kind] ?? listing.kind}
              </span>
              <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-400">
                {PLAY_LISTING_SCHEDULE_LABELS[listing.scheduleType] ?? listing.scheduleType}
              </span>
              {showStatus && listing.status !== "OPEN" && (
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {PLAY_LISTING_STATUS_LABELS[listing.status] ?? listing.status}
                </span>
              )}
            </div>
            <h2 className="mt-2 text-lg font-semibold text-zinc-100 group-hover:text-emerald-300">
              {listing.title}
            </h2>
          </div>
          {listing.responseCount > 0 && (
            <span className="shrink-0 rounded-lg bg-zinc-800/80 px-2 py-1 text-xs text-zinc-400">
              {listing.responseCount} откл.
            </span>
          )}
        </div>

        {listing.body && (
          <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{listing.body}</p>
        )}

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">Когда</dt>
            <dd className="mt-0.5 text-zinc-300">{schedule}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Где</dt>
            <dd className="mt-0.5 text-zinc-300">
              {listing.club ? (
                <>
                  {listing.club.name}
                  <span className="text-zinc-500"> · </span>
                </>
              ) : null}
              {listing.city.nameRu}
            </dd>
          </div>
          {ratingRange && (
            <div>
              <dt className="text-xs text-zinc-500">Рейтинг партнёра</dt>
              <dd className="mt-0.5 text-zinc-300">{ratingRange}</dd>
            </div>
          )}
          {gameFormat && (
            <div>
              <dt className="text-xs text-zinc-500">Формат</dt>
              <dd className="mt-0.5 text-zinc-300">{gameFormat}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-800/80 pt-4 text-xs text-zinc-500">
          <span>
            {listing.author.lastName} {listing.author.firstName}
            <span className="text-zinc-600"> · </span>
            {formatRating(listing.author.rating)}
          </span>
          {listing.playersNeeded > 1 && (
            <span>Ищет {listing.playersNeeded} игроков</span>
          )}
          {listing.myResponseStatus && listing.myResponseStatus !== "WITHDRAWN" && (
            <span className="text-emerald-500/90">Вы откликнулись</span>
          )}
        </div>
      </Link>
    </SiteCard>
  );
}
