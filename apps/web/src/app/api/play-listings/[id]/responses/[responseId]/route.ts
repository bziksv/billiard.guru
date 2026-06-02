import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { authErrorResponse, getCurrentPlayer } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { playListingResponseUpdateSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string; responseId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: listingId, responseId } = await params;
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const listing = await prisma.playListing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
    }

    const response = await prisma.playListingResponse.findUnique({
      where: { id: responseId },
    });
    if (!response || response.listingId !== listingId) {
      return NextResponse.json({ error: "Отклик не найден" }, { status: 404 });
    }

    const data = playListingResponseUpdateSchema.parse(await request.json());
    const isAuthor = listing.authorId === player.id;
    const isResponder = response.playerId === player.id;

    if (data.status === "WITHDRAWN") {
      if (!isResponder) {
        return NextResponse.json({ error: "Только автор отклика может его отозвать" }, { status: 403 });
      }
    } else if (!isAuthor) {
      return NextResponse.json(
        { error: "Только автор объявления может принять или отклонить отклик" },
        { status: 403 },
      );
    }

    const updated = await prisma.playListingResponse.update({
      where: { id: responseId },
      data: { status: data.status },
    });

    if (data.status === "ACCEPTED" && isAuthor) {
      await prisma.playListing.update({
        where: { id: listingId },
        data: { status: "MATCHED" },
      });
    }

    await writeAuditLog({
      action: "play_listing.response_update",
      entityType: "play_listing",
      entityId: listingId,
      actorType: "player",
      actorId: player.id,
      summary: `Отклик → ${data.status}`,
      payload: { responseId, status: data.status },
    });

    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Некорректные данные" },
        { status: 400 },
      );
    }
    logger.error({ error }, "Failed to update play listing response");
    return NextResponse.json({ error: "Не удалось обновить отклик" }, { status: 500 });
  }
}
