import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { processTelegramUpdate } from "@/lib/telegram-handler";

export async function POST(request: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  // Секрет опционален: если задан — проверяем заголовок; если нет — принимаем как раньше.
  if (expected) {
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (secret !== expected) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const update = await request.json();
  try {
    await processTelegramUpdate(update);
  } catch (err) {
    logger.error({ err }, "Telegram webhook processing failed");
  }
  return NextResponse.json({ ok: true });
}
