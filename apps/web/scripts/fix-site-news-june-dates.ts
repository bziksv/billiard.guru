/**
 * Проставить даты публикации 9–15 июня для июньских новостей серvиса.
 *
 *   cd apps/web && npx tsx scripts/fix-site-news-june-dates.ts
 *   cd apps/web && npx tsx scripts/fix-site-news-june-dates.ts --dry-run
 *   cd apps/web && npx tsx scripts/fix-site-news-june-dates.ts --drafts-only  # только даты, без APPROVED
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

/** 9 новостей на 7 дней (14 и 15 июня — по две) */
const SCHEDULE: { title: string; publishedAt: string }[] = [
  {
    publishedAt: "2026-06-09T12:00:00+03:00",
    title: "При создании турнира можно указать столы клуба",
  },
  {
    publishedAt: "2026-06-10T12:00:00+03:00",
    title: "Сохраните картинку сетки и добавьте ссылку на трансляцию",
  },
  {
    publishedAt: "2026-06-11T12:00:00+03:00",
    title: "Большие сетки стало удобнее смотреть с телефона",
  },
  {
    publishedAt: "2026-06-12T12:00:00+03:00",
    title: "Забронировать стол можно прямо в Telegram-боте",
  },
  {
    publishedAt: "2026-06-13T12:00:00+03:00",
    title: "Клуб подтверждает брони в Telegram — с расписанием на неделю",
  },
  {
    publishedAt: "2026-06-14T12:00:00+03:00",
    title: "Страница «Все новости» — обновления сервиса и анонсы клубов",
  },
  {
    publishedAt: "2026-06-14T18:00:00+03:00",
    title: "Сайт по умолчанию открывается в светлой теме",
  },
  {
    publishedAt: "2026-06-15T12:00:00+03:00",
    title: "Персональная ссылка «Забронировать в Telegram» для клуба",
  },
  {
    publishedAt: "2026-06-15T18:00:00+03:00",
    title: "В боте понятнее, какой стол и сколько их свободно",
  },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const draftsOnly = process.argv.includes("--drafts-only");

  console.log("Текущее состояние:\n");
  for (const row of SCHEDULE) {
    const item = await prisma.siteNews.findFirst({ where: { title: row.title } });
    if (!item) {
      console.log(`  ✗ нет в БД: ${row.title}`);
      continue;
    }
    const date = item.publishedAt?.toISOString().slice(0, 10) ?? "—";
    console.log(`  [${item.status}] ${date} — ${item.title}`);
  }

  if (dryRun) {
    console.log("\n--dry-run: изменения не применены.");
    return;
  }

  console.log(`\nПрименяю даты 9–15 июня${draftsOnly ? " (черновики)" : " + публикация"}…\n`);

  for (const row of SCHEDULE) {
    const publishedAt = new Date(row.publishedAt);
    const updated = await prisma.siteNews.updateMany({
      where: { title: row.title },
      data: {
        publishedAt,
        ...(draftsOnly ? {} : { status: "APPROVED" }),
      },
    });
    if (updated.count) {
      console.log(`✓ ${publishedAt.toISOString().slice(0, 10)} — ${row.title}`);
    }
  }

  console.log("\nГотово: 9 новостей распределены с 9 по 15 июня.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
