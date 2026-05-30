import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { buildConfirmLink } from "@/lib/telegram";
import { tournamentRegistrationSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = tournamentRegistrationSchema.parse(body);

    const existing = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId: data.tournamentId,
          playerId: data.playerId,
        },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Игрок уже зарегистрирован" }, { status: 409 });
    }

    const player = await prisma.player.findUnique({ where: { id: data.playerId } });
    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId: data.tournamentId,
        playerId: data.playerId,
        clubId: data.clubId ?? null,
        source: data.source,
        status: "PENDING",
      },
      include: {
        player: { include: { city: { include: { country: true } } } },
        tournament: true,
      },
    });

    await writeAuditLog({
      actorType: data.source === "CLUB" ? "club" : "player",
      actorId: data.clubId ?? data.playerId,
      action: "tournament.register",
      entityType: "tournament_registration",
      entityId: registration.id,
    });

    const confirmLink = player.confirmToken
      ? buildConfirmLink(player.confirmToken)
      : null;

    return NextResponse.json({ ...registration, confirmLink }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ошибка регистрации" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = await request.json();
    if (!id || !["CONFIRMED", "REJECTED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }

    const registration = await prisma.tournamentRegistration.update({
      where: { id },
      data: {
        status,
        confirmedAt: status === "CONFIRMED" ? new Date() : null,
      },
      include: { player: true, tournament: true },
    });

    await writeAuditLog({
      actorType: "player",
      actorId: registration.playerId,
      action: `tournament.registration.${status.toLowerCase()}`,
      entityType: "tournament_registration",
      entityId: registration.id,
    });

    return NextResponse.json(registration);
  } catch {
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 500 });
  }
}
