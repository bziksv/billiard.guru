import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { parseRatingPreviewFormula } from "@/lib/rating-auto-config";
import {
  getRatingAutoConfig,
  saveRatingAutoConfig,
} from "@/lib/rating-auto-config-server";

const bodySchema = z.object({
  enabled: z.boolean(),
  formula: z.string().min(1),
  minTournaments: z.number().int().min(1).max(50),
  minH2hMatches: z.number().int().min(2).max(100),
});

export async function GET() {
  try {
    await requireSuperAdmin();
    const config = await getRatingAutoConfig();
    return NextResponse.json(config);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json(
      { error: "Не удалось загрузить настройки рейтинга" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = bodySchema.parse(await request.json());
    const saved = await saveRatingAutoConfig({
      enabled: body.enabled,
      formula: parseRatingPreviewFormula(body.formula),
      minTournaments: body.minTournaments,
      minH2hMatches: body.minH2hMatches,
    });
    return NextResponse.json(saved);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Некорректный запрос" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Не удалось сохранить настройки рейтинга" },
      { status: 500 },
    );
  }
}
