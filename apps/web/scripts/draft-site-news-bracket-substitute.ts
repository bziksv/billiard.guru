/**
 * Черновик: замена игрока mid-bracket (solo).
 * Запуск: cd apps/web && npx tsx scripts/draft-site-news-bracket-substitute.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { createPrismaClient } from "../src/lib/prisma";

const TITLE = "Замена игрока в незавершённой встрече";

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
В одиночных турнирах организатор может заменить игрока в незавершённой встрече — например, если участник отказывается продолжать и хочет отдать место ранее вылетевшему или другому игроку.

Как это работает: в модалке встречи — «Заменить игрока». Можно выбрать вылетевшего или кого-то из базы (его добавят в заявки). Меняются только встречи без победителя; уже сыгранные матчи остаются как были.

Рейтинг с момента замены считается на вошедшего. Прошлые изменения рейтинга ушедшего не трогаем.
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
