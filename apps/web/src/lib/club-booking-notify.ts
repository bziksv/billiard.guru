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

function telegramContactHref(phone: string, telegramUsername?: string | null): string | null {
  const username = telegramUsername?.trim().replace(/^@/, "");
  if (username && /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username)) {
    return `https://t.me/${username}`;
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const normalized =
    digits.startsWith("8") && digits.length === 11 ? `7${digits.slice(1)}` : digits;
  return `https://t.me/+${normalized}`;
}

function formatPhoneLine(phone: string, telegramUsername?: string | null): string {
  const tgHref = telegramContactHref(phone, telegramUsername);
  if (!tgHref || phone === "—") return `📞 ${escapeHtml(phone)}`;
  const username = telegramUsername?.trim().replace(/^@/, "");
  const linkLabel = username ? `@${username}` : "Telegram";
  return `📞 ${escapeHtml(phone)} · <a href="${tgHref}">${escapeHtml(linkLabel)}</a>`;
}

function buildBookingNotifyText(
  clubName: string,
  booking: {
    tableFormat: string;
    floorTableLabel: string | null;
    floorItemId: string | null;
    startsAt: Date;
    endsAt: Date;
    player: { firstName: string; lastName: string; phone: string; telegramUsername?: string | null } | null;
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
    formatPhoneLine(phone, booking.player?.telegramUsername),
    `🪑 ${escapeHtml(table.title)}`,
    table.hint ? `   ${escapeHtml(table.hint)}` : "",
    `🕐 ${escapeHtml(formatBookingRange(booking.startsAt, booking.endsAt))}`,
    booking.playerNote ? `💬 ${escapeHtml(booking.playerNote)}` : "",
    "",
    "📅 На картинке — недельное расписание броней (как в «Брони столов»).",
    "★ — новая заявка · 🟡 ожидает · 🟢 подтверждена.",
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
      player: { select: { firstName: true, lastName: true, phone: true, telegramUsername: true } },
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
