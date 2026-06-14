import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auditPlayListingStatusLabel } from "@/lib/audit-display";
import { writeAuditLog } from "@/lib/audit";
import { authErrorResponse, getCurrentPlayer } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { serializePlayListing } from "@/lib/play-listing-server";
import { prisma } from "@/lib/prisma";
import { playListingListInclude } from "@/lib/public-queries";
import { playListingUpdateSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
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

    if (!listing) {
      return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
    }

    const isAuthor = player?.id === listing.authorId;
    const isOpen =
      listing.status === "OPEN" &&
      (!listing.expiresAt || listing.expiresAt > new Date());

    if (!isOpen && !isAuthor) {
      return NextResponse.json({ error: "Объявление закрыто" }, { status: 404 });
    }

    let myResponseStatus: string | null = null;
    if (player) {
      const mine = listing.responses.find((r) => r.playerId === player.id);
      myResponseStatus = mine?.status ?? null;
    }

    const responses =
      isAuthor || isSuperAdmin(player)
        ? listing.responses.map((r) => ({
            id: r.id,
            message: r.message,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
            player: r.player,
          }))
        : [];

    return NextResponse.json({
      listing: serializePlayListing(listing, { isAuthor, myResponseStatus }),
      responses,
    });
  } catch (error) {
    logger.error({ error }, "Failed to load play listing");
    return NextResponse.json({ error: "Не удалось загрузить объявление" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const listing = await prisma.playListing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
    }
    if (listing.authorId !== player.id) {
      return NextResponse.json({ error: "Только автор может изменить объявление" }, { status: 403 });
    }

    const data = playListingUpdateSchema.parse(await request.json());
    const updated = await prisma.playListing.update({
      where: { id },
      data: { status: data.status },
      include: playListingListInclude,
    });

    await writeAuditLog({
      action: "play_listing.update",
      entityType: "play_listing",
      entityId: id,
      actorType: "player",
      actorId: player.id,
      summary: `Статус: ${auditPlayListingStatusLabel(updated.status)}`,
      payload: data,
    });

    return NextResponse.json(serializePlayListing(updated, { isAuthor: true }));
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Некорректные данные" },
        { status: 400 },
      );
    }
    logger.error({ error }, "Failed to update play listing");
    return NextResponse.json({ error: "Не удалось обновить объявление" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const listing = await prisma.playListing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
    }
    if (listing.authorId !== player.id) {
      return NextResponse.json({ error: "Только автор может удалить объявление" }, { status: 403 });
    }

    await prisma.playListing.delete({ where: { id } });

    await writeAuditLog({
      action: "play_listing.delete",
      entityType: "play_listing",
      entityId: id,
      actorType: "player",
      actorId: player.id,
      summary: listing.title,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    logger.error({ error }, "Failed to delete play listing");
    return NextResponse.json({ error: "Не удалось удалить объявление" }, { status: 500 });
  }
}

function isSuperAdmin(player: { role: string } | null | undefined) {
  return player?.role === "SUPERADMIN";
}
