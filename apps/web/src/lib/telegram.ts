import { TELEGRAM_BOT_USERNAME } from "@/lib/brand";

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

interface SendMessageOptions {
  replyMarkup?: object;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: SendMessageOptions,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (options?.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }

  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return res.ok;
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
}

export function contactRequestKeyboard() {
  return {
    keyboard: [
      [{ text: "📱 Подтвердить по телефону", request_contact: true }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

export function removeKeyboard() {
  return { remove_keyboard: true };
}
