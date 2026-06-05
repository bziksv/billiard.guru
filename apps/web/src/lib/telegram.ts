import { TELEGRAM_BOT_USERNAME } from "@/lib/brand";
import {
  pruneTelegramDeliveryLogs,
  writeTelegramDeliveryLog,
  type TelegramDeliveryLogInput,
} from "@/lib/notifications/delivery-log";

export function buildConfirmLink(token: string): string {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=confirm_${token}`;
}

export function parseConfirmToken(text: string): string | null {
  const match = text.match(/confirm_([a-f0-9-]+)/i);
  return match?.[1] ?? null;
}

export function parseLoginToken(text: string): string | null {
  const match = text.match(/login_([a-f0-9-]+)/i);
  return match?.[1] ?? null;
}

export function loginConfirmKeyboard(token: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Подтвердить вход", callback_data: `login_confirm_${token}` },
        { text: "❌ Отмена", callback_data: `login_cancel_${token}` },
      ],
    ],
  };
}

export function tournamentApprovalKeyboard(token: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Опубликовать", callback_data: `tournament_approve_${token}` },
        { text: "❌ Отклонить", callback_data: `tournament_reject_${token}` },
      ],
    ],
  };
}

export function ideaModerationKeyboard(token: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Одобрить", callback_data: `idea_approve_${token}` },
        { text: "❌ Отклонить", callback_data: `idea_reject_${token}` },
      ],
    ],
  };
}

export function ideaVoteKeyboard(ideaId: string) {
  return {
    inline_keyboard: [
      [
        { text: "👍 Нравится", callback_data: `idea_like_${ideaId}` },
        { text: "👎 Не нравится", callback_data: `idea_dislike_${ideaId}` },
      ],
      [{ text: "Открыть на сайте", url: `${appUrlBase()}/ideas` }],
    ],
  };
}

function appUrlBase() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3010";
  return base.replace(/\/$/, "");
}

interface SendMessageOptions {
  replyMarkup?: object;
}

export type TelegramLogMeta = Omit<TelegramDeliveryLogInput, "status" | "messagePreview" | "chatId"> & {
  chatId?: string;
};

type TelegramApiResult = { ok: true } | { ok: false; error: string };

async function telegramApi(
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramApiResult | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok?: boolean; description?: string };
    if (json.ok) return { ok: true };
    return { ok: false, error: json.description ?? `HTTP ${res.status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "network_error";
    return { ok: false, error: message };
  }
}

async function logTelegramAttempt(
  text: string,
  chatId: string,
  meta: TelegramLogMeta | undefined,
  result: TelegramApiResult | null,
): Promise<void> {
  if (!meta) return;

  const base = {
    ...meta,
    chatId,
    messagePreview: text,
  };

  if (!result) {
    await writeTelegramDeliveryLog({
      ...base,
      status: "failed",
      skipReason: "no_bot_token",
      errorMessage: "TELEGRAM_BOT_TOKEN не задан",
    });
    void pruneTelegramDeliveryLogs();
    return;
  }

  if (result.ok) {
    await writeTelegramDeliveryLog({ ...base, status: "sent" });
  } else {
    await writeTelegramDeliveryLog({
      ...base,
      status: "failed",
      skipReason: result.error.includes("fetch") ? "network_error" : undefined,
      errorMessage: result.error,
    });
  }
  void pruneTelegramDeliveryLogs();
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: SendMessageOptions,
  logMeta?: TelegramLogMeta,
): Promise<boolean> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (options?.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }

  const result = await telegramApi("sendMessage", body);
  await logTelegramAttempt(text, chatId, logMeta, result);
  return result?.ok ?? false;
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  options?: { showAlert?: boolean },
): Promise<void> {
  await telegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: options?.showAlert ?? false,
  });
}

/** Убирает inline-кнопки после нажатия (чтобы не нажимали повторно). */
export async function clearInlineKeyboard(chatId: string, messageId: number): Promise<void> {
  await telegramApi("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  });
}

export function contactRequestKeyboard() {
  return {
    keyboard: [[{ text: "📱 Подтвердить по телефону", request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

/** Редактирует текст сообщения (например, после переключения уведомления). */
export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string,
  options?: SendMessageOptions,
): Promise<boolean> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
  };
  if (options?.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }
  const result = await telegramApi("editMessageText", body);
  return result?.ok ?? false;
}

export function removeKeyboard() {
  return { remove_keyboard: true };
}

const BOT_COMMANDS = [
  { command: "start", description: "Начало работы" },
  { command: "profile", description: "Мой профиль" },
  { command: "tournaments", description: "Мои турниры" },
  { command: "bookings", description: "Мои брони" },
  { command: "book", description: "Забронировать стол" },
  { command: "notifications", description: "Уведомления" },
] as const;

/** Команды в меню Telegram (☰). */
export async function setTelegramBotCommands(): Promise<boolean> {
  const result = await telegramApi("setMyCommands", { commands: BOT_COMMANDS });
  return result?.ok ?? false;
}
