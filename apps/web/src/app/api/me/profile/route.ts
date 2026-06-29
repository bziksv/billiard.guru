import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getCurrentPlayer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { translateText } from "@/lib/translation";
import { playerAboutUpdateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    return NextResponse.json({ about: player.about, cityId: player.cityId });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить профиль" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const data = playerAboutUpdateSchema.parse(await request.json());

    const updateData: { about?: string | null; aboutEn?: string | null; cityId?: string } = {};

    if (data.about !== undefined) {
      const about = data.about?.trim() || null;
      updateData.about = about;
      updateData.aboutEn = about ? ((await translateText(about, "ru", "en")) ?? null) : null;
    }

    if (data.cityId !== undefined) {
      const city = await prisma.city.findUnique({ where: { id: data.cityId } });
      if (!city) {
        return NextResponse.json({ error: "Город не найден" }, { status: 400 });
      }
      updateData.cityId = data.cityId;
    }

    const updated = await prisma.player.update({
      where: { id: player.id },
      data: updateData,
      select: { about: true, cityId: true },
    });

    return NextResponse.json({ about: updated.about, cityId: updated.cityId });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
