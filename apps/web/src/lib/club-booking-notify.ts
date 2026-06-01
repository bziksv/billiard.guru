import { formatBookingRange, formatBookingTableCaption } from "@/lib/table-booking";
import { sendTelegramMessage } from "@/lib/telegram";
import { logger } from "@/lib/logger";

export async function notifyClubNewBooking(
  club: {
    name: string;
    telegramId: string | null;
  },
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
) {
  if (!club.telegramId) return;

  const guest = booking.player
    ? `${booking.player.lastName} ${booking.player.firstName}`
    : booking.guestName ?? "Гость";
  const phone = booking.player?.phone ?? booking.guestPhone ?? "—";
  const table = formatBookingTableCaption(
    booking.tableFormat,
    booking.floorTableLabel,
    booking.floorItemId,
  );

  const text = [
    `🎱 Новая заявка на бронь — ${club.name}`,
    "",
    `👤 ${guest}`,
    `📞 ${phone}`,
    `🪑 ${table.title}`,
    table.hint ? `   ${table.hint}` : "",
    `🕐 ${formatBookingRange(booking.startsAt, booking.endsAt)}`,
    booking.playerNote ? `💬 ${booking.playerNote}` : "",
    "",
    "Подтвердите в разделе «Брони столов».",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await sendTelegramMessage(club.telegramId, text);
  } catch (error) {
    logger.warn({ error, clubId: club.name }, "Club booking Telegram notify failed");
  }
}
