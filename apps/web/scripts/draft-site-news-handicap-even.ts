/**
 * Черновик новости: доп. шар форы в чётных партиях (вместо нечётных).
 * Запуск: cd apps/web && npx tsx scripts/draft-site-news-handicap-even.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { createPrismaClient } from "../src/lib/prisma";

const TITLE = "Фора 0,5: дополнительный шар в чётных партиях";

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
Когда в турнире включён учёт рейтинга 0,5, при дробной разнице (например 1,5) дополнительный шар теперь даётся в чётных партиях — во 2-й, 4-й и так далее, а не в нечётных.

В короткой встрече до двух или трёх побед фора получается спокойнее: в первой партии остаётся только целая часть, «половинка» подключается со второй.

Если галка «Учитывать рейтинг 0,5» снята — по-прежнему только целые шары по разнице рейтингов, без дополнительных.
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
