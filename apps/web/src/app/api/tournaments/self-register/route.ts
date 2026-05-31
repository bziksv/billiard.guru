import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { getCurrentPlayer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPairFormat } from "@/lib/public-display";
import { z } from "zod";

const selfRegisterSchema = z.object({
  tournamentId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Войдите, чтобы подать заявку" }, { status: 401 });
    }
    if (!player.isVerified) {
      return NextResponse.json(
        { error: "Подтвердите профиль через Telegram, затем подайте заявку" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { tournamentId } = selfRegisterSchema.parse(body);

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }
    if (tournament.status !== "OPEN") {
      return NextResponse.json(
        { error: "Регистрация на этот турнир сейчас закрыта" },
        { status: 400 },
      );
    }
    if (isPairFormat(tournament.format)) {
      return NextResponse.json(
        { error: "На парный турнир заявку подаёт клуб-организатор" },
        { status: 400 },
      );
    }

    const existing = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_playerId: { tournamentId, playerId: player.id },
      },
    });
    if (existing) {
      if (existing.status === "REJECTED" || existing.status === "CANCELLED") {
        const registration = await prisma.tournamentRegistration.update({
          where: { id: existing.id },
          data: { status: "PENDING", source: "SELF", clubId: null },
          include: { tournament: true },
        });
        await writeAuditLog({
          actorType: "player",
          actorId: player.id,
          action: "tournament.register.self",
          entityType: "tournament_registration",
          entityId: registration.id,
        });
        return NextResponse.json(registration, { status: 200 });
      }
      return NextResponse.json(
        { error: "Вы уже подали заявку на этот турнир" },
        { status: 409 },
      );
    }

    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId,
        playerId: player.id,
        source: "SELF",
        status: "PENDING",
      },
      include: { tournament: true },
    });

    await writeAuditLog({
      actorType: "player",
      actorId: player.id,
      action: "tournament.register.self",
      entityType: "tournament_registration",
      entityId: registration.id,
    });

    return NextResponse.json(registration, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Не удалось подать заявку" }, { status: 500 });
  }
}
