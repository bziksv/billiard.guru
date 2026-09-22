/**
 * Черновик: добор в bye после формирования сетки.
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-late-join-bye.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "Добор в сетку без пересборки";
const BODY = `Если сетка уже собрана, а кто-то всё же просится сыграть — и в первом туре есть пустой слот (автопроход / «крест») — организатор может добавить участника и посадить его к выбранному сопернику.

Пересобирать сетку не нужно: автопроход откатится, встреча станет обычной, а пустой крест снова будет ждать реального проигравшего.

Работает для олимпийской и фиксированной швейцарской сетки.`;

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

  console.log(`Черновик: «${TITLE}» — опубликуйте в /admin/site-news`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
