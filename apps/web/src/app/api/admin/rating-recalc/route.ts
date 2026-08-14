import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { parseRatingPreviewFormula } from "@/lib/rating-auto-config";
import {
  bulkRecalcSystemRating,
  listRatingSnapshots,
} from "@/lib/rating-recalc-server";

const recalcSchema = z.object({
  confirm: z.literal("RECALC"),
  formula: z.string().min(1),
});

export async function GET() {
  try {
    await requireSuperAdmin();
    const snapshots = await listRatingSnapshots();
    return NextResponse.json({ snapshots });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json(
      { error: "Не удалось загрузить снимки рейтинга" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const body = recalcSchema.parse(await request.json());
    const formula = parseRatingPreviewFormula(body.formula);
    const result = await bulkRecalcSystemRating({
      formula,
      createdById: session.playerId,
    });
    const snapshots = await listRatingSnapshots();
    return NextResponse.json({ ...result, snapshots });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Подтвердите прогон: { "confirm": "RECALC", "formula": "…" }' },
        { status: 400 },
      );
    }
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    const message =
      error instanceof Error ? error.message : "Не удалось прогнать рейтинг";
    console.error("[rating-recalc]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
