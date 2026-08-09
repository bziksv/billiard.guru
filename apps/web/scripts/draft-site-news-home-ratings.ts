/**
 * Черновик: два рейтинга на главной — по силе и по % побед.
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-home-ratings.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "На главной — рейтинг по силе и по проценту побед";
const BODY = `На главной странице теперь два блока с топом игроков региона.

Сверху — рейтинг по силе: привычные очки рейтинга, как в общем списке игроков.

Ниже — рейтинг по проценту побед во встречах турниров. Чтобы попасть в топ, нужно сыграть не меньше трёх матчей — так случайный один выигрыш не поднимает в лидеры.

Открыть полный список с сортировкой по победам можно по ссылке из блока.`;

async function main() {
  const existing = await prisma.siteNews.findFirst({
    where: { title: TITLE },
    select: { id: true },
  });
  if (existing) {
    console.log("Черновик уже есть:", TITLE);
    return;
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
  console.log(`✓ Черновик: ${TITLE}`);
  console.log("Опубликуйте в /admin/site-news → «Снова на сайте».");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
