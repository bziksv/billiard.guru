/**
 * Черновик новости: вход для РФ только по телефону.
 * cd apps/web && npx tsx scripts/draft-site-news-phone-auth-ru.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "Вход для России — только по телефону";

async function main() {
  const existing = await prisma.siteNews.findFirst({
    where: { title: TITLE, status: "UNPUBLISHED" },
  });
  if (existing) {
    console.log("Черновик уже есть:", existing.id);
    return;
  }

  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN", isVerified: true },
    select: { id: true },
  });

  await prisma.siteNews.create({
    data: {
      title: TITLE,
      body: `На странице входа для номеров России действует только подтверждение коротким звонком — без входа через Telegram.

Что это значит для игроков из РФ:
• новый пользователь: профиль → короткий звонок → кабинет;
• уже зарегистрированные: вход тем же звонком с вашего номера;
• Telegram-бот по-прежнему можно подключить позже для уведомлений о турнирах и матчах.

Для других стран вход через Telegram или звонок работает как раньше.`.trim(),
      status: "UNPUBLISHED",
      publishedAt: null,
      authorId: admin?.id ?? null,
    },
  });

  console.log("Черновик создан:", TITLE);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
