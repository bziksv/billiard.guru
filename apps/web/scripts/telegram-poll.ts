/**
 * Локальная разработка: polling вместо webhook.
 * Telegram не может слать updates на localhost — этот скрипт их забирает сам.
 *
 * Запуск (в отдельном терминале):
 *   cd apps/web && npm run telegram:poll
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });
import { processTelegramUpdate } from "../src/lib/telegram-handler";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN не задан в .env");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${token}`;

async function api(method: string, params?: Record<string, string>) {
  const url = params
    ? `${API}/${method}?${new URLSearchParams(params)}`
    : `${API}/${method}`;
  const res = await fetch(url, params ? undefined : { method: "POST" });
  return res.json();
}

async function main() {
  await api("deleteWebhook");
  console.log("✓ Webhook снят, polling запущен");
  console.log("  Откройте ссылку t.me/BilliardGuruBot?start=confirm_... и нажмите Start\n");

  let offset = 0;

  while (true) {
    try {
      const data = (await api("getUpdates", {
        offset: String(offset),
        timeout: "30",
      })) as { ok: boolean; result: { update_id: number }[] };

      if (data.ok && data.result.length) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await processTelegramUpdate(update as Parameters<typeof processTelegramUpdate>[0]);
          console.log(`→ update ${update.update_id} обработан`);
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

main();
