/**
 * Черновик новости: в боте «Мои турниры» теперь видно занятое место + пагинация.
 * Создаёт UNPUBLISHED-запись (на сайте не видна).
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-bot-tournaments.ts
 *   cd apps/web && npx tsx scripts/draft-site-news-bot-tournaments.ts --force
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "«Мои турниры» в боте: видно занятое место";
const BODY = `Обновили раздел «Мои турниры» в Telegram-боте.

Что нового:
• в завершённых турнирах сразу видно, какое место вы заняли (🥇 за призовые);
• показываем последние 10 турниров, а остальные открываются кнопкой «Показать ещё».

Так удобнее держать всю свою турнирную историю под рукой прямо в боте.`;

async function main() {
  const force = process.argv.includes("--force");
  const existing = await prisma.siteNews.findFirst({
    where: { title: TITLE },
    select: { id: true },
  });
  if (existing && !force) {
    console.log("Черновик уже есть. --force для пересоздания.");
    return;
  }
  if (existing && force) {
    await prisma.siteNews.delete({ where: { id: existing.id } });
    console.log("Удалён старый черновик.");
  }

  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN", isVerified: true },
    select: { id: true },
  });

  const date = new Date("2026-06-28T15:00:00+03:00");
  await prisma.siteNews.create({
    data: {
      title: TITLE,
      body: BODY.trim(),
      status: "UNPUBLISHED",
      publishedAt: null,
      createdAt: date,
      authorId: admin?.id ?? null,
    },
  });
  console.log(`✓ Черновик создан: ${TITLE}`);
  console.log("Опубликуйте в /admin/site-news → «Снова на сайте».");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
