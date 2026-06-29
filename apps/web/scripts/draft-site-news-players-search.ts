/**
 * Черновик новости: поиск и пагинация в списке игроков.
 * Создаёт UNPUBLISHED-запись (на сайте не видна).
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-players-search.ts
 *   cd apps/web && npx tsx scripts/draft-site-news-players-search.ts --force
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "Поиск игроков и постраничный список";
const BODY = `Обновили страницу «Игроки»: теперь по базе удобно искать и листать.

Что нового:
• умный поиск по имени и фамилии — можно ввести даже часть слов, например «вил ста» найдёт «Виленский Станислав»;
• поиск идёт по всем игрокам, а не только по тем, кто на экране;
• список разбит на страницы — по 100, 200, 500 или 1000 игроков (по умолчанию 100).

Фильтр по стране и городу работает вместе с поиском.`;

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

  const date = new Date("2026-06-28T16:00:00+03:00");
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
