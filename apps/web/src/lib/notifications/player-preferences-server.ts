import { prisma } from "@/lib/prisma";
import { canSendNotification } from "@/lib/notifications/settings-server";
import {
  groupPlayerNotificationItems,
  isPlayerLockedNotification,
  isPlayerPreferenceNotification,
  isPlayerSubscriptionNotification,
  listPlayerNotificationPreferenceItems,
  playerWantsNotification,
  PLAYER_SUBSCRIPTION_NOTIFICATION_IDS,
  type PlayerNotificationPreferenceItem,
} from "@/lib/notifications/player-subscriptions";

export async function getPlayerNotificationEnabledMap(
  playerId: string,
): Promise<Record<string, boolean>> {
  const rows = await prisma.playerNotificationPreference.findMany({
    where: {
      playerId,
      notificationId: { in: [...PLAYER_SUBSCRIPTION_NOTIFICATION_IDS] },
    },
    select: { notificationId: true, enabled: true },
  });
  const map: Record<string, boolean> = {};
  for (const id of PLAYER_SUBSCRIPTION_NOTIFICATION_IDS) {
    map[id] = true;
  }
  for (const row of rows) {
    map[row.notificationId] = row.enabled;
  }
  return map;
}

export async function getPlayerNotificationPreferencesForCabinet(
  playerId: string,
): Promise<{
  hasTelegram: boolean;
  groups: ReturnType<typeof groupPlayerNotificationItems>;
  items: PlayerNotificationPreferenceItem[];
}> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { telegramId: true },
  });
  const enabledById = await getPlayerNotificationEnabledMap(playerId);
  const items = listPlayerNotificationPreferenceItems(enabledById);
  return {
    hasTelegram: Boolean(player?.telegramId),
    items,
    groups: groupPlayerNotificationItems(items),
  };
}

export async function setPlayerNotificationEnabled(
  playerId: string,
  notificationId: string,
  enabled: boolean,
): Promise<void> {
  if (!isPlayerSubscriptionNotification(notificationId)) {
    if (isPlayerLockedNotification(notificationId)) {
      throw new Error("Это уведомление нельзя отключить");
    }
    throw new Error("Неизвестный тип уведомления");
  }

  await prisma.playerNotificationPreference.upsert({
    where: {
      playerId_notificationId: { playerId, notificationId },
    },
    create: { playerId, notificationId, enabled },
    update: { enabled },
  });
}

/** Глобальная админка + личные настройки игрока */
export async function canSendNotificationToPlayer(
  notificationId: string,
  playerId: string,
): Promise<boolean> {
  if (!(await canSendNotification(notificationId))) return false;
  if (!isPlayerSubscriptionNotification(notificationId)) return true;

  const row = await prisma.playerNotificationPreference.findUnique({
    where: {
      playerId_notificationId: { playerId, notificationId },
    },
    select: { enabled: true },
  });
  return playerWantsNotification(notificationId, row?.enabled);
}

export function assertPlayerPreferenceNotificationId(id: string): void {
  if (!isPlayerPreferenceNotification(id)) {
    throw new Error("Недопустимый тип уведомления");
  }
}
