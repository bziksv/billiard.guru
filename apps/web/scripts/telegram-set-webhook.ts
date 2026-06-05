/**
 * Регистрирует Telegram webhook (production или свой URL).
 *
 *   cd apps/web && npm run telegram:webhook
 *
 * URL берётся из TELEGRAM_WEBHOOK_URL или APP_URL + /api/telegram/webhook
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl =
  process.env.TELEGRAM_WEBHOOK_URL?.trim() ||
  (process.env.APP_URL
    ? `${process.env.APP_URL.replace(/\/$/, "")}/api/telegram/webhook`
    : "");

if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN не задан в .env");
  process.exit(1);
}
if (!webhookUrl) {
  console.error("❌ Задайте TELEGRAM_WEBHOOK_URL или APP_URL в .env");
  process.exit(1);
}
if (webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1")) {
  console.error("❌ Telegram не шлёт webhook на localhost.");
  console.error("   Локально: npm run dev + Beget DATABASE_URL, webhook → https://billiard.guru/...");
  console.error("   Задайте TELEGRAM_WEBHOOK_URL=https://billiard.guru/api/telegram/webhook");
  process.exit(1);
}

const params = new URLSearchParams({ url: webhookUrl });
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
if (secret) {
  params.set("secret_token", secret);
}

const api = `https://api.telegram.org/bot${token}/setWebhook?${params}`;

async function main() {
  const res = await fetch(api);
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (!data.ok) {
    console.error("❌ setWebhook:", data);
    process.exit(1);
  }
  console.log("✓ Webhook:", webhookUrl);

  const commandsRes = await fetch(
    `https://api.telegram.org/bot${token}/setMyCommands`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "Начало работы" },
          { command: "profile", description: "Мой профиль" },
        ],
      }),
    },
  );
  const commandsData = (await commandsRes.json()) as {
    ok: boolean;
    description?: string;
  };
  if (commandsData.ok) {
    console.log("✓ Bot commands: /start, /profile");
  } else {
    console.warn("⚠ setMyCommands:", commandsData.description ?? commandsData);
  }

  const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const info = (await infoRes.json()) as {
    result?: { pending_update_count?: number; last_error_message?: string };
  };
  const pending = info.result?.pending_update_count ?? 0;
  const err = info.result?.last_error_message;
  if (pending) console.log(`  pending updates: ${pending}`);
  if (err) console.warn(`  last error: ${err}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
