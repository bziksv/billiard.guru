import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { isBracketFormatCode } from "@/lib/bracket-formats/catalog";
import {
  getAllBracketFormatSettings,
  saveBracketFormatSettings,
} from "@/lib/bracket-formats/settings-server";
import { z } from "zod";

const patchSchema = z
  .object({
    formatCode: z.string(),
    enabled: z.boolean().optional(),
    maintenanceMode: z.boolean().optional(),
  })
  .refine((b) => b.enabled !== undefined || b.maintenanceMode !== undefined, {
    message: "Укажите enabled или maintenanceMode",
  });

export async function GET() {
  try {
    await requireSuperAdmin();
    const settings = await getAllBracketFormatSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = patchSchema.parse(await request.json());
    if (!isBracketFormatCode(body.formatCode)) {
      return NextResponse.json({ error: "Неизвестный формат сетки" }, { status: 400 });
    }
    await saveBracketFormatSettings(body.formatCode, {
      enabled: body.enabled,
      maintenanceMode: body.maintenanceMode,
    });
    const settings = await getAllBracketFormatSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
