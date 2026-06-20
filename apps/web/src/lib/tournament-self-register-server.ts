import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { isPairFormat } from "@/lib/public-display";
import { assertCanAddTournamentParticipants } from "@/lib/tournament-participant-limit-server";
import { assertPlayerEligibleForTournamentRating } from "@/lib/tournament-rating-limit-server";
import { notifyTournamentSelfRegistered } from "@/lib/tournament-registration-notify";
import {
  answerCallbackQuery,
  editInlineKeyboard,
  sendTelegramMessage,
  tournamentNearbyViewKeyboard,
  tournamentRegisterCallbackPrefix,
} from "@/lib/telegram";

export type SelfRegisterResult =
  | { ok: true; registrationId: string; created: boolean }
  | { ok: false; error: string };

export async function submitSelfTournamentRegistration(
  playerId: string,
  tournamentId: string,
): Promise<SelfRegisterResult> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    return { ok: false, error: "Игрок не найден" };
  }
  if (!player.isVerified) {
    return {
      ok: false,
      error: "Подтвердите профиль через Telegram, затем подайте заявку",
    };
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) {
    return { ok: false, error: "Турнир не найден" };
  }
  if (tournament.status !== "OPEN") {
    return { ok: false, error: "Регистрация на этот турнир сейчас закрыта" };
  }
  if (isPairFormat(tournament.format)) {
    return {
      ok: false,
      error: "На парный турнир заявку подаёт клуб-организатор",
    };
  }

  const ratingCheck = await assertPlayerEligibleForTournamentRating(
    playerId,
    tournament,
  );
  if (!ratingCheck.ok) {
    return { ok: false, error: ratingCheck.error };
  }

  const existing = await prisma.tournamentRegistration.findUnique({
    where: {
      tournamentId_playerId: { tournamentId, playerId },
    },
  });

  if (existing) {
    if (existing.status === "REJECTED" || existing.status === "CANCELLED") {
      await assertCanAddTournamentParticipants(tournamentId, 1);
      const registration = await prisma.tournamentRegistration.update({
        where: { id: existing.id },
        data: { status: "PENDING", source: "SELF", clubId: null },
      });
      await writeAuditLog({
        actorType: "player",
        actorId: playerId,
        action: "tournament.register.self",
        entityType: "tournament_registration",
        entityId: registration.id,
        payload: { channel: "telegram" },
      });
      await notifyTournamentSelfRegistered(registration.id);
      return { ok: true, registrationId: registration.id, created: false };
    }
    if (existing.status === "PENDING") {
      return { ok: false, error: "Заявка уже подана — ожидайте подтверждения" };
    }
    if (existing.status === "CONFIRMED") {
      return { ok: false, error: "Вы уже участвуете в этом турнире" };
    }
    return { ok: false, error: "Вы уже подали заявку на этот турнир" };
  }

  await assertCanAddTournamentParticipants(tournamentId, 1);

  const registration = await prisma.tournamentRegistration.create({
    data: {
      tournamentId,
      playerId,
      source: "SELF",
      status: "PENDING",
    },
  });

  await writeAuditLog({
    actorType: "player",
    actorId: playerId,
    action: "tournament.register.self",
    entityType: "tournament_registration",
    entityId: registration.id,
    payload: { channel: "telegram" },
  });

  await notifyTournamentSelfRegistered(registration.id);

  return { ok: true, registrationId: registration.id, created: true };
}

function tournamentPageUrl(tournamentId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://billiard.guru";
  return `${base.replace(/\/$/, "")}/tournaments/${tournamentId}`;
}

function cabinetUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://billiard.guru";
  return `${base.replace(/\/$/, "")}/cabinet`;
}

export function parseTournamentSelfRegisterCallback(data: string): string | null {
  const prefix = tournamentRegisterCallbackPrefix();
  if (!data.startsWith(prefix)) return null;
  const id = data.slice(prefix.length);
  return /^c[a-z0-9]{10,}$/i.test(id) ? id : null;
}

export async function handleTournamentSelfRegisterCallback(
  data: string,
  telegramId: string,
  callbackQueryId: string,
  sourceMessage?: { chatId: string; messageId: number },
): Promise<boolean> {
  const tournamentId = parseTournamentSelfRegisterCallback(data);
  if (!tournamentId) return false;

  const player = await prisma.player.findFirst({
    where: { telegramId, isVerified: true },
  });

  if (!player) {
    await answerCallbackQuery(
      callbackQueryId,
      "Сначала подтвердите профиль на billiard.guru через Telegram",
      { showAlert: true },
    );
    return true;
  }

  let result: SelfRegisterResult;
  try {
    result = await submitSelfTournamentRegistration(player.id, tournamentId);
  } catch (err) {
    logger.error({ err, tournamentId, telegramId }, "Telegram self-register failed");
    await answerCallbackQuery(callbackQueryId, "Не удалось подать заявку. Попробуйте позже.", {
      showAlert: true,
    });
    return true;
  }

  if (!result.ok) {
    await answerCallbackQuery(callbackQueryId, result.error, {
      showAlert: result.error.length > 40,
    });
    return true;
  }

  await answerCallbackQuery(
    callbackQueryId,
    result.created
      ? "Заявка подана! Ожидайте подтверждения организатора."
      : "Заявка снова отправлена на рассмотрение.",
  );

  if (sourceMessage) {
    try {
      await editInlineKeyboard(
        sourceMessage.chatId,
        sourceMessage.messageId,
        tournamentNearbyViewKeyboard(tournamentPageUrl(tournamentId)),
      );
    } catch (err) {
      logger.warn({ err, tournamentId }, "editInlineKeyboard after self-register failed");
    }
  }

  await sendTelegramMessage(
    telegramId,
    `✅ <b>Заявка на турнир принята</b>\n\nОрганизатор подтвердит участие — следите за статусом в личном кабинете или на странице турнира.`,
    {
      replyMarkup: {
        inline_keyboard: [
          [{ text: "Открыть турнир", url: tournamentPageUrl(tournamentId) }],
          [{ text: "Личный кабинет", url: cabinetUrl() }],
        ],
      },
    },
    {
      notificationId: "tournament-self-register-confirm",
      context: "tournament-self-register-confirm",
      playerId: player.id,
      entityType: "tournament",
      entityId: tournamentId,
    },
  );

  return true;
}
