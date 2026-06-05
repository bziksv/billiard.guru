import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { authErrorResponse, getCurrentPlayer } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { notifyClubPlayListingResponse } from "@/lib/play-listing-notify";
import { prisma } from "@/lib/prisma";
import { playListingRespondSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: listingId } = await params;
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Войдите, чтобы откликнуться" }, { status: 401 });
    }
    if (!player.isVerified) {
      return NextResponse.json(
        { error: "Подтвердите профиль через Telegram" },
        { status: 403 },
      );
    }

    const listing = await prisma.playListing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
    }
    if (listing.authorId === player.id) {
      return NextResponse.json({ error: "Нельзя откликнуться на своё объявление" }, { status: 400 });
    }
    if (listing.status !== "OPEN") {
      return NextResponse.json({ error: "Объявление уже закрыто" }, { status: 400 });
    }
    if (listing.expiresAt && listing.expiresAt <= new Date()) {
      return NextResponse.json({ error: "Срок объявления истёк" }, { status: 400 });
    }

    const data = playListingRespondSchema.parse(await request.json());

    const existing = await prisma.playListingResponse.findUnique({
      where: { listingId_playerId: { listingId, playerId: player.id } },
    });
    if (existing && existing.status !== "WITHDRAWN") {
      return NextResponse.json({ error: "Вы уже откликнулись" }, { status: 409 });
    }

    const response = existing
      ? await prisma.playListingResponse.update({
          where: { id: existing.id },
          data: {
            message: data.message?.trim() || null,
            status: "PENDING",
          },
        })
      : await prisma.playListingResponse.create({
          data: {
            listingId,
            playerId: player.id,
            message: data.message?.trim() || null,
          },
        });

    await writeAuditLog({
      action: "play_listing.respond",
      entityType: "play_listing",
      entityId: listingId,
      actorType: "player",
      actorId: player.id,
      summary: `Отклик на «${listing.title}»`,
    });

    void notifyClubPlayListingResponse(listingId, response.id);

    return NextResponse.json(
      {
        id: response.id,
        status: response.status,
        message: response.message,
      },
      { status: 201 },
    );
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Некорректные данные" },
        { status: 400 },
      );
    }
    logger.error({ error }, "Failed to respond to play listing");
    return NextResponse.json({ error: "Не удалось отправить отклик" }, { status: 500 });
  }
}
