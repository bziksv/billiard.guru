/**
 * Черновик: формула 6 — Elo в авторейтинге.
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-elo-formula.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "Формула рейтинга Elo";
const BODY = `В настройках авторейтинга появилась шестая формула — классический Elo, адаптированный под шкалу billiard.guru.

Суть простая: чем неожиданнее результат, тем сильнее сдвигается рейтинг. Равные соперники меняются примерно на ±0,1, победа фаворита даёт меньше, апсет — больше.

Формулу можно выбрать в админке («Фора и расчёт»), включить автопересчёт после встреч или прогнать по всей истории.`;

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
    console.log("Удалён старый черновик.");
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
  console.log("Опубликуйте в /admin/site-news → «Снова на сайте».");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
