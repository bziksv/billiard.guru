/**
 * Черновик: прямые ссылки на вкладки турнира (#bracket и др.).
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-tournament-tab-anchors.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "Ссылки сразу на нужную вкладку турнира";
const BODY = `Теперь можно открыть страницу турнира сразу на нужной вкладке — результаты, участники, встречи или сетку.

Добавьте в конец ссылки якорь:
• #results — результаты и места;
• #participants — участники (или пары);
• #matches — список встреч;
• #bracket — турнирная сетка.

Удобно, когда делитесь сеткой в чате или соцсетях: по ссылке сразу открывается нужный раздел, страница прокручивается к вкладкам.`;

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
  console.log("Черновик создан:", TITLE);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
