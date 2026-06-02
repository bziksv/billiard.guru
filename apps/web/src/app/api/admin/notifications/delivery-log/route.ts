import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import {
  listTelegramDeliveryLogs,
  TELEGRAM_DELIVERY_RETENTION_DAYS,
  type TelegramDeliveryStatus,
} from "@/lib/notifications/delivery-log";
import { NOTIFICATION_CATALOG } from "@/lib/notifications/catalog";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const sp = request.nextUrl.searchParams;
    const notificationId = sp.get("notificationId") ?? undefined;
    const entityType = sp.get("entityType") ?? undefined;
    const entityId = sp.get("entityId") ?? undefined;
    const batchId = sp.get("batchId") ?? undefined;
    const status = sp.get("status") as TelegramDeliveryStatus | null;
    const limit = sp.get("limit") ? Number(sp.get("limit")) : undefined;

    const entries = await listTelegramDeliveryLogs({
      notificationId,
      entityType,
      entityId,
      batchId,
      status: status ?? undefined,
      limit,
    });

    const notificationTitles = Object.fromEntries(
      NOTIFICATION_CATALOG.map((n) => [n.id, n.title]),
    );

    return NextResponse.json({
      retentionDays: TELEGRAM_DELIVERY_RETENTION_DAYS,
      notificationTitles,
      entries,
    });
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
