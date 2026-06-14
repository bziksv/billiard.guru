import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  answerCallbackQuery,
  loginConfirmKeyboard,
  parseLoginToken,
  sendTelegramMessage,
} from "@/lib/telegram";
import { createSessionToken, sessionCookieOptions } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

async function cancelPendingChallenges(playerId: string) {
  await prisma.loginChallenge.updateMany({
    where: { playerId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
}

export async function createLoginChallenge(playerId: string, telegramId: string) {
  const existing = await prisma.loginChallenge.findFirst({
    where: {
      playerId,
      status: "PENDING",
      method: "TELEGRAM",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  // Не слать повторное сообщение в Telegram при обновлении страницы /login
  if (existing && Date.now() - existing.createdAt.getTime() < 2 * 60 * 1000) {
    return { token: existing.token, expiresAt: existing.expiresAt };
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await cancelPendingChallenges(playerId);

  await prisma.loginChallenge.create({
    data: { token, playerId, expiresAt, method: "TELEGRAM" },
  });

  await sendTelegramMessage(
    telegramId,
    "🔐 <b>billiard.guru</b>\n\nВы входите в личный кабинет.\nЕсли это не вы — нажмите «Отмена».",
    { replyMarkup: loginConfirmKeyboard(token) },
  );

  return { token, expiresAt };
}

export async function createCallLoginChallenge(playerId: string) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await cancelPendingChallenges(playerId);

  await prisma.loginChallenge.create({
    data: { token, playerId, expiresAt, method: "CALL" },
  });

  return { token, expiresAt };
}

export async function confirmCallLoginChallenge(
  callerPhoneRaw: string,
): Promise<{ ok: boolean; message: string }> {
  const pending = await prisma.loginChallenge.findMany({
    where: {
      status: "PENDING",
      method: { in: ["CALL", "TELEGRAM"] },
      expiresAt: { gt: new Date() },
    },
    include: { player: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const { phonesMatchE164 } = await import("@/lib/phone-match");

  for (const challenge of pending) {
    if (!phonesMatchE164(callerPhoneRaw, challenge.player.phone)) continue;

    await prisma.loginChallenge.update({
      where: { id: challenge.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });

    await writeAuditLog({
      actorType: "player",
      actorId: challenge.playerId,
      action: "auth.login.confirm_call",
      entityType: "login_challenge",
      entityId: challenge.id,
      summary:
        challenge.method === "CALL"
          ? "Вход подтверждён звонком"
          : "Вход подтверждён входящим звонком (сессия Telegram)",
    });

    return { ok: true, message: "Call login confirmed" };
  }

  return { ok: false, message: "No matching pending call login" };
}

async function getPendingChallenge(token: string) {
  const challenge = await prisma.loginChallenge.findUnique({
    where: { token },
    include: { player: true },
  });
  if (!challenge) return null;
  if (challenge.status !== "PENDING") return challenge;
  if (challenge.expiresAt < new Date()) {
    await prisma.loginChallenge.update({
      where: { id: challenge.id },
      data: { status: "EXPIRED" },
    });
    return { ...challenge, status: "EXPIRED" as const };
  }
  return challenge;
}

export async function confirmLoginChallenge(
  token: string,
  telegramId: string,
): Promise<{ ok: boolean; message: string }> {
  const challenge = await getPendingChallenge(token);
  if (!challenge || challenge.status === "EXPIRED") {
    return { ok: false, message: "Ссылка входа недействительна или истекла." };
  }
  if (challenge.status !== "PENDING") {
    return { ok: false, message: "Запрос входа уже обработан." };
  }
  if (challenge.player.telegramId !== telegramId) {
    return { ok: false, message: "Подтверждение возможно только с вашего Telegram." };
  }

  await prisma.loginChallenge.update({
    where: { id: challenge.id },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });

  await writeAuditLog({
    actorType: "player",
    actorId: challenge.playerId,
    action: "auth.login.confirm",
    entityType: "login_challenge",
    entityId: challenge.id,
  });

  return { ok: true, message: "✅ Вход подтверждён. Вернитесь в браузер." };
}

export async function cancelLoginChallenge(
  token: string,
  telegramId: string,
): Promise<{ ok: boolean; message: string }> {
  const challenge = await getPendingChallenge(token);
  if (!challenge || challenge.status !== "PENDING") {
    return { ok: false, message: "Запрос уже обработан." };
  }
  if (challenge.player.telegramId !== telegramId) {
    return { ok: false, message: "Отмена возможна только с вашего Telegram." };
  }

  await prisma.loginChallenge.update({
    where: { id: challenge.id },
    data: { status: "CANCELLED" },
  });

  return { ok: true, message: "❌ Вход отменён." };
}

export async function completeLoginChallenge(token: string) {
  const challenge = await prisma.loginChallenge.findUnique({
    where: { token },
    include: { player: true },
  });

  if (!challenge) {
    throw new Error("Запрос входа не найден");
  }
  if (challenge.status === "CANCELLED") {
    throw new Error("Вход отменён");
  }
  if (challenge.status === "EXPIRED" || challenge.expiresAt < new Date()) {
    throw new Error("Время входа истекло");
  }
  if (challenge.status !== "CONFIRMED") {
    const hint =
      challenge.method === "CALL"
        ? "Позвоните на указанный номер с телефона, который вводили"
        : "Подтвердите вход в Telegram";
    throw new Error(hint);
  }

  const sessionToken = createSessionToken(challenge.playerId, challenge.player.role);

  await writeAuditLog({
    actorType: "player",
    actorId: challenge.playerId,
    action: "auth.login.complete",
    entityType: "login_challenge",
    entityId: challenge.id,
  });

  return {
    sessionToken,
    player: challenge.player,
    cookie: sessionCookieOptions(sessionToken),
  };
}

export async function getLoginChallengeStatus(token: string) {
  const challenge = await prisma.loginChallenge.findUnique({
    where: { token },
  });
  if (!challenge) return null;
  if (challenge.status === "PENDING" && challenge.expiresAt < new Date()) {
    await prisma.loginChallenge.update({
      where: { id: challenge.id },
      data: { status: "EXPIRED" },
    });
    return { status: "EXPIRED" as const, method: challenge.method };
  }
  return { status: challenge.status, method: challenge.method };
}

export async function handleLoginTelegramMessage(
  text: string,
  telegramId: string,
): Promise<boolean> {
  const token = parseLoginToken(text);
  if (!token) return false;
  const result = await confirmLoginChallenge(token, telegramId);
  await sendTelegramMessage(telegramId, result.message);
  return true;
}

export async function handleLoginCallback(
  data: string,
  telegramId: string,
  callbackQueryId: string,
): Promise<void> {
  const confirmMatch = data.match(/^login_confirm_([a-f0-9-]+)$/i);
  const cancelMatch = data.match(/^login_cancel_([a-f0-9-]+)$/i);
  const token = confirmMatch?.[1] ?? cancelMatch?.[1];
  if (!token) return;

  const result = confirmMatch
    ? await confirmLoginChallenge(token, telegramId)
    : await cancelLoginChallenge(token, telegramId);

  await answerCallbackQuery(callbackQueryId, result.ok ? "Готово" : "Ошибка");
  await sendTelegramMessage(telegramId, result.message);
}
