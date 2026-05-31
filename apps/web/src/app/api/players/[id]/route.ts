import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { normalizePhoneForCity } from "@/lib/phone-server";
import { playerUpdateSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const player = await prisma.player.findUnique({
      where: { id },
      include: { city: { include: { country: true } } },
    });
    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить игрока" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const body = await request.json();
    const data = playerUpdateSchema.parse(body);

    const existing = await prisma.player.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    let phone = existing.phone;
    if (data.phone !== undefined) {
      const cityId = data.cityId ?? existing.cityId;
      const phoneResult = await normalizePhoneForCity(data.phone, cityId);
      if (phoneResult.error) {
        return NextResponse.json({ error: phoneResult.error }, { status: 400 });
      }
      phone = phoneResult.e164;
    }

    const player = await prisma.player.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.middleName !== undefined && {
          middleName: data.middleName || null,
        }),
        ...(data.cityId !== undefined && { cityId: data.cityId }),
        ...(data.phone !== undefined && { phone }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.birthDate !== undefined && {
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
        }),
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.isVerified !== undefined && { isVerified: data.isVerified }),
        ...(data.role !== undefined && { role: data.role }),
      },
      include: { city: { include: { country: true } } },
    });

    await writeAuditLog({
      actorType: "admin",
      actorId: session.playerId,
      action: "player.update",
      entityType: "player",
      entityId: id,
    });

    return NextResponse.json(player);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось обновить игрока" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;

    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    if (player.role === "SUPERADMIN") {
      const admins = await prisma.player.count({ where: { role: "SUPERADMIN" } });
      if (admins <= 1) {
        return NextResponse.json(
          { error: "Нельзя удалить единственного суперадмина" },
          { status: 400 },
        );
      }
    }

    await prisma.$transaction([
      prisma.tournamentRegistration.deleteMany({ where: { playerId: id } }),
      prisma.ratingChange.deleteMany({ where: { playerId: id } }),
      prisma.loginChallenge.deleteMany({ where: { playerId: id } }),
      prisma.tournamentTeam.deleteMany({
        where: { OR: [{ player1Id: id }, { player2Id: id }] },
      }),
      prisma.player.delete({ where: { id } }),
    ]);

    await writeAuditLog({
      actorType: "admin",
      actorId: session.playerId,
      action: "player.delete",
      entityType: "player",
      entityId: id,
      payload: { phone: player.phone },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось удалить игрока" }, { status: 500 });
  }
}
