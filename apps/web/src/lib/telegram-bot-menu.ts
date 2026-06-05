import { formatRating } from "@/lib/rating";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { playerName } from "@/lib/public-display";
import { prisma } from "@/lib/prisma";
import {
  contactRequestKeyboard,
  sendTelegramMessage,
} from "@/lib/telegram";
import { USER_ROLE_LABELS } from "@/lib/validators";
import type { Player, City, Country } from "@/generated/prisma/client";

export const BOT_MENU_PROFILE = "👤 Мой Профиль";

type PlayerWithCity = Player & {
  city: City & { country: Country };
};

function appUrlBase() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3010";
  return base.replace(/\/$/, "");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Постоянное меню для подтверждённых игроков. */
export function mainMenuKeyboard() {
  return {
    keyboard: [[{ text: BOT_MENU_PROFILE }]],
    resize_keyboard: true,
    is_persistent: true,
  };
}

export function cabinetInlineKeyboard() {
  return {
    inline_keyboard: [[{ text: "Открыть кабинет", url: `${appUrlBase()}/cabinet` }]],
  };
}

export function isProfileMenuRequest(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed === BOT_MENU_PROFILE ||
    trimmed === "/profile" ||
    trimmed.startsWith("/profile@")
  );
}

export function formatPlayerProfileTelegram(player: PlayerWithCity): string {
  const lines = [
    "👤 <b>Мой профиль</b>",
    "",
    `<b>${escapeHtml(playerName(player))}</b>`,
    `Город: ${escapeHtml(player.city.nameRu)}, ${escapeHtml(player.city.country.nameRu)}`,
    `Телефон: ${escapeHtml(player.phone)}`,
    `Рейтинг: <b>${formatRating(player.rating)}</b>`,
    `Роль: ${escapeHtml(USER_ROLE_LABELS[player.role] ?? player.role)}`,
  ];

  if (player.telegramUsername) {
    lines.push(`Telegram: @${escapeHtml(player.telegramUsername)}`);
  }

  const about = player.about?.trim();
  if (about) {
    const short = about.length > 200 ? `${about.slice(0, 197)}…` : about;
    lines.push("", `О себе: ${escapeHtml(short)}`);
  }

  return lines.join("\n");
}

export async function findVerifiedPlayerByTelegram(telegramId: string) {
  return prisma.player.findFirst({
    where: { telegramId, isVerified: true },
    include: { city: { include: { country: true } } },
  });
}

export async function sendVerifiedWelcome(
  telegramId: string,
  player: Pick<Player, "lastName" | "firstName">,
): Promise<void> {
  await sendTelegramMessage(
    telegramId,
    `✅ <b>billiard.guru</b>\n\nВы вошли как <b>${escapeHtml(player.lastName)} ${escapeHtml(player.firstName)}</b>.\n\nВыберите пункт меню или откройте сайт.`,
    { replyMarkup: mainMenuKeyboard() },
  );
}

export async function handleMyProfile(telegramId: string): Promise<void> {
  const player = await findVerifiedPlayerByTelegram(telegramId);
  if (!player) {
    await sendTelegramMessage(
      telegramId,
      "❌ Профиль не найден.\n\nВойдите на billiard.guru/login и подтвердите Telegram — кнопкой ниже или по ссылке из письма.",
      { replyMarkup: contactRequestKeyboard() },
    );
    return;
  }

  await dispatchNotification(
    "bot-profile-summary",
    telegramId,
    formatPlayerProfileTelegram(player),
    { replyMarkup: cabinetInlineKeyboard() },
  );
}
