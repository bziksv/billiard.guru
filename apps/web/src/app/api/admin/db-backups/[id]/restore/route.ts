import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireSuperAdmin, requireWritableSuperAdmin } from "@/lib/auth";
import { restoreDbBackup } from "@/lib/db-backup-server";

const bodySchema = z.object({
  confirm: z.literal("RESTORE"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireWritableSuperAdmin();
    const { id } = await params;
    bodySchema.parse(await request.json());
    await restoreDbBackup(id);
    return NextResponse.json({
      ok: true,
      message: "База восстановлена из бэкапа",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Подтвердите восстановление: { "confirm": "RESTORE" }' },
        { status: 400 },
      );
    }
    const res = authErrorResponse(error);
    if (res) return res;
    console.error("[db-backups restore]", error);
    return NextResponse.json({ error: "Не удалось восстановить бэкап" }, { status: 500 });
  }
}
