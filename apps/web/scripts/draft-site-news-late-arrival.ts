/**
 * Черновик: галка «Опаздывает» и посев опоздавших.
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-late-arrival.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "Отметка «Опаздывает» при записи на турнир";
const BODY = `В кабинете организатора у участников появилась галка «Опаздывает» — рядом с уже знакомой «Сдал взнос».

Когда вы формируете сетку, опоздавшие стыкуются друг с другом в первом круге, чтобы остальные могли начинать вовремя. Если опоздавший один (или «лишний» при нечётном числе), он получает слабый посев и играет с лидером посева.

Обычный посев по рейтингу для тех, кто пришёл вовремя, не меняется. Отметку ставит организатор до генерации сетки.`;

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
