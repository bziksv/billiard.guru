import { NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { TELEGRAM_BOT_USERNAME } from "@/lib/brand";
import { NOTIFY_RADIUS_KM } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import {
  NOTIFICATION_AUDIT_ACTIONS,
  NOTIFICATION_CATALOG,
  NOTIFICATION_FLOWS,
  getNotificationById,
  type NotificationDefinition,
} from "@/lib/notifications/catalog";
import {
  getAllNotificationItemSettings,
  getNotificationGlobalSettings,
  hasEditableNotificationTemplate,
  isManageableNotification,
} from "@/lib/notifications/settings-server";

const STATS_SINCE_DAYS = 30;

export async function GET() {
  try {
    await requireSuperAdmin();

    const since = new Date();
    since.setDate(since.getDate() - STATS_SINCE_DAYS);

    const auditRows =
      NOTIFICATION_AUDIT_ACTIONS.length > 0
        ? await prisma.auditLog.groupBy({
            by: ["action"],
            where: {
              action: { in: NOTIFICATION_AUDIT_ACTIONS },
              createdAt: { gte: since },
            },
            _count: { action: true },
          })
        : [];

    const auditCounts = Object.fromEntries(
      auditRows.map((r) => [r.action, r._count.action]),
    );

    const [global, itemSettings] = await Promise.all([
      getNotificationGlobalSettings(),
      getAllNotificationItemSettings(),
    ]);

    const catalog = NOTIFICATION_CATALOG.map((n: NotificationDefinition) => {
      const def = getNotificationById(n.id) ?? n;
      return {
      ...def,
      manageable: isManageableNotification(def),
      editableTemplate: hasEditableNotificationTemplate(def),
      settings: itemSettings[n.id] ?? { enabled: true, templateOverride: null },
      triggeredByTitles: (def.triggeredBy ?? []).map(
        (id: string) => getNotificationById(id)?.title ?? id,
      ),
      chainsToTitles: (def.chainsTo ?? []).map(
        (id: string) => getNotificationById(id)?.title ?? id,
      ),
      auditCount30d: def.auditAction ? (auditCounts[def.auditAction] ?? 0) : null,
    };
    });

    const webhookUrl =
      process.env.TELEGRAM_WEBHOOK_URL ??
      (process.env.APP_URL
        ? `${process.env.APP_URL.replace(/\/$/, "")}/api/telegram/webhook`
        : null);

    return NextResponse.json({
      global,
      catalog,
      flows: NOTIFICATION_FLOWS.map((flow) => ({
        ...flow,
        steps: flow.steps.map((id) => {
          const def = getNotificationById(id);
          return {
            id,
            title: def?.title ?? id,
            kind: def?.kind,
          };
        }),
      })),
      telegram: {
        botUsername: TELEGRAM_BOT_USERNAME,
        tokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
        webhookUrl,
        adminIdsEnv: process.env.TELEGRAM_ADMIN_IDS?.split(",").filter(Boolean).length ?? 0,
        nearbyRadiusKm: NOTIFY_RADIUS_KM,
      },
      statsSinceDays: STATS_SINCE_DAYS,
      totalCatalog: NOTIFICATION_CATALOG.length,
    });
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
