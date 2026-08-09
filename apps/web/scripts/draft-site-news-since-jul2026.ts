/**
 * Черновики новостей по правкам с июля 2026.
 * По умолчанию UNPUBLISHED; с флагом --publish сразу на сайте.
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-since-jul2026.ts
 *   cd apps/web && npx tsx scripts/draft-site-news-since-jul2026.ts --publish
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

const NEWS: { createdAt: string; title: string; body: string }[] = [
  {
    createdAt: "2026-07-13T12:00:00+03:00",
    title: "Обновили политики и правила сайта",
    body: `На сайте актуальные редакции документов:

• политика обработки персональных данных;
• политика cookies;
• правила рекомендательных технологий.

Их можно открыть из подвала сайта и при согласии на обработку данных при входе. Тексты приведены в соответствие с официальными формулировками сервиса.`,
  },
  {
    createdAt: "2026-08-09T11:00:00+03:00",
    title: "На главной — реальные цифры по турнирам и клубам",
    body: `На главной странице уточнили блок со счётчиками.

Теперь видно, сколько турниров уже проведено и сколько клубов подключено к сервису — по всей базе, а не только по отдельной выборке. Подписи стали понятнее: «Проведено турниров» и «Клубов в системе».`,
  },
  {
    createdAt: "2026-08-09T12:00:00+03:00",
    title: "Турниры, которые не состоялись",
    body: `Если турнир так и не стартовал, он больше не висит в ленте как «открытый» или «идёт».

Через пять дней после заявленной даты старта (или публикации, если даты не было) статус автоматически становится «Не состоялся». Такие события уходят в прошедшие — в клубе и в списках турниров картина становится честнее.`,
  },
  {
    createdAt: "2026-08-09T13:00:00+03:00",
    title: "В профиле игрока видно занятое место на турнире",
    body: `На странице игрока у каждого завершённого турнира теперь показано, какое место занял участник.

Для призёров — медаль и акцент, для остальных — номер или диапазон (например, 5–6). Место считается по протоколу сетки — так же, как на странице турнира и в боте в разделе «Мои турниры».`,
  },
];

async function main() {
  const publish = process.argv.includes("--publish");
  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN", isVerified: true },
    select: { id: true },
  });

  for (const item of NEWS) {
    const existing = await prisma.siteNews.findFirst({
      where: { title: item.title },
      select: { id: true, status: true },
    });
    if (existing) {
      if (publish && existing.status !== "APPROVED") {
        const createdAt = new Date(item.createdAt);
        await prisma.siteNews.update({
          where: { id: existing.id },
          data: { status: "APPROVED", publishedAt: createdAt },
        });
        console.log(`↑ Опубликовано (уже было): ${item.title}`);
      } else {
        console.log(`· Уже есть: ${item.title} [${existing.status}]`);
      }
      continue;
    }

    const createdAt = new Date(item.createdAt);
    await prisma.siteNews.create({
      data: {
        title: item.title,
        body: item.body.trim(),
        status: publish ? "APPROVED" : "UNPUBLISHED",
        publishedAt: publish ? createdAt : null,
        createdAt,
        authorId: admin?.id ?? null,
      },
    });
    console.log(`${publish ? "✓ Опубликовано" : "✓ Черновик"}: ${item.title}`);
  }

  if (!publish) {
    console.log("Опубликуйте в /admin/site-news или запустите с --publish.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
