import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { Club, Player } from "@/generated/prisma/client";
import {
  contactRequestKeyboard,
  parseConfirmToken,
  removeKeyboard,
  sendTelegramMessage,
  answerCallbackQuery,
} from "@/lib/telegram";
import {
  handleBotMenuAction,
  handleNotificationToggleCallback,
  mainMenuKeyboard,
  parseBotMenuAction,
  sendVerifiedWelcome,
} from "@/lib/telegram-bot-menu";
import {
  handleLoginCallback,
  handleLoginTelegramMessage,
} from "@/lib/login-challenge";
import {
  handleIdeaModerationCallback,
  handleIdeaVoteCallback,
} from "@/lib/idea-moderation";
import {
  handleTournamentApprovalCallback,
  handleTournamentApprovalMessage,
} from "@/lib/tournament-approval";

export interface TelegramUpdate {
  message?: {
    text?: string;
    chat: { id: number };
    from?: { id: number; username?: string };
    contact?: { phone_number: string; user_id: number };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number; username?: string };
    message?: { message_id: number; chat: { id: number } };
  };
}

function phoneDigits(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  const set = new Set<string>([digits]);
  if (digits.startsWith("8") && digits.length === 11) {
    set.add(`7${digits.slice(1)}`);
  }
  if (digits.startsWith("7") && digits.length === 11) {
    set.add(digits.slice(1));
  }
  if (digits.length >= 10) {
    set.add(digits.slice(-10));
  }
  return [...set];
}

async function findUnverifiedPlayerByPhone(contactPhone: string) {
  const variants = phoneDigits(contactPhone);
  return prisma.player.findFirst({
    where: {
      isVerified: false,
      OR: variants.flatMap((v) => [
        { phone: { contains: v } },
        { phone: { endsWith: v } },
      ]),
    },
    orderBy: { createdAt: "desc" },
  });
}

async function findUnverifiedClubByPhone(contactPhone: string) {
  const variants = phoneDigits(contactPhone);
  return prisma.club.findFirst({
    where: {
      isVerified: false,
      OR: variants.flatMap((v) => [
        { phone: { contains: v } },
        { phone: { endsWith: v } },
      ]),
    },
    orderBy: { createdAt: "desc" },
  });
}

async function confirmPlayer(
  player: Player,
  telegramId: string,
  username: string | null,
) {
  if (player.telegramId && player.telegramId !== telegramId) {
    await sendTelegramMessage(
      telegramId,
      "⚠️ Этот профиль уже привязан к другому Telegram.",
    );
    return;
  }

  await prisma.player.update({
    where: { id: player.id },
    data: { telegramId, telegramUsername: username, isVerified: true },
  });

  await prisma.tournamentRegistration.updateMany({
    where: { playerId: player.id, status: "PENDING" },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });

  await writeAuditLog({
    actorType: "player",
    actorId: player.id,
    action: "player.telegram.confirm",
    entityType: "player",
    entityId: player.id,
  });

  await sendTelegramMessage(
    telegramId,
    `✅ Регистрация подтверждена!\n<b>${player.lastName} ${player.firstName}</b>\n\nВы будете получать уведомления о турнирах на billiard.guru.`,
    { replyMarkup: mainMenuKeyboard() },
  );
  logger.info({ playerId: player.id, telegramId }, "Player confirmed");
}

async function confirmClub(
  club: Club,
  telegramId: string,
  username: string | null,
) {
  if (club.telegramId && club.telegramId !== telegramId) {
    await sendTelegramMessage(
      telegramId,
      "⚠️ Этот клуб уже привязан к другому Telegram.",
    );
    return;
  }

  await prisma.club.update({
    where: { id: club.id },
    data: {
      telegramId,
      telegramUsername: username,
      isVerified: true,
      confirmToken: null,
    },
  });

  await writeAuditLog({
    actorType: "club",
    actorId: club.id,
    action: "club.telegram.confirm",
    entityType: "club",
    entityId: club.id,
  });

  await sendTelegramMessage(
    telegramId,
    `✅ Клуб «<b>${club.name}</b>» подтверждён!\nУправление: billiard.guru/manage`,
    { replyMarkup: removeKeyboard() },
  );
  logger.info({ clubId: club.id, telegramId }, "Club confirmed");
}

async function promptContactConfirmation(telegramId: string) {
  await sendTelegramMessage(
    telegramId,
    "👋 <b>billiard.guru</b> — турниры по бильярду\n\nВы уже регистрировались? Нажмите кнопку ниже — подтвердим сразу по номеру телефона.",
    { replyMarkup: contactRequestKeyboard() },
  );
}

/** Обработка входящего сообщения от Telegram (webhook или polling). */
export async function processTelegramUpdate(
  update: TelegramUpdate,
): Promise<void> {
  if (update.callback_query?.from) {
    const telegramId = String(update.callback_query.from.id);
    const data = update.callback_query.data ?? "";
    if (data.startsWith("tournament_")) {
      const sourceMessage = update.callback_query.message
        ? {
            chatId: String(update.callback_query.message.chat.id),
            messageId: update.callback_query.message.message_id,
          }
        : undefined;
      try {
        const handled = await handleTournamentApprovalCallback(
          data,
          telegramId,
          update.callback_query.id,
          sourceMessage,
        );
        if (handled) return;
      } catch (err) {
        logger.error({ err }, "Tournament approval callback failed");
        await answerCallbackQuery(update.callback_query.id, "Ошибка сервера");
      }
      return;
    }
    if (data.startsWith("idea_approve_") || data.startsWith("idea_reject_")) {
      try {
        const handled = await handleIdeaModerationCallback(
          data,
          telegramId,
          update.callback_query.id,
        );
        if (handled) return;
      } catch (err) {
        logger.error({ err }, "Idea moderation callback failed");
      }
      return;
    }
    if (data.startsWith("idea_like_") || data.startsWith("idea_dislike_")) {
      try {
        const handled = await handleIdeaVoteCallback(
          data,
          telegramId,
          update.callback_query.id,
        );
        if (handled) return;
      } catch (err) {
        logger.error({ err }, "Idea vote callback failed");
      }
      return;
    }
    if (data.startsWith("bk")) {
      try {
        const sourceMessage = update.callback_query.message
          ? {
              chatId: String(update.callback_query.message.chat.id),
              messageId: update.callback_query.message.message_id,
            }
          : undefined;
        const { handleBookingCallback } = await import("@/lib/telegram-bot-booking");
        const handled = await handleBookingCallback(
          data,
          telegramId,
          update.callback_query.id,
          sourceMessage,
        );
        if (handled) return;
      } catch (err) {
        logger.error({ err }, "Booking callback failed");
        await answerCallbackQuery(update.callback_query.id, "Ошибка сервера");
      }
      return;
    }
    if (data.startsWith("bot_notify_toggle_")) {
      try {
        const sourceMessage = update.callback_query.message
          ? {
              chatId: String(update.callback_query.message.chat.id),
              messageId: update.callback_query.message.message_id,
            }
          : undefined;
        const handled = await handleNotificationToggleCallback(
          data,
          telegramId,
          update.callback_query.id,
          sourceMessage,
        );
        if (handled) return;
      } catch (err) {
        logger.error({ err }, "Notification toggle callback failed");
        await answerCallbackQuery(update.callback_query.id, "Ошибка сервера");
      }
      return;
    }
    if (data.startsWith("login_")) {
      try {
        await handleLoginCallback(data, telegramId, update.callback_query.id);
      } catch (err) {
        logger.error({ err }, "Login callback failed");
      }
      return;
    }
  }

  const message = update.message;
  if (!message?.from) return;

  const telegramId = String(message.from.id);
  const username = message.from.username ?? null;
  const text = message.text ?? "";

  if (text.includes("login_")) {
    try {
      if (await handleLoginTelegramMessage(text, telegramId)) return;
    } catch (err) {
      logger.error({ err }, "Login message failed");
      await sendTelegramMessage(
        telegramId,
        "⚠️ Не удалось подтвердить вход. Попробуйте снова.",
      );
      return;
    }
  }

  if (text.includes("tournament_approve_")) {
    try {
      if (await handleTournamentApprovalMessage(text, telegramId)) return;
    } catch (err) {
      logger.error({ err }, "Tournament approval message failed");
    }
  }

  // Ссылка confirm_<token> — нужна БД
  const token = parseConfirmToken(text);
  if (token) {
    try {
      const player = await prisma.player.findFirst({ where: { confirmToken: token } });
      if (player) {
        await confirmPlayer(player, telegramId, username);
        return;
      }

      const club = await prisma.club.findFirst({ where: { confirmToken: token } });
      if (club) {
        await confirmClub(club, telegramId, username);
        return;
      }

      await sendTelegramMessage(
        telegramId,
        "⚠️ Ссылка недействительна или уже использована.\nПовторите на billiard.guru/login",
      );
    } catch (err) {
      logger.error({ err }, "DB error on confirm token");
      await sendTelegramMessage(
        telegramId,
        "⚠️ Сервер временно недоступен. Попробуйте через минуту или нажмите /start",
      );
    }
    return;
  }

  const menuAction = parseBotMenuAction(text);
  if (menuAction) {
    try {
      await handleBotMenuAction(telegramId, menuAction);
    } catch (err) {
      logger.error({ err, menuAction }, "Bot menu action failed");
      await sendTelegramMessage(
        telegramId,
        "⚠️ Не удалось загрузить данные. Попробуйте позже.",
      );
    }
    return;
  }

  // /start — сразу отвечаем (без БД), потом проверяем статус
  if (text.startsWith("/start") || text === "/start") {
    try {
      const verifiedPlayer = await prisma.player.findFirst({
        where: { telegramId, isVerified: true },
      });
      if (verifiedPlayer) {
        await sendVerifiedWelcome(telegramId, verifiedPlayer);
        return;
      }
    } catch (err) {
      logger.error({ err }, "DB check skipped on /start");
    }
    await promptContactConfirmation(telegramId);
    return;
  }

  // Контакт — автоподтверждение по телефону из базы
  if (message.contact?.phone_number) {
    if (String(message.contact.user_id) !== telegramId) {
      await sendTelegramMessage(
        telegramId,
        "⚠️ Поделитесь <b>своим</b> номером телефона.",
        { replyMarkup: contactRequestKeyboard() },
      );
      return;
    }

    const player = await findUnverifiedPlayerByPhone(message.contact.phone_number);
    if (player) {
      await confirmPlayer(player, telegramId, username);
      return;
    }

    const club = await findUnverifiedClubByPhone(message.contact.phone_number);
    if (club) {
      await confirmClub(club, telegramId, username);
      return;
    }

    const anyPlayer = await prisma.player.findFirst({
      where: {
        OR: phoneDigits(message.contact.phone_number).flatMap((v) => [
          { phone: { contains: v } },
        ]),
      },
    });
    if (anyPlayer?.isVerified) {
      if (anyPlayer.telegramId === telegramId) {
        await sendVerifiedWelcome(telegramId, anyPlayer);
      } else {
        await sendTelegramMessage(
          telegramId,
          "✅ Этот номер уже подтверждён. Если это вы — всё в порядке!",
          { replyMarkup: removeKeyboard() },
        );
      }
      return;
    }

    await sendTelegramMessage(
      telegramId,
      "❌ Регистрация с этим номером не найдена.\nВойдите и зарегистрируйтесь на billiard.guru/login",
      { replyMarkup: removeKeyboard() },
    );
    return;
  }
}
