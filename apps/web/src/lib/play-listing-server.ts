import type { PlayListing } from "@/generated/prisma/client";
import { parseWeekdays } from "@/lib/play-listing-display";

export function computePlayListingExpiresAt(data: {
  scheduleType: "ONE_TIME" | "RECURRING";
  playAt?: Date | null;
}): Date | null {
  if (data.scheduleType === "ONE_TIME" && data.playAt) {
    return new Date(data.playAt.getTime() + 3 * 60 * 60 * 1000);
  }
  if (data.scheduleType === "RECURRING") {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }
  return null;
}

export type SerializedPlayListing = {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  scheduleType: string;
  playAt: string | null;
  weekdays: number[];
  timeFrom: string | null;
  timeTo: string | null;
  gameFormat: string | null;
  ratingMin: number | null;
  ratingMax: number | null;
  playersNeeded: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  responseCount: number;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
    photoUrl: string | null;
    telegramUsername: string | null;
  };
  city: { id: string; nameRu: string; country: { nameRu: string } };
  club: { id: string; name: string } | null;
  isAuthor?: boolean;
  myResponseStatus?: string | null;
};

type ListingWithRelations = PlayListing & {
  author: SerializedPlayListing["author"];
  city: SerializedPlayListing["city"];
  club: SerializedPlayListing["club"];
  _count?: { responses: number };
};

export function serializePlayListing(
  listing: ListingWithRelations,
  extras?: { isAuthor?: boolean; myResponseStatus?: string | null },
): SerializedPlayListing {
  return {
    id: listing.id,
    title: listing.title,
    body: listing.body,
    kind: listing.kind,
    scheduleType: listing.scheduleType,
    playAt: listing.playAt?.toISOString() ?? null,
    weekdays: parseWeekdays(listing.weekdays),
    timeFrom: listing.timeFrom,
    timeTo: listing.timeTo,
    gameFormat: listing.gameFormat,
    ratingMin: listing.ratingMin,
    ratingMax: listing.ratingMax,
    playersNeeded: listing.playersNeeded,
    status: listing.status,
    expiresAt: listing.expiresAt?.toISOString() ?? null,
    createdAt: listing.createdAt.toISOString(),
    responseCount: listing._count?.responses ?? 0,
    author: listing.author,
    city: listing.city,
    club: listing.club,
    isAuthor: extras?.isAuthor,
    myResponseStatus: extras?.myResponseStatus ?? null,
  };
}
