/**
 * Черновик: прогон общего рейтинга по всем встречам + снимки.
 * Запуск: cd apps/web && npx tsx scripts/draft-site-news-rating-recalc.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { createPrismaClient } from "../src/lib/prisma";

const TITLE = "Прогон общего рейтинга по всем встречам";

async function main() {
  const prisma = createPrismaClient();
  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN" },
    select: { id: true },
  });

  const existing = await prisma.siteNews.findFirst({
    where: { title: TITLE, status: "UNPUBLISHED" },
  });
  if (existing) {
    console.log("draft already exists", existing.id);
    await prisma.$disconnect();
    return;
  }

  const row = await prisma.siteNews.create({
    data: {
      title: TITLE,
      body: `
В админке на странице «Фора и расчёт» можно прогнать общий рейтинг по всем уже сыгранным встречам выбранной формулой.

Перед прогоном сохраняется снимок текущих рейтингов — его можно вернуть одной кнопкой и затем запустить другой вариант формулы. Клубные рейтинги при этом не меняются.
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
