import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { parseRatingPreviewFormula } from "@/lib/rating-auto-config";
import { buildPlayerRatingTrace } from "@/lib/rating-player-trace-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const formulaParam = request.nextUrl.searchParams.get("formula");
    const formula = formulaParam
      ? parseRatingPreviewFormula(formulaParam)
      : undefined;
    const trace = await buildPlayerRatingTrace(id, formula);
    return NextResponse.json(trace);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    const message =
      error instanceof Error ? error.message : "Не удалось построить цепочку";
    const status = message === "Игрок не найден" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
