/**
 * Черновик: рейтинг в сетке на момент встречи.
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-match-start-rating.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "В сетке — рейтинг на момент встречи";
const BODY = `В карточках сетки теперь показывается рейтинг игрока на момент этой встречи, а не актуальный после всех последующих партий.

Так проще понять фору и ход турнира: после победы во встрече №5 во встрече №11 будет уже обновлённая цифра, а не одна и та же «сейчас» на всех карточках.

В списке участников и в профиле по-прежнему виден текущий рейтинг.`;

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
