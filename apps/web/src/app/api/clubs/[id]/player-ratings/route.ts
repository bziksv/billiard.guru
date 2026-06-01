import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { authErrorResponse, getSession } from "@/lib/auth";
import { auditActorFields, requireClubManageAccess } from "@/lib/club-manage";
import { prisma } from "@/lib/prisma";
import { clubPlayerRatingSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId } = await params;
    await requireClubManageAccess(clubId);

    const rows = await prisma.clubPlayerRating.findMany({
      where: { clubId },
      include: {
        player: {
          include: { city: { include: { country: true } } },
        },
      },
      orderBy: [{ player: { lastName: "asc" } }, { player: { firstName: "asc" } }],
    });

    return NextResponse.json(rows);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить рейтинги" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId } = await params;
    await requireClubManageAccess(clubId);
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const body = await request.json();
    const data = clubPlayerRatingSchema.parse(body);

    const targetPlayer = await prisma.player.findUnique({ where: { id: data.playerId } });
    if (!targetPlayer) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const row = await prisma.clubPlayerRating.upsert({
      where: {
        clubId_playerId: { clubId, playerId: data.playerId },
      },
      create: {
        clubId,
        playerId: data.playerId,
        rating: data.rating,
      },
      update: {
        rating: data.rating,
      },
      include: {
        player: {
          include: { city: { include: { country: true } } },
        },
      },
    });

    await writeAuditLog({
      ...auditActorFields(session),
      action: "club.player_rating.set",
      entityType: "club_player_rating",
      entityId: row.id,
      section: "players",
      clubId,
      summary: `Рейтинг ${data.rating}`,
      payload: { clubId, playerId: data.playerId, rating: data.rating },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось сохранить рейтинг" }, { status: 500 });
  }
}
