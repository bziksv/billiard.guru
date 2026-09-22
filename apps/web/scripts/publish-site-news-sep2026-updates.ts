/**
 * Публикация сводной новости по обновлениям сентября 2026 (замены, протокол, документы).
 * Запуск: cd apps/web && npx tsx scripts/publish-site-news-sep2026-updates.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { createPrismaClient } from "../src/lib/prisma";

const TITLE = "Замены в сетке, понятный протокол и обновлённые документы";

const BODY = `
За последние дни доработали то, что видно игрокам и организаторам на турнирах и в профилях.

Замена игрока mid-bracket
• В незавершённой встрече организатор может заменить участника — например, если кто-то не может продолжать.
• На вкладке «Итоги» появляется уведомление: кого на какой встрече заменили и кем.
• В сетке карточка с заменой подсвечена; в модалке встречи — коротко, кто ушёл и кто вошёл.
• Уже сыгранные матчи не переписываются; рейтинг дальше считается у вошедшего.
• В итогах ушедший больше не числится «в игре» — стоит отметка «отдал место → …».
• В профиле игрока у такого турнира тоже видно, кому отдали место.

Поздняя посадка в сетку
• Если участник ещё «вне сетки», а в первом туре есть свободные bye, можно посадить его к сопернику вручную или выбрать «Определить рандомно».

Протокол с двумя третьими местами
• На форматах с двумя 3-ми местами оба призёра снова на месте: подиум показывает четыре карточки в ряд (2 · 1 · 3 · 3), никто не пропадает из результатов.

Документы и cookies
• Согласие на обработку персональных данных и политика обработки — отдельные страницы (как и должно быть по смыслу 152-ФЗ).
• В подвале и в баннере cookies — актуальный текст со ссылками на согласие, политику и правила рекомендательных технологий.

Спасибо, что пользуетесь billiard.guru — пишите замечания через «Идеи» или организаторам турниров.
`.trim();

async function main() {
  const prisma = createPrismaClient();
  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN" },
    select: { id: true },
  });

  const publishedAt = new Date();

  const existingPublished = await prisma.siteNews.findFirst({
    where: { title: TITLE, status: "APPROVED" },
  });
  if (existingPublished) {
    const row = await prisma.siteNews.update({
      where: { id: existingPublished.id },
      data: {
        body: BODY,
        publishedAt,
        authorId: admin?.id ?? existingPublished.authorId,
      },
    });
    console.log("updated published", row.id);
  } else {
    const row = await prisma.siteNews.create({
      data: {
        title: TITLE,
        body: BODY,
        status: "APPROVED",
        publishedAt,
        authorId: admin?.id ?? null,
      },
    });
    console.log("created published", row.id);
  }

  // Старый узкий черновик про отметки замены больше не нужен как отдельная публикация.
  const oldDraft = await prisma.siteNews.findFirst({
    where: {
      title: "Отметки о замене игрока в турнире",
      status: "UNPUBLISHED",
    },
  });
  if (oldDraft) {
    await prisma.siteNews.delete({ where: { id: oldDraft.id } });
    console.log("removed obsolete draft", oldDraft.id);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
