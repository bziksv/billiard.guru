import { notFound } from "next/navigation";
import { PlayListingDetailClient } from "@/components/site/play-listing-detail-client";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { getCurrentPlayer } from "@/lib/auth";
import { serializePlayListing } from "@/lib/play-listing-server";
import { prisma } from "@/lib/prisma";
import { playListingListInclude } from "@/lib/public-queries";

export default async function PlayListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getCurrentPlayer();

  const listing = await prisma.playListing.findUnique({
    where: { id },
    include: {
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
    },
  });

  if (!listing) notFound();

  const isAuthor = player?.id === listing.authorId;
  const isOpen =
    listing.status === "OPEN" &&
    (!listing.expiresAt || listing.expiresAt > new Date());

  if (!isOpen && !isAuthor) notFound();

  const myResponse = player
    ? listing.responses.find((r) => r.playerId === player.id)
    : undefined;

  const serialized = serializePlayListing(listing, {
    isAuthor,
    myResponseStatus: myResponse?.status ?? null,
  });

  const responses = isAuthor
    ? listing.responses.map((r) => ({
        id: r.id,
        message: r.message,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        player: r.player,
      }))
    : [];

  return (
    <>
      <PageHeader title="Покатать" lead="Объявление игрока" />
      <PageMain className="pt-0">
        <PlayListingDetailClient
          listing={serialized}
          responses={responses}
          isLoggedIn={!!player}
          isVerified={!!player?.isVerified}
          isAuthor={isAuthor}
        />
      </PageMain>
    </>
  );
}
