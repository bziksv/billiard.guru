import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PlayListingDetailClient } from "@/components/site/play-listing-detail-client";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { getCurrentPlayer } from "@/lib/auth";
import { localizedGeoName } from "@/lib/geo-display";
import type { AppLocale } from "@/i18n/routing";
import { resolveLocalizedField } from "@/lib/localized-db-text";
import { serializePlayListing } from "@/lib/play-listing-server";
import { prisma } from "@/lib/prisma";
import { playListingListInclude } from "@/lib/public-queries";
import { buildLocalizedPokatatDetailMetadata } from "@/lib/seo-locale";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale: rawLocale } = await params;
  const locale = rawLocale as AppLocale;
  const t = await getTranslations({ locale, namespace: "playListing.detail" });
  const listing = await prisma.playListing.findUnique({
    where: { id },
    include: { city: true },
  });
  if (!listing) return { title: t("notFound") };

  const title = resolveLocalizedField(locale, listing.title, listing.titleEn);
  const city = localizedGeoName(listing.city.nameRu, locale, listing.city.nameEn);

  return buildLocalizedPokatatDetailMetadata(title, city, id, locale);
}

export default async function PlayListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations();
  const td = await getTranslations("playListing.detail");
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
      <PageHeader title={t("nav.pokatat")} lead={td("lead")} />
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
