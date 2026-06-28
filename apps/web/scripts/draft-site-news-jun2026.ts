/**
 * Черновики новостей сервиса за вторую половину июня 2026.
 * Создаёт UNPUBLISHED-записи (на сайте не видны) с проставленными датами —
 * при публикации в /admin/site-news дата сохраняется (republishSiteNews).
 *
 *   cd apps/web && npx tsx scripts/draft-site-news-jun2026.ts
 *   cd apps/web && npx tsx scripts/draft-site-news-jun2026.ts --force  # пересоздать
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

type NewsDraft = {
  date: string; // YYYY-MM-DD
  title: string;
  body: string;
};

const DRAFTS: NewsDraft[] = [
  {
    date: "2026-06-22",
    title: "Англоязычная версия сайта",
    body: `Запускаем версию billiard.guru на английском — для гостей и игроков, которым удобнее без русского.

Переключатель языка теперь в шапке сайта: интерфейс, разделы и навигация открываются на английском, а имена игроков и названия клубов автоматически показываются в латинице.

Русская версия остаётся основной и работает как прежде — мы будем постепенно дополнять перевод страниц.`,
  },
  {
    date: "2026-06-25",
    title: "Фотографии клубов и тренеров — быстрее и легче",
    body: `Переработали загрузку фотографий: теперь снимки автоматически уменьшаются до разумного размера и сохраняются в современном формате WebP.

Что это даёт:
• страницы клубов и тренеров открываются заметно быстрее;
• фото меньше «весят» — экономия трафика на телефоне;
• качество картинки остаётся хорошим.

Обработка происходит прямо при загрузке — ничего настраивать не нужно.`,
  },
  {
    date: "2026-06-27",
    title: "Парные турниры: регистрируйтесь по одному — пары собирает организатор",
    body: `Добавили режим парного турнира. Игроки записываются поодиночке, а пары формирует организатор уже из подтверждённых участников — перетаскиванием, прямо в управлении турниром.

Как это работает:
• при создании турнира организатор включает галочку «Парный турнир»;
• на сетку, например, на 16 пар допускается вдвое больше участников;
• организатор объединяет игроков в пары, и в сетку попадают уже команды.

Удобно для форматов, где играют сыгранные двойки, а заранее напарник может быть неизвестен.`,
  },
  {
    date: "2026-06-28",
    title: "Свой рейтинг пары и его корректировка по ходу турнира",
    body: `Для парных турниров организатор может задать собственный рейтинг пары — а не просто сумму рейтингов двух игроков. Это полезно, когда у двойки есть «сыгранность» или, наоборот, кто-то занижает свой уровень.

Рейтинг задаётся с шагом 0,5 кнопками «плюс/минус», поэтому ошибиться с дробью сложно. Его можно поправить даже после жеребьёвки — обновлённое значение учитывается в форах следующих встреч.

Так посев и гандикапы остаются честными на протяжении всего турнира.`,
  },
];

async function main() {
  const force = process.argv.includes("--force");
  const titles = DRAFTS.map((d) => d.title);

  const existing = await prisma.siteNews.findMany({
    where: { title: { in: titles } },
    select: { id: true, title: true },
  });

  if (existing.length > 0 && !force) {
    console.log(`Уже есть ${existing.length} черновик(ов) с такими заголовками. --force для пересоздания.`);
    return;
  }

  if (force && existing.length > 0) {
    await prisma.siteNews.deleteMany({ where: { title: { in: titles } } });
    console.log(`Удалено ${existing.length} старых записей.`);
  }

  const admin = await prisma.player.findFirst({
    where: { role: "SUPERADMIN", isVerified: true },
    select: { id: true },
  });

  let created = 0;
  for (const item of DRAFTS) {
    const date = new Date(`${item.date}T12:00:00+03:00`);
    await prisma.siteNews.create({
      data: {
        title: item.title,
        body: item.body.trim(),
        status: "UNPUBLISHED",
        publishedAt: date, // не виден на сайте (status гейт), но дата сохранится при публикации
        createdAt: date,
        authorId: admin?.id ?? null,
      },
    });
    created++;
    console.log(`✓ ${item.date} — ${item.title}`);
  }

  console.log(`\nГотово: ${created} черновик(ов). Опубликуйте в /admin/site-news → «Снова на сайте».`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
