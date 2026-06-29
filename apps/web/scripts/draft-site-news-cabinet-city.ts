import { prisma } from "@/lib/prisma";

async function main() {
  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN" },
    select: { id: true },
  });

  const news = await prisma.siteNews.create({
    data: {
      title: "Смена города в личном кабинете",
      body: `В личном кабинете теперь можно сменить свой город. Выберите страну и город — и сохраните.

По выбранному городу мы подбираем турниры и игроков рядом: вы будете получать информацию о турнирах в пределах 150 км от вашего города. Если переехали или указали город по ошибке — поменяйте его в пару кликов.`.trim(),
      status: "UNPUBLISHED",
      publishedAt: null,
      authorId: admin?.id ?? null,
    },
  });

  console.log("draft created:", news.id, "—", news.title);
}

main().finally(() => prisma.$disconnect());
