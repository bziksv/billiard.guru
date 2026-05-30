/**
 * Обычно НЕ НУЖЕН.
 *
 * Локальная разработка: та же Beget DATABASE_URL + webhook на billiard.guru.
 * Кнопки в Telegram обрабатывает прод — браузер на localhost просто ждёт CONFIRMED в БД.
 *
 * Этот скрипт СНИМАЕТ webhook и ломает вход на billiard.guru, пока он запущен.
 * Только для полностью офлайн-режима (своя локальная БД):
 *   npm run telegram:poll -- --force
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

const force = process.argv.includes("--force");
const API = `https://api.telegram.org/bot${token}`;

async function api(method: string, params?: Record<string, string>) {
  const url = params
    ? `${API}/${method}?${new URLSearchParams(params)}`
    : `${API}/${method}`;
  const res = await fetch(url, params ? undefined : { method: "POST" });
  return res.json() as Promise<{ ok: boolean; result?: { url?: string } }>;
}

let restoreWebhookUrl = "";

async function restoreWebhook() {
  if (!restoreWebhookUrl) return;
  await api("setWebhook", { url: restoreWebhookUrl });
  console.log(`\n✓ Webhook восстановлен: ${restoreWebhookUrl}`);
}

async function main() {
  const info = await api("getWebhookInfo");
  restoreWebhookUrl = info.result?.url ?? "";

  if (restoreWebhookUrl && !force) {
    console.error("Webhook уже установлен:", restoreWebhookUrl);
    console.error("");
    console.error("Polling не нужен для обычной локальной разработки.");
    console.error("Запустите только: npm run dev");
    console.error("Кнопки Telegram обрабатывает webhook на billiard.guru (общая Beget БД).");
    console.error("");
    console.error("Если всё же нужен polling (офлайн БД): npm run telegram:poll -- --force");
    process.exit(1);
  }

  if (!force) {
    console.error("Добавьте --force, если осознанно снимаете webhook с прода.");
    process.exit(1);
  }

  await api("deleteWebhook");
  console.log("⚠ Webhook снят, polling запущен (Ctrl+C — восстановить webhook)\n");

  let offset = 0;
  let stopping = false;

  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await restoreWebhook();
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (!stopping) {
    try {
      const data = (await api("getUpdates", {
        offset: String(offset),
        timeout: "30",
      })) as { ok: boolean; result: { update_id: number }[] };

      if (data.ok && data.result.length) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await processTelegramUpdate(
            update as Parameters<typeof processTelegramUpdate>[0],
          );
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
