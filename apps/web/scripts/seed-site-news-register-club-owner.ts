/**
 * Черновик новости: регистрация владельца клуба без ожидания админа.
 *
 *   cd apps/web && npx tsx scripts/seed-site-news-register-club-owner.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "Регистрация владельца клуба без ожидания проверки";

async function main() {
  const existing = await prisma.siteNews.findFirst({
    where: { title: TITLE },
    select: { id: true, status: true },
  });
  if (existing) {
    console.log(`Уже есть: ${existing.id} (${existing.status})`);
    return;
  }

  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN" },
    select: { id: true },
  });

  const news = await prisma.siteNews.create({
    data: {
      title: TITLE,
      body: `При регистрации на сайте можно сразу указать, что вы владелец клуба — вместе с ролью игрока или отдельно.

Что изменилось:
• на шаге регистрации — галочки «Игрок» и «Владелец клуба»;
• после подтверждения номера коротким звонком можно сразу создать клуб;
• новый клуб сразу доступен в разделе управления — без ожидания подтверждения администратором.

Для проведения турниров по-прежнему понадобится привязать Telegram к клубу — так организаторы получают уведомления и подтверждают заявки.`,
      status: "UNPUBLISHED",
      publishedAt: null,
      authorId: admin?.id ?? null,
    },
  });

  console.log(`Черновик создан: ${news.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
