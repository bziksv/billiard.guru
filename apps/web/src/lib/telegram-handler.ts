import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { Club, Player } from "@/generated/prisma/client";
import {
  contactRequestKeyboard,
  parseConfirmToken,
  removeKeyboard,
  sendTelegramMessage,
} from "@/lib/telegram";
import {
  handleLoginCallback,
  handleLoginTelegramMessage,
} from "@/lib/login-challenge";
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
    { replyMarkup: removeKeyboard() },
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
    data: { telegramId, telegramUsername: username, isVerified: true },
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
    `✅ Клуб «<b>${club.name}</b>» подтверждён!\nTelegram привязан к ${club.phone}.`,
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
      try {
        const handled = await handleTournamentApprovalCallback(
          data,
          telegramId,
          update.callback_query.id,
        );
        if (handled) return;
      } catch (err) {
        logger.error({ err }, "Tournament approval callback failed");
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
        "⚠️ Ссылка недействительна или уже использована.\nЗарегистрируйтесь на billiard.guru",
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

  // /start — сразу отвечаем (без БД), потом проверяем статус
  if (text.startsWith("/start") || text === "/start") {
    try {
      const verifiedPlayer = await prisma.player.findFirst({
        where: { telegramId, isVerified: true },
      });
      if (verifiedPlayer) {
        await sendTelegramMessage(
          telegramId,
          `✅ Вы уже подтверждены как <b>${verifiedPlayer.lastName} ${verifiedPlayer.firstName}</b>.`,
        );
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
      await sendTelegramMessage(
        telegramId,
        "✅ Этот номер уже подтверждён. Если это вы — всё в порядке!",
        { replyMarkup: removeKeyboard() },
      );
      return;
    }

    await sendTelegramMessage(
      telegramId,
      "❌ Регистрация с этим номером не найдена.\nСначала зарегистрируйтесь на billiard.guru",
      { replyMarkup: removeKeyboard() },
    );
    return;
  }
}
