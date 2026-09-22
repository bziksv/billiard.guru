import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { processTelegramUpdate } from "@/lib/telegram-handler";

function webhookSecretRequired(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.REQUIRE_WEBHOOK_SECRETS === "1"
  );
}

export async function POST(request: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (webhookSecretRequired() && !expected) {
    logger.error("TELEGRAM_WEBHOOK_SECRET is required in production");
    return NextResponse.json({ error: "Webhook misconfigured" }, { status: 503 });
  }

  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update = await request.json();
  try {
    await processTelegramUpdate(update);
  } catch (err) {
    logger.error({ err }, "Telegram webhook processing failed");
  }
  return NextResponse.json({ ok: true });
}
