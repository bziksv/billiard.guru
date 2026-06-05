import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { authErrorResponse, getSession } from "@/lib/auth";
import { requireClubManageAccess } from "@/lib/club-manage";
import { prisma } from "@/lib/prisma";
import { playListingResponseUpdateSchema } from "@/lib/validators";

type RouteParams = {
  params: Promise<{ id: string; listingId: string; responseId: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId, listingId, responseId } = await params;
    const { player: _actor } = await requireClubManageAccess(clubId);

    const listing = await prisma.playListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.clubId !== clubId || !listing.publishedByClub) {
      return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
    }

    const response = await prisma.playListingResponse.findUnique({
      where: { id: responseId },
    });
    if (!response || response.listingId !== listingId) {
      return NextResponse.json({ error: "Отклик не найден" }, { status: 404 });
    }

    const data = playListingResponseUpdateSchema.parse(await request.json());
    if (data.status === "WITHDRAWN") {
      return NextResponse.json({ error: "Недоступно из кабинета клуба" }, { status: 400 });
    }

    const updated = await prisma.playListingResponse.update({
      where: { id: responseId },
      data: { status: data.status },
    });

    if (data.status === "ACCEPTED") {
      await prisma.playListing.update({
        where: { id: listingId },
        data: { status: "MATCHED" },
      });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    await writeAuditLog({
      action: "play_listing.manage.response",
      entityType: "play_listing",
      entityId: listingId,
      actorType: session.role === "SUPERADMIN" ? "admin" : "club",
      actorId: session.playerId,
      section: "pokatat",
      clubId,
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
    return NextResponse.json({ error: "Не удалось обновить отклик" }, { status: 500 });
  }
}
