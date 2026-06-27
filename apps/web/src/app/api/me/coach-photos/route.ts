import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getCurrentPlayer } from "@/lib/auth";
import { parseCoachGalleryUrls } from "@/lib/coach-profile";
import { saveCoachPhotoFile } from "@/lib/coach-photo-upload";
import { ImageProcessingError } from "@/lib/image-processing";
import { jsonUpdateValue } from "@/lib/prisma-json";
import { prisma } from "@/lib/prisma";

const MAX_PHOTOS = 12;

export async function POST(request: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Выберите файл" }, { status: 400 });
    }

    const current = parseCoachGalleryUrls(player.coachGalleryUrls);
    if (current.length >= MAX_PHOTOS) {
      return NextResponse.json({ error: `Не больше ${MAX_PHOTOS} фото` }, { status: 400 });
    }

    const url = await saveCoachPhotoFile(file);
    const gallery = [...current, url];

    await prisma.player.update({
      where: { id: player.id },
      data: { coachGalleryUrls: jsonUpdateValue(gallery) },
    });

    return NextResponse.json({ url, coachGalleryUrls: gallery });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof ImageProcessingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось загрузить фото" }, { status: 500 });
  }
}
