import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { authErrorResponse } from "@/lib/auth";
import { clubOwnedByPlayer } from "@/lib/club-access";
import { requireClubManageAccess } from "@/lib/club-manage";
import {
  listClubStaff,
  requireClubOwnerOnly,
} from "@/lib/club-staff";
import { prisma } from "@/lib/prisma";
import { normalizePhoneForCity } from "@/lib/phone-server";
import { clubStaffAddSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId } = await params;
    const { player, club } = await requireClubManageAccess(clubId);
    const staff = await listClubStaff(clubId);
    const isOwner = clubOwnedByPlayer(club, player);

    return NextResponse.json({
      staff: staff.map((row) => ({
        id: row.id,
        playerId: row.playerId,
        createdAt: row.createdAt.toISOString(),
        player: row.player,
      })),
      isOwner,
    });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить сотрудников" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId } = await params;
    const { player: actor, club } = await requireClubManageAccess(clubId);

    const ownerError = requireClubOwnerOnly(club, actor);
    if (ownerError) {
      return NextResponse.json({ error: ownerError }, { status: 403 });
    }

    const body = await request.json();
    const data = clubStaffAddSchema.parse(body);
    const norm = await normalizePhoneForCity(data.phone, club.cityId);
    if (norm.error || !norm.e164) {
      return NextResponse.json({ error: norm.error ?? "Некорректный телефон" }, { status: 400 });
    }

    const target = await prisma.player.findUnique({ where: { phone: norm.e164 } });
    if (!target) {
      return NextResponse.json(
        { error: "Игрок с таким телефоном не найден. Пусть сначала зарегистрируется на сайте." },
        { status: 404 },
      );
    }

    if (clubOwnedByPlayer(club, target)) {
      return NextResponse.json({ error: "Владелец клуба уже имеет полный доступ" }, { status: 400 });
    }

    const existing = await prisma.clubStaff.findUnique({
      where: { clubId_playerId: { clubId, playerId: target.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Этот игрок уже добавлен как сотрудник" }, { status: 400 });
    }

    const row = await prisma.clubStaff.create({
      data: { clubId, playerId: target.id },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            telegramUsername: true,
            isVerified: true,
          },
        },
      },
    });

    if (actor?.id) {
      await writeAuditLog({
        actorType: "club",
        actorId: actor.id,
        action: "club_staff.add",
        entityType: "club_staff",
        entityId: row.id,
        section: "staff",
        clubId,
        summary: `Добавлен: ${target.lastName} ${target.firstName}`,
        payload: { playerId: target.id },
      });
    }

    return NextResponse.json(
      {
        id: row.id,
        playerId: row.playerId,
        createdAt: row.createdAt.toISOString(),
        player: row.player,
      },
      { status: 201 },
    );
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Укажите телефон" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось добавить сотрудника" }, { status: 500 });
  }
}
