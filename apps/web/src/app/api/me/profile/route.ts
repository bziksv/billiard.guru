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

    return NextResponse.json({ about: player.about });
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
    const about = data.about?.trim() || null;
    let aboutEn: string | null = null;
    if (about) {
      aboutEn = (await translateText(about, "ru", "en")) ?? null;
    }

    const updated = await prisma.player.update({
      where: { id: player.id },
      data: { about, aboutEn },
      select: { about: true, aboutEn: true },
    });

    return NextResponse.json({ about: updated.about });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
