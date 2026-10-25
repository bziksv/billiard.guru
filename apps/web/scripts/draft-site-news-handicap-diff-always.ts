/**
 * Черновик: фора без галки 0,5 тоже от разницы рейтингов.
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-handicap-diff-always.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const TITLE = "Фора всегда от разницы рейтингов";
const BODY = `Поправили расчёт форы, когда в турнире выключен учёт шага 0,5.

Раньше в этом режиме брались целые части рейтингов каждого игрока (например 3,05 и 2,75 → 3 и 2 → фора 1). Теперь и без галки считается разница рейтингов: меньше 0,5 — без форы, иначе только целые шары в каждой партии (без +1 в чётных).

С галкой 0,5 по-прежнему можно добавить +1 в чётных партиях.`.trim();

async function main() {
  const force = process.argv.includes("--force");
  const existing = await prisma.siteNews.findFirst({
    where: { title: TITLE },
    select: { id: true },
  });
  if (existing && !force) {
    console.log("Черновик уже есть:", existing.id);
    return;
  }
  if (existing && force) {
    await prisma.siteNews.delete({ where: { id: existing.id } });
  }

  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN", isVerified: true },
    select: { id: true },
  });

  const row = await prisma.siteNews.create({
    data: {
      title: TITLE,
      body: BODY,
      status: "UNPUBLISHED",
      publishedAt: null,
      authorId: admin?.id ?? null,
    },
  });
  console.log("draft", row.id, TITLE);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
