/**
 * Черновик: отметки замены в итогах, сетке и модалке встречи.
 * Запуск: cd apps/web && npx tsx scripts/draft-site-news-substitution-notice.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { createPrismaClient } from "../src/lib/prisma";

const TITLE = "Отметки о замене игрока в турнире";

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
Если в турнире организатор заменил игрока в незавершённой встрече, это теперь видно всем:

• на вкладке «Итоги» — уведомление, кого на какой встрече заменили;
• в сетке — карточка встречи с заменой подсвечена, в подписи — «замена»;
• в карточке встречи — краткое пояснение: кто ушёл, кто вошёл, и что уже сыгранные матчи не переписываются.

Так проще понять протокол, если кто-то доигрывал сетку вместо другого участника.
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
