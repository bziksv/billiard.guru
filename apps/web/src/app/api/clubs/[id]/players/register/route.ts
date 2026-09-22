import { NextRequest, NextResponse } from "next/server";
import { sanitizePlayer } from "@/lib/api-sanitize";
import { writeAuditLog } from "@/lib/audit";
import { authErrorResponse, getRealPlayer, getSession } from "@/lib/auth";
import { clubOwnedByPlayer } from "@/lib/club-access";
import { auditActorFields, requireClubManageAccess } from "@/lib/club-manage";
import { registerPlayerFromFormData } from "@/lib/player-register-server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId } = await params;
    const { player: actor, club } = await requireClubManageAccess(clubId);
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const formData = await request.formData();
    const { player, confirmLink } = await registerPlayerFromFormData(formData);

    const clubRating = await prisma.clubPlayerRating.upsert({
      where: {
        clubId_playerId: { clubId, playerId: player.id },
      },
      create: {
        clubId,
        playerId: player.id,
        rating: player.rating,
      },
      update: {
        rating: player.rating,
      },
    });

    await writeAuditLog({
      ...auditActorFields(session),
      action: "club.player_rating.set",
      entityType: "club_player_rating",
      entityId: clubRating.id,
      section: "players",
      clubId,
      summary: `Игрок добавлен в клуб при регистрации, рейтинг ${player.rating}`,
      payload: { clubId, playerId: player.id, rating: player.rating },
    });

    const safe = sanitizePlayer(player as unknown as Record<string, unknown>);
    const real = await getRealPlayer();
    const isOwnerOrSa =
      real?.role === "SUPERADMIN" || clubOwnedByPlayer(club, actor);

    return NextResponse.json(
      {
        ...safe,
        ...(isOwnerOrSa ? { confirmLink } : {}),
        addedToClub: true,
        message: isOwnerOrSa
          ? "Игрок зарегистрирован и добавлен в список игроков клуба. Подтвердите Telegram."
          : "Игрок зарегистрирован и добавлен в список игроков клуба.",
      },
      { status: 201 },
    );
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Игрок с таким телефоном уже есть. Добавьте его в клуб через список выше." },
        { status: 409 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось зарегистрировать игрока" }, { status: 500 });
  }
}
