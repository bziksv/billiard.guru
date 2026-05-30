import { NextRequest, NextResponse } from "next/server";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { createLoginChallenge } from "@/lib/login-challenge";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: "Укажите телефон" }, { status: 400 });
    }

    const normalized = normalizePhone(String(phone), "Россия");
    if (!normalized.valid) {
      return NextResponse.json(
        { error: normalized.error ?? "Некорректный телефон" },
        { status: 400 },
      );
    }

    const player = await prisma.player.findFirst({
      where: {
        phone: normalized.e164,
        isVerified: true,
        telegramId: { not: null },
      },
    });

    if (!player?.telegramId) {
      return NextResponse.json(
        {
          error:
            "Игрок не найден или Telegram не привязан. Сначала зарегистрируйтесь и подтвердите профиль в боте.",
        },
        { status: 404 },
      );
    }

    const { token, expiresAt } = await createLoginChallenge(
      player.id,
      player.telegramId,
    );

    return NextResponse.json({
      challengeToken: token,
      expiresAt: expiresAt.toISOString(),
      message: "Подтвердите вход в Telegram",
    });
  } catch {
    return NextResponse.json({ error: "Не удалось начать вход" }, { status: 500 });
  }
}
