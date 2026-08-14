/**
 * Черновик: дата и число участников в турнирах профиля игрока.
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-player-tournaments-meta.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "В профиле игрока — дата и состав турнира";
const BODY = `В списке турниров на странице игрока теперь отдельно видно, когда проходило событие и сколько человек участвовало.

Дату больше не нужно искать в названии: она берётся из карточки турнира. Рядом с местом показывается и общий размер сетки — например «1 место из 16».`;

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

  await prisma.siteNews.create({
    data: {
      title: TITLE,
      body: BODY.trim(),
      status: "UNPUBLISHED",
      publishedAt: null,
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
