import { writeAuditLog } from "@/lib/audit";
import { parseFloorPlan } from "@/lib/club-floor-plan";
import { floorTableLabel } from "@/lib/floor-plan-booking";
import { logger } from "@/lib/logger";
import { getNotificationLinkBase } from "@/lib/canonical-site-url";
import { dispatchNotification } from "@/lib/notifications";
import type { NotificationId } from "@/lib/notifications/catalog";
import { getNotificationDefaultTemplate } from "@/lib/notifications/default-templates";
import {
  getNotificationItemSettings,
  renderNotificationTemplate,
} from "@/lib/notifications/settings-server";
import { prisma } from "@/lib/prisma";
import {
  formatBookingRange,
  formatBookingTableCaption,
} from "@/lib/table-booking";

function appUrl(path: string) {
  const base = getNotificationLinkBase();
  return `${base.replace(/\/$/, "")}${path}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function loadBookingForNotify(bookingId: string) {
  return prisma.tableBooking.findUnique({
    where: { id: bookingId },
    include: {
      club: { select: { id: true, name: true, floorPlan: true } },
      player: {
        select: { id: true, telegramId: true, isVerified: true },
      },
    },
  });
}

function buildTemplateVars(booking: NonNullable<Awaited<ReturnType<typeof loadBookingForNotify>>>) {
  const floorPlan = parseFloorPlan(booking.club.floorPlan);
  const table = formatBookingTableCaption(
    booking.tableFormat,
    floorTableLabel(floorPlan, booking.floorItemId),
    booking.floorItemId,
  );
  const link = appUrl("/cabinet");
  const useInlineLink = link.startsWith("https://");
  return {
    clubName: escapeHtml(booking.club.name),
    table: escapeHtml(table.title),
    tableHint: table.hint ? `${escapeHtml(table.hint)}\n` : "",
    time: escapeHtml(formatBookingRange(booking.startsAt, booking.endsAt)),
    link: useInlineLink ? "" : `\n\n${link}`,
    linkUrl: link,
    useInlineLink,
  };
}

async function sendBookingStatusToPlayer(
  notificationId: NotificationId,
  auditAction: string,
  bookingId: string,
): Promise<void> {
  try {
    const booking = await loadBookingForNotify(bookingId);
    if (!booking?.player?.telegramId || !booking.player.isVerified) return;

    const built = buildTemplateVars(booking);
    const { templateOverride } = await getNotificationItemSettings(notificationId);
    const fallback = getNotificationDefaultTemplate(notificationId) ?? "";
    const { linkUrl: _u, useInlineLink: _i, ...vars } = built;
    const body = renderNotificationTemplate(templateOverride, vars, fallback);

    const ok = await dispatchNotification(
      notificationId,
      booking.player.telegramId,
      body,
      built.useInlineLink
        ? {
            replyMarkup: {
              inline_keyboard: [[{ text: "Мои брони", url: built.linkUrl }]],
            },
          }
        : undefined,
      { playerId: booking.player.id, entityType: "table_booking", entityId: bookingId },
    );

    if (ok) {
      await writeAuditLog({
        actorType: "system",
        action: auditAction,
        entityType: "table_booking",
        entityId: bookingId,
        payload: { notificationId, clubId: booking.club.id },
      });
    }
  } catch (error) {
    logger.error({ error, bookingId, notificationId }, "Player booking status notify failed");
  }
}

export async function notifyPlayerBookingConfirmed(bookingId: string): Promise<void> {
  await sendBookingStatusToPlayer(
    "player-booking-confirmed",
    "table_booking.notify.confirmed",
    bookingId,
  );
}

export async function notifyPlayerBookingRejected(bookingId: string): Promise<void> {
  await sendBookingStatusToPlayer(
    "player-booking-rejected",
    "table_booking.notify.rejected",
    bookingId,
  );
}

export async function notifyPlayerBookingCancelledByClub(bookingId: string): Promise<void> {
  await sendBookingStatusToPlayer(
    "player-booking-cancelled",
    "table_booking.notify.cancelled",
    bookingId,
  );
}
