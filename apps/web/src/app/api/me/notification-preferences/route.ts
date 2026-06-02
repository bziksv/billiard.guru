import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentPlayer } from "@/lib/auth";
import {
  getPlayerNotificationPreferencesForCabinet,
  setPlayerNotificationEnabled,
} from "@/lib/notifications/player-preferences-server";
import {
  isPlayerSubscriptionNotification,
  PLAYER_SUBSCRIPTION_NOTIFICATION_IDS,
} from "@/lib/notifications/player-subscriptions";

const subscriptionIdSchema = z.enum(
  PLAYER_SUBSCRIPTION_NOTIFICATION_IDS as unknown as [
    (typeof PLAYER_SUBSCRIPTION_NOTIFICATION_IDS)[number],
    ...(typeof PLAYER_SUBSCRIPTION_NOTIFICATION_IDS)[number][],
  ],
);

const patchSchema = z.object({
  notificationId: subscriptionIdSchema,
  enabled: z.boolean(),
});

const patchBulkSchema = z.object({
  preferences: z.array(patchSchema).min(1).max(PLAYER_SUBSCRIPTION_NOTIFICATION_IDS.length),
});

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const data = await getPlayerNotificationPreferencesForCabinet(player.id);
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const single = patchSchema.safeParse(body);
  if (single.success) {
    try {
      await setPlayerNotificationEnabled(
        player.id,
        single.data.notificationId,
        single.data.enabled,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка сохранения";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const data = await getPlayerNotificationPreferencesForCabinet(player.id);
    return NextResponse.json(data);
  }

  const bulk = patchBulkSchema.safeParse(body);
  if (bulk.success) {
    for (const item of bulk.data.preferences) {
      if (!isPlayerSubscriptionNotification(item.notificationId)) continue;
      await setPlayerNotificationEnabled(
        player.id,
        item.notificationId,
        item.enabled,
      );
    }
    const data = await getPlayerNotificationPreferencesForCabinet(player.id);
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
}
