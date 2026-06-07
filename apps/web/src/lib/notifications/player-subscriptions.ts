import {
  NOTIFICATION_CATEGORY_LABELS,
  getNotificationById,
  type NotificationCategory,
  type NotificationId,
} from "@/lib/notifications/catalog";

/** Типы уведомлений, которые игрок может включать/выключать в личном кабинете. */
export const PLAYER_SUBSCRIPTION_NOTIFICATION_IDS = [
  "tournament-nearby-announce",
  "match-start-scheduled",
  "tournament-registration-by-club",
  "tournament-registration-self",
  "tournament-registration-confirmed",
  "tournament-registration-rejected",
  "player-booking-confirmed",
  "player-booking-rejected",
  "player-booking-cancelled",
  "idea-author-approved",
  "idea-author-rejected",
  "idea-broadcast",
] as const satisfies readonly NotificationId[];

export type PlayerSubscriptionNotificationId =
  (typeof PLAYER_SUBSCRIPTION_NOTIFICATION_IDS)[number];

/** Всегда включено — отключить нельзя (безопасность входа). */
export const PLAYER_LOCKED_NOTIFICATION_IDS = ["auth-login-request"] as const satisfies readonly NotificationId[];

export type PlayerLockedNotificationId =
  (typeof PLAYER_LOCKED_NOTIFICATION_IDS)[number];

const SUBSCRIPTION_SET = new Set<string>(PLAYER_SUBSCRIPTION_NOTIFICATION_IDS);
const LOCKED_SET = new Set<string>(PLAYER_LOCKED_NOTIFICATION_IDS);

export function isPlayerSubscriptionNotification(id: string): id is PlayerSubscriptionNotificationId {
  return SUBSCRIPTION_SET.has(id);
}

export function isPlayerLockedNotification(id: string): id is PlayerLockedNotificationId {
  return LOCKED_SET.has(id);
}

export function isPlayerPreferenceNotification(id: string): boolean {
  return isPlayerSubscriptionNotification(id) || isPlayerLockedNotification(id);
}

export type PlayerNotificationPreferenceItem = {
  id: string;
  title: string;
  description: string;
  category: NotificationCategory;
  categoryLabel: string;
  enabled: boolean;
  locked: boolean;
};

/** Список для UI кабинета: все типы + блокировка входа. */
export function listPlayerNotificationPreferenceItems(
  enabledById: Record<string, boolean>,
): PlayerNotificationPreferenceItem[] {
  const ids = [
    ...PLAYER_LOCKED_NOTIFICATION_IDS,
    ...PLAYER_SUBSCRIPTION_NOTIFICATION_IDS,
  ];

  return ids.map((id) => {
    const def = getNotificationById(id)!;
    const locked = isPlayerLockedNotification(id);
    return {
      id,
      title: def.title,
      description: def.description,
      category: def.category,
      categoryLabel: NOTIFICATION_CATEGORY_LABELS[def.category],
      enabled: locked ? true : (enabledById[id] ?? true),
      locked,
    };
  });
}

/** Порядок категорий в кабинете */
export const PLAYER_PREFERENCE_CATEGORY_ORDER: NotificationCategory[] = [
  "auth",
  "tournaments",
  "bookings",
  "ideas",
];

export function groupPlayerNotificationItems(
  items: PlayerNotificationPreferenceItem[],
): { category: NotificationCategory; categoryLabel: string; items: PlayerNotificationPreferenceItem[] }[] {
  const byCat = new Map<NotificationCategory, PlayerNotificationPreferenceItem[]>();
  for (const item of items) {
    const list = byCat.get(item.category) ?? [];
    list.push(item);
    byCat.set(item.category, list);
  }
  return PLAYER_PREFERENCE_CATEGORY_ORDER.filter((c) => byCat.has(c)).map((category) => ({
    category,
    categoryLabel: NOTIFICATION_CATEGORY_LABELS[category],
    items: byCat.get(category)!,
  }));
}

/** Проверка перед отправкой игроку */
export function playerWantsNotification(
  notificationId: string,
  prefEnabled: boolean | undefined,
): boolean {
  if (isPlayerLockedNotification(notificationId)) return true;
  if (!isPlayerSubscriptionNotification(notificationId)) return true;
  return prefEnabled !== false;
}
