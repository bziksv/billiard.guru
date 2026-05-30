import { NextRequest, NextResponse } from "next/server";
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
  await processTelegramUpdate(update);
  return NextResponse.json({ ok: true });
}
