import type { Prisma } from "@/generated/prisma/client";
import { serializePlayListing } from "@/lib/play-listing-server";
import { playListingListInclude } from "@/lib/public-queries";
import { prisma } from "@/lib/prisma";

export const playListingManageInclude = {
  ...playListingListInclude,
  responses: {
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          rating: true,
          photoUrl: true,
          telegramUsername: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.PlayListingInclude;

export type ManagePlayListingResponse = {
  id: string;
  message: string | null;
  status: string;
  createdAt: string;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
    photoUrl: string | null;
    telegramUsername: string | null;
  };
};

export type ManagePlayListing = ReturnType<typeof serializePlayListing> & {
  publishedByClub: boolean;
  pendingResponseCount: number;
  responses?: ManagePlayListingResponse[];
};

function mapResponses(
  responses: Array<{
    id: string;
    message: string | null;
    status: string;
    createdAt: Date;
    player: ManagePlayListingResponse["player"];
  }>,
): ManagePlayListingResponse[] {
  return responses.map((r) => ({
    id: r.id,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    player: r.player,
  }));
}

export function serializeManagePlayListing(
  listing: Parameters<typeof serializePlayListing>[0] & {
    publishedByClub: boolean;
    responses?: Array<{
      id: string;
      message: string | null;
      status: string;
      createdAt: Date;
      player: ManagePlayListingResponse["player"];
    }>;
  },
  options?: { includeResponses?: boolean },
): ManagePlayListing {
  const responses = listing.responses ?? [];
  const pendingResponseCount = responses.filter((r) => r.status === "PENDING").length;
  const base = serializePlayListing(listing);
  return {
    ...base,
    publishedByClub: listing.publishedByClub,
    pendingResponseCount,
    ...(options?.includeResponses ? { responses: mapResponses(responses) } : {}),
  };
}

export async function loadClubPlayListingsManage(clubId: string) {
  const listings = await prisma.playListing.findMany({
    where: { clubId },
    include: playListingManageInclude,
    orderBy: [{ publishedByClub: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const clubListings = listings
    .filter((l) => l.publishedByClub)
    .map((l) => serializeManagePlayListing(l, { includeResponses: true }));

  const playerListings = listings
    .filter((l) => !l.publishedByClub)
    .map((l) => serializeManagePlayListing(l));

  const pendingResponses = clubListings.reduce((sum, l) => sum + l.pendingResponseCount, 0);
  const clubActive = clubListings.filter((l) => l.status === "OPEN").length;
  const playerActive = playerListings.filter((l) => l.status === "OPEN").length;

  return {
    stats: {
      clubActive,
      playerActive,
      pendingResponses,
      total: listings.length,
    },
    clubListings,
    playerListings,
  };
}

export async function countClubPendingPlayResponses(clubId: string): Promise<number> {
  return prisma.playListingResponse.count({
    where: {
      status: "PENDING",
      listing: { clubId, publishedByClub: true, status: "OPEN" },
    },
  });
}
