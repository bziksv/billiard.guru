import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireSuperAdmin, requireWritableSuperAdmin } from "@/lib/auth";
import {
  getTournamentDefaults,
  saveTournamentDefaults,
} from "@/lib/tournament-defaults-server";
import {
  tournamentRatingMaxSchema,
  tournamentRatingSourceSchema,
} from "@/lib/validators";

const patchSchema = z
  .object({
    handicapHalfStep: z.boolean(),
    handicapEvenExtraCancelOnFirstLoss: z.boolean().optional().default(false),
    limitByRating: z.boolean(),
    ratingMax: tournamentRatingMaxSchema.nullable().optional(),
    ratingSource: tournamentRatingSourceSchema.optional(),
  })
  .refine((d) => !d.limitByRating || d.ratingMax != null, {
    message: "Укажите максимальный рейтинг",
    path: ["ratingMax"],
  });

export async function GET() {
  try {
    await requireSuperAdmin();
    const defaults = await getTournamentDefaults();
    return NextResponse.json(defaults);
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireWritableSuperAdmin();
    const body = patchSchema.parse(await request.json());
    await saveTournamentDefaults({
      handicapHalfStep: body.handicapHalfStep,
      handicapEvenExtraCancelOnFirstLoss:
        body.handicapHalfStep && body.handicapEvenExtraCancelOnFirstLoss,
      limitByRating: body.limitByRating,
      ratingMax: body.limitByRating ? (body.ratingMax ?? null) : null,
      ratingSource: body.ratingSource ?? "SYSTEM",
    });
    const defaults = await getTournamentDefaults();
    return NextResponse.json({ ok: true, ...defaults });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
