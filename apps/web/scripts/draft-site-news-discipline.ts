import { prisma } from "@/lib/prisma";

async function main() {
  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN" },
    select: { id: true },
  });

  const news = await prisma.siteNews.create({
    data: {
      title: "Тип игры в турнирах и статистика по дисциплинам",
      body: `Теперь у турнира можно указать тип игры: дисциплину (пирамида, пул, снукер, китайский пул, карамболь) и её подвид — например, московская или свободная пирамида, восьмёрка или девятка в пуле.

Тип игры выбирается при создании турнира — и у организатора клуба, и в админке. Для уже прошедших турниров его можно проставить в карточке турнира.

Главное для игроков: в профиле и личном кабинете появилась разбивка статистики по дисциплинам. Видно, в каких играх процент побед выше, сколько встреч сыграно и среднее время партии по каждому типу игры — а не только общей цифрой.`.trim(),
      status: "UNPUBLISHED",
      publishedAt: null,
      authorId: admin?.id ?? null,
    },
  });

  console.log("draft created:", news.id, "—", news.title);
}

main().finally(() => prisma.$disconnect());
