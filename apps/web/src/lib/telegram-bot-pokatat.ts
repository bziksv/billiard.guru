import { prisma } from "@/lib/prisma";
import {
  formatPlayListingSchedule,
  PLAY_LISTING_KIND_LABELS,
  PLAY_LISTING_STATUS_LABELS,
} from "@/lib/play-listing-display";
import { sendTelegramMessage } from "@/lib/telegram";
import { getNotificationLinkBase } from "@/lib/canonical-site-url";

function appUrlBase() {
  return getNotificationLinkBase();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const BOT_MENU_POKATAT = "🤝 Покатать";

export async function handlePlayerPokatatMenu(telegramId: string): Promise<void> {
  const player = await prisma.player.findFirst({
    where: { telegramId, isVerified: true },
    include: { city: true },
  });
  if (!player) {
    await sendTelegramMessage(telegramId, "❌ Сначала привяжите профиль через /start");
    return;
  }

  const mine = await prisma.playListing.findMany({
    where: { authorId: player.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const lines = ["🤝 <b>Покатать</b>", "", "Найдите партнёра или соперника для игры.", ""];

  if (mine.length === 0) {
    lines.push("У вас пока нет объявлений.");
  } else {
    lines.push("<b>Мои объявления:</b>", "");
    for (const l of mine) {
      lines.push(
        `• <b>${escapeHtml(l.title)}</b>`,
        `  ${escapeHtml(PLAY_LISTING_KIND_LABELS[l.kind] ?? l.kind)} · ${escapeHtml(PLAY_LISTING_STATUS_LABELS[l.status] ?? l.status)}`,
        `  ${escapeHtml(formatPlayListingSchedule(l))}`,
        "",
      );
    }
  }

  await sendTelegramMessage(telegramId, lines.join("\n").trimEnd(), {
    replyMarkup: {
      inline_keyboard: [
        [{ text: "➕ Опубликовать", url: `${appUrlBase()}/pokatat?tab=create` }],
        [
          {
            text: "🔍 Смотреть в городе",
            url: `${appUrlBase()}/pokatat?cityId=${player.cityId}`,
          },
        ],
        [{ text: "Мои объявления", url: `${appUrlBase()}/pokatat?tab=mine` }],
      ],
    },
  });
}
