import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { getNotificationById } from "@/lib/notifications/catalog";
import {
  getAllNotificationItemSettings,
  getNotificationGlobalSettings,
  saveNotificationGlobalSettings,
  saveNotificationItemSettings,
} from "@/lib/notifications/settings-server";
import { z } from "zod";

const patchSchema = z.object({
  global: z
    .object({
      testModeEnabled: z.boolean(),
      testPlayerIds: z.array(z.string()),
    })
    .optional(),
  item: z
    .object({
      notificationId: z.string(),
      enabled: z.boolean(),
      templateOverride: z.string().nullable(),
    })
    .optional(),
});

export async function GET() {
  try {
    await requireSuperAdmin();
    const [global, items] = await Promise.all([
      getNotificationGlobalSettings(),
      getAllNotificationItemSettings(),
    ]);
    return NextResponse.json({ global, items });
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

    if (body.global) {
      await saveNotificationGlobalSettings(body.global);
    }

    if (body.item) {
      const def = getNotificationById(body.item.notificationId);
      if (!def) {
        return NextResponse.json({ error: "Неизвестный тип уведомления" }, { status: 400 });
      }
      await saveNotificationItemSettings(body.item.notificationId, {
        enabled: body.item.enabled,
        templateOverride: body.item.templateOverride,
      });
    }

    const [global, items] = await Promise.all([
      getNotificationGlobalSettings(),
      getAllNotificationItemSettings(),
    ]);

    return NextResponse.json({ ok: true, global, items });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
