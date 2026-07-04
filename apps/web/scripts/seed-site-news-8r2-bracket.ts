/**
 * Черновик новости: формат FIXED_SWISS_8R2_1_3_mesto
 * npx tsx scripts/seed-site-news-8r2-bracket.ts
 */
import { prisma } from "@/lib/prisma";

async function main() {
  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN" },
    select: { id: true },
  });

  const news = await prisma.siteNews.create({
    data: {
      title: "Сетка на 8 человек с 1/2 и матчем за 3–4 место",
      body: `В админке появился новый тип турнира для восьмерки: олимпийка с полуфинала, нижняя сетка до 4-го места и отдельная игра за бронзу.

Что можно делать:
• выбрать формат «Сетка на 8 до 2 поражений, олимпийка с 1/2 с определением 3 и 4 места» при создании турнира;
• провести 14 встреч по фиксированной схеме: #7–#8 полуфинал, #13 за 3–4, #14 финал;
• автоматически получить переходы проигравших в нижний тур (#5–#6, #9–#10, #12).

Формат подходит для небольших клубных турниров, когда нужна полная раскладка мест, но без четвертьфинала в верхней сетке.`.trim(),
      status: "UNPUBLISHED",
      publishedAt: null,
      authorId: admin?.id ?? null,
    },
  });

  console.log("draft created:", news.id, "—", news.title);
}

main().finally(() => prisma.$disconnect());
