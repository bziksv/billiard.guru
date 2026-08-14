import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import {
  DEFAULT_MIN_H2H_MATCHES,
  DEFAULT_MIN_TOURNAMENTS,
} from "@/lib/rating-preview";
import { buildRatingPreview } from "@/lib/rating-preview-server";
import { tournamentRatingSourceSchema } from "@/lib/validators";

const bodySchema = z.object({
  ratingSource: tournamentRatingSourceSchema.default("SYSTEM"),
  clubId: z.string().min(1).nullable().optional(),
  minTournaments: z.number().int().min(1).max(50).optional(),
  minH2hMatches: z.number().int().min(2).max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = bodySchema.parse(await request.json());
    const ratingSource = body.ratingSource ?? "SYSTEM";
    const clubId = body.clubId ?? null;

    if (ratingSource === "CLUB" && !clubId) {
      return NextResponse.json(
        { error: "Для клубного рейтинга выберите клуб" },
        { status: 400 },
      );
    }

    const bundle = await buildRatingPreview({
      ratingSource,
      clubId,
      minTournaments: body.minTournaments ?? DEFAULT_MIN_TOURNAMENTS,
      minH2hMatches: body.minH2hMatches ?? DEFAULT_MIN_H2H_MATCHES,
    });

    return NextResponse.json(bundle);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Некорректный запрос" },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Не удалось построить превью";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
