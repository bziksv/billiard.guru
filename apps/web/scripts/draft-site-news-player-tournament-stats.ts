import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

async function main() {
  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN" },
    select: { id: true },
  });

  const news = await prisma.siteNews.create({
    data: {
      title: "В профиле — как прошёл каждый турнир",
      body: `В карточке турнира на странице игрока теперь видно больше деталей.

Для парных турниров — с кем играли. Плюс сколько встреч сыграно и какой процент побед.

Удобно вспомнить путь по сетке и результат без лишней детализации.`.trim(),
      status: "UNPUBLISHED",
      publishedAt: null,
      authorId: admin?.id ?? null,
    },
  });

  console.log("draft created:", news.id, "—", news.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
