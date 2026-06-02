import { prisma } from "@/lib/prisma";
import { getSuperadminTelegramIds } from "@/lib/telegram-admin-ids";
import {
  NOTIFICATION_CATALOG,
  getNotificationById,
  type NotificationDefinition,
} from "@/lib/notifications/catalog";

export type NotificationItemSettings = {
  enabled: boolean;
  templateOverride: string | null;
};

export type NotificationGlobalSettings = {
  testModeEnabled: boolean;
  testPlayerIds: string[];
};

const GLOBAL_ID = "default";

export async function getNotificationGlobalSettings(): Promise<NotificationGlobalSettings> {
  const row = await prisma.notificationGlobalConfig.findUnique({
    where: { id: GLOBAL_ID },
  });
  if (!row) {
    return { testModeEnabled: false, testPlayerIds: [] };
  }
  const ids = row.testPlayerIds;
  return {
    testModeEnabled: row.testModeEnabled,
    testPlayerIds: Array.isArray(ids) ? (ids as string[]) : [],
  };
}

export async function saveNotificationGlobalSettings(
  data: NotificationGlobalSettings,
): Promise<void> {
  await prisma.notificationGlobalConfig.upsert({
    where: { id: GLOBAL_ID },
    create: {
      id: GLOBAL_ID,
      testModeEnabled: data.testModeEnabled,
      testPlayerIds: data.testPlayerIds,
    },
    update: {
      testModeEnabled: data.testModeEnabled,
      testPlayerIds: data.testPlayerIds,
    },
  });
}

export async function getNotificationItemSettings(
  notificationId: string,
): Promise<NotificationItemSettings> {
  const row = await prisma.notificationTypeConfig.findUnique({
    where: { notificationId },
  });
  return {
    enabled: row?.enabled ?? true,
    templateOverride: row?.templateOverride ?? null,
  };
}

export async function getAllNotificationItemSettings(): Promise<
  Record<string, NotificationItemSettings>
> {
  const rows = await prisma.notificationTypeConfig.findMany();
  const map: Record<string, NotificationItemSettings> = {};
  for (const n of NOTIFICATION_CATALOG) {
    map[n.id] = { enabled: true, templateOverride: null };
  }
  for (const row of rows) {
    map[row.notificationId] = {
      enabled: row.enabled,
      templateOverride: row.templateOverride,
    };
  }
  return map;
}

export async function saveNotificationItemSettings(
  notificationId: string,
  data: NotificationItemSettings,
): Promise<void> {
  if (!getNotificationById(notificationId)) {
    throw new Error(`Unknown notification: ${notificationId}`);
  }
  await prisma.notificationTypeConfig.upsert({
    where: { notificationId },
    create: {
      notificationId,
      enabled: data.enabled,
      templateOverride: data.templateOverride,
    },
    update: {
      enabled: data.enabled,
      templateOverride: data.templateOverride,
    },
  });
}

export function isMassBroadcast(def: NotificationDefinition): boolean {
  return Boolean(def.massBroadcast);
}

/** Можно отключать и править шаблон в админке (исходящие с defaultTemplate) */
export function isManageableNotification(def: NotificationDefinition): boolean {
  if (def.manageable === false) return false;
  return def.kind === "outbound";
}

export function hasEditableNotificationTemplate(def: NotificationDefinition): boolean {
  return isManageableNotification(def) && Boolean(def.defaultTemplate);
}

export async function canSendNotification(notificationId: string): Promise<boolean> {
  const def = getNotificationById(notificationId);
  if (!def) return false;
  const { enabled } = await getNotificationItemSettings(notificationId);
  return enabled;
}

export function renderNotificationTemplate(
  override: string | null | undefined,
  vars: Record<string, string>,
  fallback: string,
): string {
  const src = override?.trim() ? override.trim() : fallback;
  let out = src;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

export type MassRecipient = { telegramId: string; playerId?: string };

/**
 * Для массовых рассылок: в тестовом режиме — только выбранные игроки (или суперадмины).
 */
export async function resolveMassTelegramRecipients(
  notificationId: string,
  intended: MassRecipient[],
): Promise<MassRecipient[]> {
  const def = getNotificationById(notificationId);
  if (!def || !isMassBroadcast(def)) {
    return intended;
  }

  const global = await getNotificationGlobalSettings();
  if (!global.testModeEnabled) {
    return intended;
  }

  if (global.testPlayerIds.length > 0) {
    const players = await prisma.player.findMany({
      where: {
        id: { in: global.testPlayerIds },
        isVerified: true,
        telegramId: { not: null },
      },
      select: { id: true, telegramId: true },
    });
    return players.map((p) => ({
      playerId: p.id,
      telegramId: p.telegramId!,
    }));
  }

  const adminTelegramIds = await getSuperadminTelegramIds();
  return adminTelegramIds.map((telegramId) => ({ telegramId }));
}
