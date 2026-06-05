import {
  formatPlayListingSchedule,
  PLAY_LISTING_KIND_LABELS,
} from "@/lib/play-listing-display";
import { formatRating } from "@/lib/rating";
import { sendTelegramMessage } from "@/lib/telegram";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function notifyClubPlayListingResponse(
  listingId: string,
  responseId: string,
) {
  const response = await prisma.playListingResponse.findUnique({
    where: { id: responseId },
    include: {
      player: {
        select: {
          firstName: true,
          lastName: true,
          rating: true,
          phone: true,
          telegramUsername: true,
        },
      },
      listing: {
        include: {
          club: { select: { id: true, name: true, telegramId: true } },
        },
      },
    },
  });

  if (!response || response.listingId !== listingId) return;
  const { listing, player } = response;
  if (!listing.publishedByClub || !listing.club?.telegramId) return;
  if (response.status !== "PENDING") return;

  const schedule = formatPlayListingSchedule(listing);
  const text = [
    `🤝 Новый отклик — «${listing.title}»`,
    `🏢 ${listing.club.name}`,
    "",
    `👤 ${player.lastName} ${player.firstName} · ${formatRating(player.rating)}`,
    `📞 ${player.phone}`,
    player.telegramUsername ? `@${player.telegramUsername}` : "",
    listing.kind ? `🎯 ${PLAY_LISTING_KIND_LABELS[listing.kind] ?? listing.kind}` : "",
    schedule ? `🕐 ${schedule}` : "",
    response.message ? `💬 ${response.message}` : "",
    "",
    "Примите или отклоните отклик кнопками ниже.",
  ]
    .filter(Boolean)
    .join("\n");

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Принять", callback_data: `plm3_${listingId}_${responseId}_a` },
        { text: "❌ Отклонить", callback_data: `plm3_${listingId}_${responseId}_d` },
      ],
      [{ text: "📋 Все отклики", callback_data: `plm1_${listing.club.id}` }],
    ],
  };

  try {
    await sendTelegramMessage(listing.club.telegramId, text, { replyMarkup: keyboard });
  } catch (error) {
    logger.warn({ error, listingId, responseId }, "Club play listing response notify failed");
  }
}
