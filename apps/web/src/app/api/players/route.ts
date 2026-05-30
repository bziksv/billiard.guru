import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { buildConfirmLink } from "@/lib/telegram";
import { normalizePhoneForCity } from "@/lib/phone-server";
import { playerRegisterSchema } from "@/lib/validators";

export async function GET() {
  const players = await prisma.player.findMany({
    include: { city: { include: { country: true } } },
    orderBy: { rating: "desc" },
  });
  return NextResponse.json(players);
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const log = createRequestLogger(requestId);

  try {
    const formData = await request.formData();
    const raw = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      middleName: String(formData.get("middleName") ?? "") || undefined,
      cityId: String(formData.get("cityId") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? "") || undefined,
      birthDate: String(formData.get("birthDate") ?? "") || undefined,
      rating: formData.get("rating") ?? 0,
    };

    const phoneResult = await normalizePhoneForCity(raw.phone, raw.cityId);
    if (phoneResult.error) {
      return NextResponse.json({ error: phoneResult.error }, { status: 400 });
    }

    const data = playerRegisterSchema.parse({
      ...raw,
      phone: phoneResult.e164,
    });
    const confirmToken = randomUUID();

    let photoUrl: string | null = null;
    const photo = formData.get("photo");
    if (photo instanceof File && photo.size > 0) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "players");
      await mkdir(uploadsDir, { recursive: true });
      const ext = path.extname(photo.name) || ".jpg";
      const filename = `${confirmToken}${ext}`;
      const buffer = Buffer.from(await photo.arrayBuffer());
      await writeFile(path.join(uploadsDir, filename), buffer);
      photoUrl = `/uploads/players/${filename}`;
    }

    const player = await prisma.player.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        cityId: data.cityId,
        phone: data.phone,
        email: data.email || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        rating: data.rating,
        photoUrl,
        confirmToken,
      },
      include: { city: { include: { country: true } } },
    });

    await writeAuditLog({
      actorType: "player",
      actorId: player.id,
      action: "player.register",
      entityType: "player",
      entityId: player.id,
    });

    const confirmLink = buildConfirmLink(confirmToken);
    log.info({ playerId: player.id }, "Player registered");

    return NextResponse.json(
      { ...player, confirmLink },
      { status: 201 },
    );
  } catch (error) {
    log.error({ error }, "Player registration failed");
    return NextResponse.json({ error: "Не удалось зарегистрировать игрока" }, { status: 500 });
  }
}
