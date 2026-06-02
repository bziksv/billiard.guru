import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { AuthError, authErrorResponse, getCurrentPlayer } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  computePlayListingExpiresAt,
  serializePlayListing,
} from "@/lib/play-listing-server";
import { prisma } from "@/lib/prisma";
import {
  playListingGeoWhere,
  playListingListInclude,
  playListingListOrderBy,
  resolveGeoForPlayer,
} from "@/lib/public-queries";
import type { GeoSearchParams } from "@/lib/site";
import { playListingCreateSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    const { searchParams } = request.nextUrl;
    const geo: GeoSearchParams = {
      countryId: searchParams.get("countryId") ?? undefined,
      cityId: searchParams.get("cityId") ?? undefined,
    };
    const scheduleType = searchParams.get("scheduleType");
    const kind = searchParams.get("kind");
    const scope = searchParams.get("scope");

    const resolvedGeo = resolveGeoForPlayer(
      geo,
      player?.cityId,
      player?.city?.countryId,
    );

    if (scope === "mine") {
      if (!player) {
        return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
      }
      const mine = await prisma.playListing.findMany({
        where: { authorId: player.id },
        include: playListingListInclude,
        orderBy: playListingListOrderBy,
      });
      return NextResponse.json({
        listings: mine.map((l) => serializePlayListing(l, { isAuthor: true })),
      });
    }

    const where = {
      ...playListingGeoWhere(resolvedGeo),
      ...(scheduleType === "ONE_TIME" || scheduleType === "RECURRING"
        ? { scheduleType }
        : {}),
      ...(kind ? { kind: kind as "SPARRING" | "PARTNER" | "OPPONENT" | "TRAINING" | "OTHER" } : {}),
    };

    const listings = await prisma.playListing.findMany({
      where,
      include: playListingListInclude,
      orderBy: playListingListOrderBy,
      take: 100,
    });

    let myResponses: Record<string, string> = {};
    if (player && listings.length > 0) {
      const responses = await prisma.playListingResponse.findMany({
        where: {
          playerId: player.id,
          listingId: { in: listings.map((l) => l.id) },
          status: { not: "WITHDRAWN" },
        },
      });
      myResponses = Object.fromEntries(responses.map((r) => [r.listingId, r.status]));
    }

    return NextResponse.json({
      listings: listings.map((l) =>
        serializePlayListing(l, {
          isAuthor: player?.id === l.authorId,
          myResponseStatus: myResponses[l.id] ?? null,
        }),
      ),
    });
  } catch (error) {
    logger.error({ error }, "Failed to load play listings");
    return NextResponse.json({ error: "Не удалось загрузить объявления" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Войдите, чтобы опубликовать объявление" }, { status: 401 });
    }
    if (!player.isVerified) {
      return NextResponse.json(
        { error: "Подтвердите профиль через Telegram" },
        { status: 403 },
      );
    }

    const raw = await request.json();
    const data = playListingCreateSchema.parse(raw);

    if (data.clubId) {
      const club = await prisma.club.findUnique({
        where: { id: data.clubId },
        select: { cityId: true },
      });
      if (!club) {
        return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
      }
      if (club.cityId !== data.cityId) {
        return NextResponse.json(
          { error: "Клуб должен быть в выбранном городе" },
          { status: 400 },
        );
      }
    }

    const playAt = data.playAt ? new Date(data.playAt) : null;
    const expiresAt = computePlayListingExpiresAt({
      scheduleType: data.scheduleType,
      playAt,
    });

    const listing = await prisma.playListing.create({
      data: {
        authorId: player.id,
        cityId: data.cityId,
        clubId: data.clubId || null,
        title: data.title.trim(),
        body: data.body?.trim() || null,
        kind: data.kind,
        scheduleType: data.scheduleType,
        playAt,
        weekdays: data.scheduleType === "RECURRING" ? data.weekdays : null,
        timeFrom: data.timeFrom || null,
        timeTo: data.timeTo || null,
        gameFormat: data.gameFormat || null,
        ratingMin: data.ratingMin ?? null,
        ratingMax: data.ratingMax ?? null,
        playersNeeded: data.playersNeeded,
        expiresAt,
      },
      include: playListingListInclude,
    });

    await writeAuditLog({
      action: "play_listing.create",
      entityType: "play_listing",
      entityId: listing.id,
      actorType: "player",
      actorId: player.id,
      summary: `Объявление «${listing.title}»`,
      payload: { kind: listing.kind, scheduleType: listing.scheduleType },
    });

    return NextResponse.json(
      serializePlayListing(listing, { isAuthor: true }),
      { status: 201 },
    );
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Некорректные данные" },
        { status: 400 },
      );
    }
    logger.error({ error }, "Failed to create play listing");
    return NextResponse.json({ error: "Не удалось опубликовать объявление" }, { status: 500 });
  }
}
