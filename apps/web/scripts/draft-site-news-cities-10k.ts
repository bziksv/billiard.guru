import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

async function main() {
  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN" },
    select: { id: true },
  });

  const news = await prisma.siteNews.create({
    data: {
      title: "В списке городов — от 10 тысяч жителей",
      body: `В выборе города при регистрации и в профиле появились города России с населением от 10 тысяч человек (по переписи 2021 года).

Раньше в справочнике были в основном крупные центры. Теперь можно указать, например, Удачный, Мирный, Азов и другие города, где тоже играют в бильярд.

Если у города одно имя в разных регионах (Мирный, Советск, Кировск), в списке будет подпись с регионом — чтобы не перепутать.`,
      status: "UNPUBLISHED",
      publishedAt: null,
      authorId: admin?.id ?? null,
    },
  });

  console.log("draft created:", news.id, "—", news.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
