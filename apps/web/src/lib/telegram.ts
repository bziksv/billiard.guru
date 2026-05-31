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
