/**
 * Опубликовать новости сервиса (UNPUBLISHED → APPROVED) с указанной даты создания.
 * Usage: npx tsx scripts/publish-site-news-since.ts [YYYY-MM-DD]
 */
import { prisma } from "../src/lib/prisma";

const sinceArg = process.argv[2] ?? "2026-07-05";
const since = new Date(`${sinceArg}T00:00:00.000Z`);

async function main() {
  const rows = await prisma.siteNews.findMany({
    where: {
      createdAt: { gte: since },
      status: { not: "APPROVED" },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, status: true, createdAt: true, publishedAt: true },
  });

  console.log(`Since ${sinceArg}: ${rows.length} unpublished`);
  for (const r of rows) {
    console.log(`- ${r.createdAt.toISOString().slice(0, 10)} [${r.status}] ${r.title}`);
  }

  if (rows.length === 0) {
    const all = await prisma.siteNews.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { title: true, status: true, createdAt: true },
    });
    console.log("All since date:");
    for (const r of all) {
      console.log(`- ${r.createdAt.toISOString().slice(0, 10)} [${r.status}] ${r.title}`);
    }
    return;
  }

  const now = new Date();
  for (const r of rows) {
    await prisma.siteNews.update({
      where: { id: r.id },
      data: {
        status: "APPROVED",
        publishedAt: r.publishedAt ?? now,
      },
    });
    console.log(`Published: ${r.title}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
