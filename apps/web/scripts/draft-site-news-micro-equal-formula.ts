/**
 * Черновик: формула 7 — равные ±0,025.
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-micro-equal-formula.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "Формула рейтинга: равные ±0,025";
const BODY = `В авторейтинге появилась седьмая формула: при равных соперниках рейтинг двигается совсем мелко (±0,025), а апсет и победа фаворита — как раньше (±0,15 и ±0,1).

Так плотные серии между близкими по силе игроками меньше «раздувают» рейтинг, а победы над заметно слабее или сильнее по-прежнему заметны.

Выбор формулы — в админке («Фора и расчёт»).`;

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
