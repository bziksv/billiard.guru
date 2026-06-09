import { parseFloorPlan } from "@/lib/club-floor-plan";
import { floorTableLabel } from "@/lib/floor-plan-booking";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  buildClubBookingFloorPlanPng,
  clubBookingModerationKeyboard,
  listClubBookingNotifyTelegramIds,
} from "@/lib/telegram-club-booking";
import { sendTelegramMessage, sendTelegramPhoto } from "@/lib/telegram";
import { formatBookingRange, formatBookingTableCaption } from "@/lib/table-booking";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildBookingNotifyText(
  clubName: string,
  booking: {
    tableFormat: string;
    floorTableLabel: string | null;
    floorItemId: string | null;
    startsAt: Date;
    endsAt: Date;
    player: { firstName: string; lastName: string; phone: string } | null;
    guestName: string | null;
    guestPhone: string | null;
    playerNote: string | null;
  },
): string {
  const guest = booking.player
    ? `${booking.player.lastName} ${booking.player.firstName}`
    : booking.guestName ?? "Гость";
  const phone = booking.player?.phone ?? booking.guestPhone ?? "—";
  const table = formatBookingTableCaption(
    booking.tableFormat,
    booking.floorTableLabel,
    booking.floorItemId,
  );

  return [
    `🎱 <b>Новая заявка на бронь</b> — ${escapeHtml(clubName)}`,
    "",
    `👤 ${escapeHtml(guest)}`,
    `📞 ${escapeHtml(phone)}`,
    `🪑 ${escapeHtml(table.title)}`,
    table.hint ? `   ${escapeHtml(table.hint)}` : "",
    `🕐 ${escapeHtml(formatBookingRange(booking.startsAt, booking.endsAt))}`,
    booking.playerNote ? `💬 ${escapeHtml(booking.playerNote)}` : "",
    "",
    "🟢 свободен · 🟠 ожидает · 🔴 занят — на схеме ниже.",
    "Подтвердите кнопками или в разделе «Брони столов».",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Уведомление владельцу клуба и сотрудникам: текст + план зала + кнопки подтверждения. */
export async function notifyClubNewBooking(bookingId: string): Promise<void> {
  const row = await prisma.tableBooking.findUnique({
    where: { id: bookingId },
    include: {
      club: { select: { id: true, name: true, floorPlan: true } },
      player: { select: { firstName: true, lastName: true, phone: true } },
    },
  });
  if (!row || row.status !== "PENDING") return;

  const recipients = await listClubBookingNotifyTelegramIds(row.clubId);
  if (recipients.length === 0) return;

  const floorPlan = parseFloorPlan(row.club.floorPlan);
  const text = buildBookingNotifyText(row.club.name, {
    tableFormat: row.tableFormat,
    floorTableLabel: floorTableLabel(floorPlan, row.floorItemId),
    floorItemId: row.floorItemId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    player: row.player,
    guestName: row.guestName,
    guestPhone: row.guestPhone,
    playerNote: row.playerNote,
  });
  const keyboard = clubBookingModerationKeyboard(bookingId);
  const png = await buildClubBookingFloorPlanPng(bookingId);

  for (const chatId of recipients) {
    try {
      if (png) {
        await sendTelegramPhoto(chatId, png, text, { replyMarkup: keyboard }, {
          notificationId: "club-booking-new",
          context: "club-booking-new",
          entityType: "table_booking",
          entityId: bookingId,
        });
      } else {
        await sendTelegramMessage(chatId, text, { replyMarkup: keyboard }, {
          notificationId: "club-booking-new",
          context: "club-booking-new",
          entityType: "table_booking",
          entityId: bookingId,
        });
      }
    } catch (error) {
      logger.warn({ error, clubId: row.clubId, chatId }, "Club booking Telegram notify failed");
    }
  }
}
