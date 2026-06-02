import { sendTelegramMessage } from "@/lib/telegram";
import { getNotificationById } from "@/lib/notifications/catalog";
import { writeTelegramDeliveryLog } from "@/lib/notifications/delivery-log";
import { canSendNotificationToPlayer } from "@/lib/notifications/player-preferences-server";
import {
  canSendNotification,
  getNotificationItemSettings,
  renderNotificationTemplate,
} from "@/lib/notifications/settings-server";

type NotificationId = string;

interface SendMessageOptions {
  replyMarkup?: object;
}

export type DispatchNotificationMeta = {
  /** Подстановки для templateOverride из админки */
  templateVars?: Record<string, string>;
  /** Учёт подписок в /cabinet (если не передан — только глобальные настройки) */
  playerId?: string;
  batchId?: string;
  entityType?: string;
  entityId?: string;
};

/**
 * Отправка Telegram-сообщения по id из NOTIFICATION_CATALOG.
 * Учитывает enabled и шаблон из БД (если переданы templateVars).
 */
export async function dispatchNotification(
  id: NotificationId,
  chatId: string,
  text: string,
  options?: SendMessageOptions,
  meta?: DispatchNotificationMeta,
): Promise<boolean> {
  const def = getNotificationById(id);
  if (!def) {
    await writeTelegramDeliveryLog({
      notificationId: id,
      context: id,
      status: "skipped",
      skipReason: "unknown_notification",
      chatId,
      playerId: meta?.playerId,
      entityType: meta?.entityType,
      entityId: meta?.entityId,
      batchId: meta?.batchId,
      messagePreview: text,
    });
    throw new Error(`Unknown notification id: ${id}`);
  }

  const logBase = {
    notificationId: id,
    context: id,
    chatId,
    playerId: meta?.playerId,
    entityType: meta?.entityType,
    entityId: meta?.entityId,
    batchId: meta?.batchId,
  };

  if (meta?.playerId) {
    if (!(await canSendNotification(id))) {
      await writeTelegramDeliveryLog({
        ...logBase,
        status: "skipped",
        skipReason: "disabled_admin",
        messagePreview: text,
      });
      return false;
    }
    if (!(await canSendNotificationToPlayer(id, meta.playerId))) {
      await writeTelegramDeliveryLog({
        ...logBase,
        status: "skipped",
        skipReason: "disabled_player",
        messagePreview: text,
      });
      return false;
    }
  } else if (!(await canSendNotification(id))) {
    await writeTelegramDeliveryLog({
      ...logBase,
      status: "skipped",
      skipReason: "disabled_admin",
      messagePreview: text,
    });
    return false;
  }

  let body = text;
  if (meta?.templateVars) {
    const { templateOverride } = await getNotificationItemSettings(id);
    body = renderNotificationTemplate(templateOverride, meta.templateVars, text);
  }

  return sendTelegramMessage(chatId, body, options, logBase);
}
