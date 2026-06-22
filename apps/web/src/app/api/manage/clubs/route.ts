import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { getCurrentPlayer } from "@/lib/auth";
import { resolveClubCoordinates } from "@/lib/club-geocode";
import { listClubsOwnedByPlayer } from "@/lib/impersonate";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { normalizePhoneForCity } from "@/lib/phone-server";
import { tryAutoSendClubConfirmTelegram } from "@/lib/club-confirm-server";
import { buildConfirmLink } from "@/lib/telegram";
import { clubOwnerCreateSchema } from "@/lib/validators";
import { buildClubLatinFields } from "@/lib/latin-names";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const log = createRequestLogger(requestId);

  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    if (!player.isVerified) {
      return NextResponse.json(
        { error: "Подтвердите профиль через Telegram, чтобы добавить клуб" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const data = clubOwnerCreateSchema.parse(body);

    let displayPhone: string | null = null;
    if (data.displayPhone) {
      const displayResult = await normalizePhoneForCity(data.displayPhone, data.cityId);
      if (displayResult.error) {
        return NextResponse.json({ error: displayResult.error }, { status: 400 });
      }
      displayPhone = displayResult.e164;
    }

    const coords = await resolveClubCoordinates(data.address ?? null, data.cityId);
    const confirmToken = randomUUID();

    const club = await prisma.club.create({
      data: {
        name: data.name,
        ...buildClubLatinFields(data.name),
        cityId: data.cityId,
        phone: player.phone,
        displayPhone,
        address: data.address || null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        confirmToken,
        isVerified: false,
      },
      include: { city: { include: { country: true } } },
    });

    await writeAuditLog({
      actorType: "player",
      actorId: player.id,
      action: "club.owner.create",
      entityType: "club",
      entityId: club.id,
      payload: { name: club.name, ownerPhone: player.phone },
    });

    const confirmLink = buildConfirmLink(confirmToken);
    const telegram = await tryAutoSendClubConfirmTelegram(club.id, {
      actorType: "player",
      actorId: player.id,
      action: "club.confirm.telegram_auto",
    });
    log.info(
      { clubId: club.id, playerId: player.id, telegramSent: telegram.sent },
      "Owner club created",
    );

    return NextResponse.json(
      {
        ...club,
        confirmLink,
        telegramSent: telegram.sent,
        telegramSentReason: telegram.reason ?? null,
        message: telegram.sent
          ? "Клуб создан. Подтверждение отправлено в Telegram."
          : "Подтвердите клуб через Telegram",
      },
      { status: 201 },
    );
  } catch (error) {
    log.error({ error }, "Owner club creation failed");
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось создать клуб" }, { status: 500 });
  }
}

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const clubs = await listClubsOwnedByPlayer(player);
  return NextResponse.json(clubs);
}
