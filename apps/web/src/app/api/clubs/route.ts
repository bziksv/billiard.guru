import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { buildConfirmLink, sendTelegramMessage } from "@/lib/telegram";
import { normalizePhoneForCity } from "@/lib/phone-server";
import { clubRegisterSchema } from "@/lib/validators";

export async function GET() {
  const clubs = await prisma.club.findMany({
    include: { city: { include: { country: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(clubs);
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const log = createRequestLogger(requestId);

  try {
    const body = await request.json();

    const phoneResult = await normalizePhoneForCity(
      String(body.phone ?? ""),
      String(body.cityId ?? ""),
    );
    if (phoneResult.error) {
      return NextResponse.json({ error: phoneResult.error }, { status: 400 });
    }

    const data = clubRegisterSchema.parse({
      ...body,
      phone: phoneResult.e164,
    });
    const confirmToken = randomUUID();

    const club = await prisma.club.create({
      data: {
        name: data.name,
        cityId: data.cityId,
        phone: data.phone,
        email: data.email || null,
        confirmToken,
      },
      include: { city: { include: { country: true } } },
    });

    await writeAuditLog({
      actorType: "club",
      actorId: club.id,
      action: "club.register",
      entityType: "club",
      entityId: club.id,
      payload: { name: club.name },
    });

    const confirmLink = buildConfirmLink(confirmToken);
    log.info({ clubId: club.id }, "Club registered");

    return NextResponse.json(
      { ...club, confirmLink, message: "Подтвердите регистрацию через Telegram" },
      { status: 201 },
    );
  } catch (error) {
    log.error({ error }, "Club registration failed");
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось зарегистрировать клуб" }, { status: 500 });
  }
}
