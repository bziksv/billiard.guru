import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { auditPlayListingStatusLabel } from "@/lib/audit-display";
import { authErrorResponse, getSession } from "@/lib/auth";
import { requireClubManageAccess } from "@/lib/club-manage";
import { serializePlayListing } from "@/lib/play-listing-server";
import { prisma } from "@/lib/prisma";
import { playListingListInclude } from "@/lib/public-queries";
import { playListingUpdateSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string; listingId: string }> };

async function assertClubListing(clubId: string, listingId: string) {
  const listing = await prisma.playListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.clubId !== clubId || !listing.publishedByClub) {
    return null;
  }
  return listing;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId, listingId } = await params;
    const { player: _actor } = await requireClubManageAccess(clubId);
    const listing = await assertClubListing(clubId, listingId);
    if (!listing) {
      return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
    }

    const data = playListingUpdateSchema.parse(await request.json());
    if (!data.status) {
      return NextResponse.json({ error: "Укажите статус" }, { status: 400 });
    }
    const updated = await prisma.playListing.update({
      where: { id: listingId },
      data: { status: data.status },
      include: playListingListInclude,
    });

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    await writeAuditLog({
      action: "play_listing.manage.update",
      entityType: "play_listing",
      entityId: listingId,
      actorType: session.role === "SUPERADMIN" ? "admin" : "club",
      actorId: session.playerId,
      section: "pokatat",
      clubId,
      summary: `Статус: ${auditPlayListingStatusLabel(data.status)}`,
      payload: data,
    });

    return NextResponse.json(serializePlayListing(updated));
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Некорректные данные" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Не удалось обновить объявление" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId, listingId } = await params;
    const { player: _actor } = await requireClubManageAccess(clubId);
    const listing = await assertClubListing(clubId, listingId);
    if (!listing) {
      return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
    }

    await prisma.playListing.delete({ where: { id: listingId } });

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    await writeAuditLog({
      action: "play_listing.manage.delete",
      entityType: "play_listing",
      entityId: listingId,
      actorType: session.role === "SUPERADMIN" ? "admin" : "club",
      actorId: session.playerId,
      section: "pokatat",
      clubId,
      summary: listing.title,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось удалить объявление" }, { status: 500 });
  }
}
