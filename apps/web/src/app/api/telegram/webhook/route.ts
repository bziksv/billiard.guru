import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { processTelegramUpdate } from "@/lib/telegram-handler";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (
    process.env.TELEGRAM_WEBHOOK_SECRET &&
    secret !== process.env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update = await request.json();
  // Telegram ждёт быстрый ответ; тяжёлую работу — после 200 OK
  void processTelegramUpdate(update).catch((err) => {
    logger.error({ err }, "Telegram webhook processing failed");
  });
  return NextResponse.json({ ok: true });
}
