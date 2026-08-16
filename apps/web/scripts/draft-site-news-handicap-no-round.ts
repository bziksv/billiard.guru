/**
 * Черновик: фора без округления вверх (порог 0,5).
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-handicap-no-round.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "Фора только при разнице от 0,5";
const BODY = `Уточнили расчёт форы: разницу рейтингов больше не округляем вверх.

Если разница меньше 0,5 — форы нет. Ровно 0,5 и выше — как раньше по шагу 0,5 (полный шар в каждой партии и/или +1 в чётных).

Так встречи вроде 2,35 против 1,9 (разница 0,45) идут без форы.`;

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
