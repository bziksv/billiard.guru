import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import {
  listRatingSnapshots,
  restoreRatingSnapshot,
} from "@/lib/rating-recalc-server";

const bodySchema = z.object({
  confirm: z.literal("RESTORE"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    bodySchema.parse(await request.json());
    const result = await restoreRatingSnapshot({
      snapshotId: id,
      createdById: session.playerId,
    });
    const snapshots = await listRatingSnapshots();
    return NextResponse.json({ ok: true, ...result, snapshots });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Подтвердите восстановление: { "confirm": "RESTORE" }' },
        { status: 400 },
      );
    }
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    const message =
      error instanceof Error ? error.message : "Не удалось восстановить снимок";
    console.error("[rating-snapshot restore]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
