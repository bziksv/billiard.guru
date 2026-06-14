import { TELEGRAM_BOT_USERNAME } from "@/lib/brand";
import { buildBookClubLink } from "@/lib/telegram-booking-link";
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

export { buildBookClubLink };

export function parseBookClubStartParam(text: string): string | null {
  const match = text.match(/(?:^|\s)book_([a-z0-9]+)/i);
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

export function clubNewsModerationKeyboard(token: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Одобрить", callback_data: `clubnews_approve_${token}` },
        { text: "❌ Отклонить", callback_data: `clubnews_reject_${token}` },
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

/** Отправка PNG/JPEG в чат (планировка зала и т.п.). */
export async function sendTelegramPhoto(
  chatId: string,
  photo: Buffer,
  caption?: string,
  options?: SendMessageOptions,
  logMeta?: TelegramLogMeta,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const form = new FormData();
  form.append("chat_id", chatId);
  if (caption) {
    form.append("caption", caption);
    form.append("parse_mode", "HTML");
  }
  if (options?.replyMarkup) {
    form.append("reply_markup", JSON.stringify(options.replyMarkup));
  }
  form.append("photo", new Blob([new Uint8Array(photo)], { type: "image/png" }), "floor-plan.png");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      body: form,
    });
    const json = (await res.json()) as { ok?: boolean; description?: string };
    const result = json.ok ? { ok: true as const } : { ok: false as const, error: json.description ?? `HTTP ${res.status}` };
    await logTelegramAttempt(caption ?? "[photo]", chatId, logMeta, result);
    return result.ok;
  } catch (err) {
    const message = err instanceof Error ? err.message : "network_error";
    await logTelegramAttempt(caption ?? "[photo]", chatId, logMeta, { ok: false, error: message });
    return false;
  }
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

/** Редактирует подпись к фото (шаг бронирования с планировкой). */
export async function editTelegramPhotoCaption(
  chatId: string,
  messageId: number,
  caption: string,
  options?: SendMessageOptions,
): Promise<boolean> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    caption,
    parse_mode: "HTML",
  };
  if (options?.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }
  const result = await telegramApi("editMessageCaption", body);
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
  { command: "pokatat", description: "Покатать" },
  { command: "club_pokatat", description: "Покатать (клуб)" },
  { command: "notifications", description: "Уведомления" },
] as const;

/** Команды в меню Telegram (☰). */
export async function setTelegramBotCommands(): Promise<boolean> {
  const result = await telegramApi("setMyCommands", { commands: BOT_COMMANDS });
  return result?.ok ?? false;
}
