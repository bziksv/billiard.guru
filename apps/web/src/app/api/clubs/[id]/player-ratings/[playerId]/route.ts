import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { authErrorResponse } from "@/lib/auth";
import { requireClubManageAccess } from "@/lib/club-manage";
import { prisma } from "@/lib/prisma";
import { clubPlayerRatingUpdateSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string; playerId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId, playerId } = await params;
    const { player: actor } = await requireClubManageAccess(clubId);
    const data = clubPlayerRatingUpdateSchema.parse(await request.json());

    const existing = await prisma.clubPlayerRating.findUnique({
      where: { clubId_playerId: { clubId, playerId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Игрок не в списке клуба" }, { status: 404 });
    }

    const row = await prisma.clubPlayerRating.update({
      where: { id: existing.id },
      data: { rating: data.rating },
      include: {
        player: {
          include: { city: { include: { country: true } } },
        },
      },
    });

    await writeAuditLog({
      actorType: actor.role === "SUPERADMIN" ? "admin" : "club",
      actorId: actor.id,
      action: "club.player_rating.update",
      entityType: "club_player_rating",
      entityId: row.id,
      payload: { rating: data.rating },
    });

    return NextResponse.json(row);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось обновить рейтинг" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId, playerId } = await params;
    const { player: actor } = await requireClubManageAccess(clubId);

    const existing = await prisma.clubPlayerRating.findUnique({
      where: { clubId_playerId: { clubId, playerId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Игрок не в списке клуба" }, { status: 404 });
    }

    await prisma.clubPlayerRating.delete({ where: { id: existing.id } });

    await writeAuditLog({
      actorType: actor.role === "SUPERADMIN" ? "admin" : "club",
      actorId: actor.id,
      action: "club.player_rating.remove",
      entityType: "club_player_rating",
      entityId: existing.id,
      payload: { clubId, playerId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 500 });
  }
}
