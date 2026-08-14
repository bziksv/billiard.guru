/**
 * Черновик новости: авторейтинг по формуле после матча.
 * Запуск: cd apps/web && npx tsx scripts/draft-site-news-auto-rating.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { createPrismaClient } from "../src/lib/prisma";

async function main() {
  const prisma = createPrismaClient();
  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN" },
    select: { id: true },
  });

  const existing = await prisma.siteNews.findFirst({
    where: {
      title: "Авторейтинг: формула после каждой встречи",
      status: "UNPUBLISHED",
    },
  });
  if (existing) {
    console.log("draft already exists", existing.id);
    await prisma.$disconnect();
    return;
  }

  const row = await prisma.siteNews.create({
    data: {
      title: "Авторейтинг: формула после каждой встречи",
      body: `
В админке на странице «Фора и расчёт» можно выбрать формулу общего рейтинга, мин. турниров для превью и включить автопересчёт.

Когда авторейтинг включён, после фиксации результата встречи в турнире общий рейтинг игроков обновляется сразу — и показывается организатору. При отмене результата изменение откатывается.

Превью по-прежнему можно прогнать по всем формулам без записи в базу — сравните и сохраните ту, что подходит клубу.
`.trim(),
      status: "UNPUBLISHED",
      publishedAt: null,
      authorId: admin?.id ?? null,
    },
  });

  console.log("created draft", row.id);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
