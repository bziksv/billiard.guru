/**
 * Черновик новости: снятие +1 в чётных после поражения отдающего в 1-й партии.
 * Запуск: cd apps/web && npx tsx scripts/draft-site-news-handicap-even-cancel.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { createPrismaClient } from "../src/lib/prisma";

const TITLE = "Фора 0,5: опция снять +1 в чётных после первой партии";

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
В настройках турнира при учёте рейтинга 0,5 появилась отдельная галка: снимать дополнительный шар в чётных партиях, если тот, кто отдаёт фору, проиграет первую партию.

Как это работает на примере форы 1,5 (один шар в каждой + один в чётных): первая партия — с обычной форой; если отдающий её проиграл, дальше в чётных уже без «половинки», только целая часть. Если выиграл первую — +1 в чётных остаётся как раньше.

Если галка выключена — всё по-прежнему: +1 в чётных на всю встречу. Правило видно в карточке турнира, на сетке (∗) и в Telegram при назначении встречи.
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
