import { prisma } from "@/lib/prisma";

export const TELEGRAM_DELIVERY_RETENTION_DAYS = 30;

export type TelegramDeliveryStatus = "sent" | "failed" | "skipped";

export type TelegramDeliveryLogInput = {
  notificationId?: string;
  context: string;
  status: TelegramDeliveryStatus;
  chatId?: string;
  playerId?: string;
  entityType?: string;
  entityId?: string;
  batchId?: string;
  skipReason?: string;
  errorMessage?: string;
  messagePreview?: string;
};

export const TELEGRAM_SKIP_REASON_LABELS: Record<string, string> = {
  test_mode: "Тестовый режим — получатель не в списке",
  disabled_admin: "Тип уведомления выключен в админке",
  disabled_player: "Игрок отключил в личном кабинете",
  no_telegram: "Нет привязанного Telegram",
  not_in_radius: "Город вне радиуса рассылки",
  no_bot_token: "TELEGRAM_BOT_TOKEN не задан",
  network_error: "Ошибка сети / Telegram API",
  unknown_notification: "Неизвестный тип уведомления",
};

export const TELEGRAM_DELIVERY_STATUS_LABELS: Record<TelegramDeliveryStatus, string> = {
  sent: "Отправлено",
  failed: "Ошибка",
  skipped: "Пропущено",
};

function preview(text: string, max = 200): string {
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

export async function writeTelegramDeliveryLog(input: TelegramDeliveryLogInput): Promise<void> {
  await prisma.telegramDeliveryLog.create({
    data: {
      notificationId: input.notificationId,
      context: input.context,
      status: input.status,
      chatId: input.chatId,
      playerId: input.playerId,
      entityType: input.entityType,
      entityId: input.entityId,
      batchId: input.batchId,
      skipReason: input.skipReason,
      errorMessage: input.errorMessage?.slice(0, 512),
      messagePreview: input.messagePreview
        ? preview(input.messagePreview)
        : undefined,
    },
  });
}

export function deliveryRetentionSince(): Date {
  return new Date(Date.now() - TELEGRAM_DELIVERY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export async function pruneTelegramDeliveryLogs(): Promise<void> {
  await prisma.telegramDeliveryLog.deleteMany({
    where: { createdAt: { lt: deliveryRetentionSince() } },
  });
}

export async function listTelegramDeliveryLogs(params: {
  notificationId?: string;
  entityType?: string;
  entityId?: string;
  batchId?: string;
  status?: TelegramDeliveryStatus;
  limit?: number;
}) {
  const limit = Math.min(params.limit ?? 100, 500);
  const since = deliveryRetentionSince();

  const rows = await prisma.telegramDeliveryLog.findMany({
    where: {
      createdAt: { gte: since },
      ...(params.notificationId ? { notificationId: params.notificationId } : {}),
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.entityId ? { entityId: params.entityId } : {}),
      ...(params.batchId ? { batchId: params.batchId } : {}),
      ...(params.status ? { status: params.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const playerIds = [...new Set(rows.map((r) => r.playerId).filter(Boolean))] as string[];
  const players =
    playerIds.length > 0
      ? await prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, firstName: true, lastName: true, telegramId: true },
        })
      : [];
  const playerById = new Map(players.map((p) => [p.id, p]));

  return rows.map((row) => {
    const player = row.playerId ? playerById.get(row.playerId) : undefined;
    return {
      id: row.id,
      at: row.createdAt.toISOString(),
      atLabel: row.createdAt.toLocaleString("ru-RU"),
      notificationId: row.notificationId,
      context: row.context,
      status: row.status as TelegramDeliveryStatus,
      statusLabel: TELEGRAM_DELIVERY_STATUS_LABELS[row.status as TelegramDeliveryStatus] ?? row.status,
      chatId: row.chatId,
      playerId: row.playerId,
      playerLabel: player
        ? `${player.lastName} ${player.firstName}`.trim()
        : row.playerId
          ? row.playerId
          : null,
      entityType: row.entityType,
      entityId: row.entityId,
      batchId: row.batchId,
      skipReason: row.skipReason,
      skipReasonLabel: row.skipReason
        ? (TELEGRAM_SKIP_REASON_LABELS[row.skipReason] ?? row.skipReason)
        : null,
      errorMessage: row.errorMessage,
      messagePreview: row.messagePreview,
    };
  });
}
