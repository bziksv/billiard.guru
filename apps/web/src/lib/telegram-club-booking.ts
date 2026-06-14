import { writeAuditLog } from "@/lib/audit";
import { auditBookingStatusSummary } from "@/lib/audit-display";
import { clubOwnedByPlayer } from "@/lib/club-access";
import { isClubStaffMember } from "@/lib/club-staff";
import { logger } from "@/lib/logger";
import {
  notifyPlayerBookingConfirmed,
  notifyPlayerBookingRejected,
} from "@/lib/player-booking-notify";
import { prisma } from "@/lib/prisma";
import {
  answerCallbackQuery,
  clearInlineKeyboard,
  sendTelegramMessage,
} from "@/lib/telegram";

export async function listClubBookingNotifyTelegramIds(clubId: string): Promise<string[]> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { telegramId: true },
  });
  const staff = await prisma.clubStaff.findMany({
    where: { clubId },
    include: {
      player: { select: { telegramId: true, isVerified: true } },
    },
  });

  const ids = new Set<string>();
  if (club?.telegramId) ids.add(club.telegramId);
  for (const row of staff) {
    if (row.player.isVerified && row.player.telegramId) {
      ids.add(row.player.telegramId);
    }
  }
  return [...ids];
}

export async function telegramCanManageClubBookings(
  clubId: string,
  telegramId: string,
): Promise<{ ok: boolean; playerId?: string }> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { telegramId: true, phone: true },
  });
  if (!club) return { ok: false };

  if (club.telegramId === telegramId) {
    const ownerPlayer = await prisma.player.findFirst({
      where: { telegramId, isVerified: true },
      select: { id: true },
    });
    return { ok: true, playerId: ownerPlayer?.id };
  }

  const player = await prisma.player.findFirst({
    where: { telegramId, isVerified: true },
    select: { id: true, phone: true, role: true, telegramId: true },
  });
  if (!player) return { ok: false };

  if (clubOwnedByPlayer(club, player)) return { ok: true, playerId: player.id };
  if (await isClubStaffMember(clubId, player.id)) return { ok: true, playerId: player.id };
  return { ok: false };
}

export function clubBookingModerationKeyboard(bookingId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Подтвердить", callback_data: `cbk_a_${bookingId}` },
        { text: "❌ Отклонить", callback_data: `cbk_r_${bookingId}` },
      ],
    ],
  };
}

export async function applyClubBookingStatusFromTelegram(
  bookingId: string,
  status: "CONFIRMED" | "REJECTED",
  telegramId: string,
): Promise<{ ok: boolean; message: string }> {
  const booking = await prisma.tableBooking.findUnique({
    where: { id: bookingId },
    include: {
      club: { select: { id: true, name: true } },
    },
  });
  if (!booking) {
    return { ok: false, message: "Бронь не найдена." };
  }

  const access = await telegramCanManageClubBookings(booking.clubId, telegramId);
  if (!access.ok) {
    return { ok: false, message: "Нет прав на управление бронями этого клуба." };
  }

  if (booking.status !== "PENDING") {
    const label =
      booking.status === "CONFIRMED"
        ? "уже подтверждена"
        : booking.status === "REJECTED"
          ? "отклонена"
          : "закрыта";
    return { ok: false, message: `Заявка ${label}.` };
  }

  await prisma.tableBooking.update({
    where: { id: bookingId },
    data: { status },
  });

  await writeAuditLog({
    actorType: "club",
    actorId: access.playerId ?? telegramId,
    action: `table_booking.${status.toLowerCase()}`,
    entityType: "table_booking",
    entityId: bookingId,
    section: "bookings",
    clubId: booking.clubId,
    summary: auditBookingStatusSummary(status, "telegram"),
  });

  if (status === "CONFIRMED") {
    void notifyPlayerBookingConfirmed(bookingId);
  } else {
    void notifyPlayerBookingRejected(bookingId);
  }

  const verb = status === "CONFIRMED" ? "подтверждена" : "отклонена";
  return {
    ok: true,
    message: `✅ Бронь ${verb}.\n«${booking.club.name}»`,
  };
}

export async function handleClubBookingModerationCallback(
  data: string,
  telegramId: string,
  callbackQueryId: string,
  sourceMessage?: { chatId: string; messageId: number },
): Promise<boolean> {
  const approveMatch = data.match(/^cbk_a_([a-z0-9]+)$/i);
  const rejectMatch = data.match(/^cbk_r_([a-z0-9]+)$/i);
  const bookingId = approveMatch?.[1] ?? rejectMatch?.[1];
  if (!bookingId) return false;

  const status = approveMatch ? "CONFIRMED" : "REJECTED";
  const result = await applyClubBookingStatusFromTelegram(bookingId, status, telegramId);

  await answerCallbackQuery(
    callbackQueryId,
    result.ok ? (status === "CONFIRMED" ? "Подтверждено" : "Отклонено") : result.message.slice(0, 200),
    { showAlert: !result.ok },
  );

  if (sourceMessage && result.ok) {
    await clearInlineKeyboard(sourceMessage.chatId, sourceMessage.messageId);
  }
  if (result.ok || !sourceMessage) {
    await sendTelegramMessage(telegramId, result.message);
  }

  return true;
}

export async function buildClubBookingFloorPlanPng(bookingId: string): Promise<Buffer | null> {
  const booking = await prisma.tableBooking.findUnique({
    where: { id: bookingId },
    include: {
      club: {
        select: {
          floorPlan: true,
          tableCounts: true,
          weeklyHours: true,
          workingHours: true,
        },
      },
    },
  });
  if (!booking) return null;

  try {
    const {
      buildCalendarImageOptionsForBooking,
      renderWeekCalendarPng,
    } = await import("@/lib/club-booking-calendar-image");

    const options = await buildCalendarImageOptionsForBooking(
      booking.clubId,
      booking.club,
      bookingId,
      booking.startsAt,
    );
    if (!options || options.tables.length === 0) return null;

    return await renderWeekCalendarPng(options);
  } catch (err) {
    logger.warn({ err, bookingId }, "Club booking calendar PNG failed");
    return null;
  }
}
