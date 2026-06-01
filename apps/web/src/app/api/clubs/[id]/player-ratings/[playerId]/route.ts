import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { authErrorResponse, getSession } from "@/lib/auth";
import { auditActorFields, requireClubManageAccess } from "@/lib/club-manage";
import { prisma } from "@/lib/prisma";
import { clubPlayerRatingUpdateSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string; playerId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId, playerId } = await params;
    await requireClubManageAccess(clubId);
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
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
      ...auditActorFields(session),
      action: "club.player_rating.update",
      entityType: "club_player_rating",
      entityId: row.id,
      section: "players",
      clubId,
      summary: `Рейтинг → ${data.rating}`,
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
    await requireClubManageAccess(clubId);
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const existing = await prisma.clubPlayerRating.findUnique({
      where: { clubId_playerId: { clubId, playerId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Игрок не в списке клуба" }, { status: 404 });
    }

    await prisma.clubPlayerRating.delete({ where: { id: existing.id } });

    await writeAuditLog({
      ...auditActorFields(session),
      action: "club.player_rating.remove",
      entityType: "club_player_rating",
      entityId: existing.id,
      section: "players",
      clubId,
      summary: "Игрок убран из рейтинга клуба",
      payload: { clubId, playerId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 500 });
  }
}
