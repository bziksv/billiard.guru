import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { getDbBackupSettings, saveDbBackupSettings } from "@/lib/db-backup-server";
import { INTERVAL_MINUTE_OPTIONS } from "@/lib/db-backup-types";

const patchSchema = z.object({
  autoEnabled: z.boolean().optional(),
  autoIntervalMinutes: z
    .number()
    .int()
    .min(0)
    .max(10_080)
    .refine((m) => m === 0 || INTERVAL_MINUTE_OPTIONS.includes(m as (typeof INTERVAL_MINUTE_OPTIONS)[number]), {
      message: "Недопустимый интервал",
    })
    .optional(),
  autoHour: z.number().int().min(0).max(23).optional(),
  autoMinute: z.number().int().min(0).max(59).optional(),
  retainCount: z.number().int().min(1).max(100).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = patchSchema.parse(await request.json());
    const settings = await saveDbBackupSettings(body);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }
    const res = authErrorResponse(error);
    if (res) return res;
    console.error("[db-backups settings PATCH]", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireSuperAdmin();
    const settings = await getDbBackupSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
