import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getCurrentPlayer } from "@/lib/auth";
import { parseCoachGalleryUrls } from "@/lib/coach-profile";
import { jsonUpdateValue } from "@/lib/prisma-json";
import { prisma } from "@/lib/prisma";
import { coachProfileUpdateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    return NextResponse.json({
      isCoach: player.isCoach,
      coachBio: player.coachBio,
      coachGalleryUrls: parseCoachGalleryUrls(player.coachGalleryUrls),
    });
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

    const body = await request.json();
    const data = coachProfileUpdateSchema.parse(body);
    const gallery = data.coachGalleryUrls ?? parseCoachGalleryUrls(player.coachGalleryUrls);

    const updated = await prisma.player.update({
      where: { id: player.id },
      data: {
        isCoach: data.isCoach,
        coachBio: data.isCoach ? (data.coachBio?.trim() || null) : null,
        coachGalleryUrls: data.isCoach
          ? jsonUpdateValue(gallery.length > 0 ? gallery : null)
          : jsonUpdateValue(null),
      },
      select: {
        isCoach: true,
        coachBio: true,
        coachGalleryUrls: true,
      },
    });

    return NextResponse.json({
      isCoach: updated.isCoach,
      coachBio: updated.coachBio,
      coachGalleryUrls: parseCoachGalleryUrls(updated.coachGalleryUrls),
    });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
