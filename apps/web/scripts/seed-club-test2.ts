/**
 * Создаёт или обновляет демо-клуб «Клуб тест2» (10 столов: 6 пирамида, 3 пул, 1 снукер).
 * Usage: npx tsx scripts/seed-club-test2.ts
 */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/prisma";

const CLUB_NAME = "Клуб тест2";
const REF_CLUB_ID = "cmptedqkj0000an3kwtnwt6yz";

const prisma = createPrismaClient();

const floorPlan = {
  version: 1 as const,
  items: [
    { id: "t2-entrance", kind: "entrance", x: 50, y: 6 },
    { id: "t2-bar", kind: "bar", x: 8, y: 22 },
    { id: "t2-reception", kind: "reception", x: 20, y: 12 },
    { id: "t2-toilet", kind: "toilet", x: 93, y: 14 },
    { id: "t2-wardrobe", kind: "wardrobe", x: 93, y: 28 },
    { id: "t2-lounge", kind: "lounge", x: 92, y: 72 },
    { id: "t2-smoke", kind: "custom", x: 92, y: 52, label: "Курилка" },
    // 6 пирамида
    { id: "t2-py1", kind: "table", tableFormat: "PYRAMID", tableIndex: 1, x: 22, y: 32, label: "Пирамида VIP" },
    { id: "t2-py2", kind: "table", tableFormat: "PYRAMID", tableIndex: 2, x: 38, y: 32 },
    { id: "t2-py3", kind: "table", tableFormat: "PYRAMID", tableIndex: 3, x: 54, y: 32 },
    { id: "t2-py4", kind: "table", tableFormat: "PYRAMID", tableIndex: 4, x: 70, y: 32 },
    { id: "t2-py5", kind: "table", tableFormat: "PYRAMID", tableIndex: 5, x: 30, y: 48 },
    { id: "t2-py6", kind: "table", tableFormat: "PYRAMID", tableIndex: 6, x: 46, y: 48 },
    // 3 пул
    { id: "t2-pool1", kind: "table", tableFormat: "POOL", tableIndex: 1, x: 24, y: 66, label: "Пул 9 ft" },
    { id: "t2-pool2", kind: "table", tableFormat: "POOL", tableIndex: 2, x: 42, y: 66 },
    { id: "t2-pool3", kind: "table", tableFormat: "POOL", tableIndex: 3, x: 60, y: 66 },
    // 1 снукер
    {
      id: "t2-snk1",
      kind: "table",
      tableFormat: "SNOOKER",
      tableIndex: 1,
      x: 78,
      y: 58,
      label: "Снукер",
      priceTierLabel: "Вечер",
    },
  ],
};

const priceTiers = [
  {
    label: "День",
    days: "weekdays",
    timeFrom: "12:00",
    timeTo: "17:00",
    price: "450 ₽/ч",
    note: "скидка 15%",
  },
  {
    label: "Вечер",
    days: "weekdays",
    timeFrom: "17:00",
    timeTo: "23:00",
    price: "550 ₽/ч",
  },
  {
    label: "Пятница",
    days: ["fri"],
    timeFrom: "12:00",
    timeTo: "01:00",
    closesAfterMidnight: true,
    price: "600 ₽/ч",
  },
  {
    label: "Выходные",
    days: "weekend",
    timeFrom: "11:00",
    timeTo: "01:00",
    closesAfterMidnight: true,
    price: "600 ₽/ч",
  },
  { label: "Снукер", days: "all", price: "700 ₽/ч", note: "отдельный зал" },
  { label: "Абонемент", days: "all", price: "4 000 ₽", note: "10 часов" },
];

const newsItems = [
  {
    title: "Открытие второго зала — 10 столов",
    body: `В «${CLUB_NAME}» теперь 10 столов: 6 для русской пирамиды, 3 для американского пула и отдельный стол для снукера.

Запись на игру и бронирование — на billiard.guru.`,
    publishedAt: new Date("2026-05-30T10:00:00+03:00"),
  },
  {
    title: "Турнир по снукеру — 15 июня",
    body: "Первый клубный турнир по снукеру среди любителей. Регистрация открыта, взнос 1500 ₽. Начало в 14:00.",
    publishedAt: new Date("2026-05-25T12:00:00+03:00"),
  },
  {
    title: "Абонемент 10 часов — 4 000 ₽",
    body: "Новый абонемент действует на все столы, кроме снукера. Подробности у администратора.",
    publishedAt: new Date("2026-05-10T09:00:00+03:00"),
  },
];

async function main() {
  const ref = await prisma.club.findUnique({
    where: { id: REF_CLUB_ID },
    include: { city: true },
  });
  if (!ref) {
    throw new Error(`Эталонный клуб ${REF_CLUB_ID} не найден`);
  }

  const lat = ref.latitude ?? ref.city.latitude ?? 51.672;
  const lng = ref.longitude ?? ref.city.longitude ?? 39.1843;

  const clubData = {
    name: CLUB_NAME,
    cityId: ref.cityId,
    phone: ref.phone,
    displayPhone: "+7 (473) 987-65-43",
    email: "test2@billiard.guru",
    photoUrl: "/demo/club-test.webp",
    galleryUrls: ["/demo/club-test.webp", "/demo/club-test-2.webp", "/demo/club-test-3.webp"],
    description: `Бильярдный клуб «${CLUB_NAME}» — вторая демо-площадка billiard.guru с полным набором форматов.

10 профессиональных столов:
• 6 — русская пирамида (с лузами)
• 3 — американский пул 9 ft
• 1 — снукер в отдельной зоне

Интерактивный план зала на сайте, онлайн-бронирование конкретного стола, клубные рейтинги и турниры. Для постоянных игроков — абонементы и скидки в будни.

Зона отдыха, бар, парковка. Ждём на спарринги и турниры!`,
    address: "г. Воронеж, ул. Кольцовская, 35, БЦ «Сити», 2 этаж",
    latitude: lat + 0.008,
    longitude: lng + 0.012,
    workingHours: "Последний заход за стол — за 30 минут до закрытия.",
    weeklyHours: [
      { days: ["mon", "tue", "wed", "thu"], open: "11:00", close: "23:00" },
      { days: ["fri"], open: "11:00", close: "01:00", closesAfterMidnight: true },
      { days: ["sat", "sun"], open: "10:00", close: "01:00", closesAfterMidnight: true },
    ],
    tableCount: 10,
    tableCounts: { PYRAMID: 6, POOL: 3, SNOOKER: 1 },
    floorPlan,
    priceTiers,
    gamePrice: null,
    bookingEnabled: true,
    bookingSlotMinutes: 30,
    bookingAdvanceDays: 14,
    telegramUsername: ref.telegramUsername,
    telegramId: ref.telegramId,
    isVerified: true,
    confirmToken: null,
  };

  let club = await prisma.club.findFirst({
    where: { name: CLUB_NAME, cityId: ref.cityId },
  });

  if (club) {
    club = await prisma.club.update({
      where: { id: club.id },
      data: clubData,
    });
    console.log("Updated existing club:", club.id);
  } else {
    club = await prisma.club.create({
      data: clubData,
    });
    console.log("Created club:", club.id);
  }

  await prisma.clubNews.deleteMany({ where: { clubId: club.id } });
  for (const item of newsItems) {
    await prisma.clubNews.create({ data: { clubId: club.id, ...item } });
  }

  const players = await prisma.player.findMany({
    where: { cityId: ref.cityId, isVerified: true },
    take: 10,
    orderBy: { rating: "desc" },
  });

  for (const player of players) {
    await prisma.clubPlayerRating.upsert({
      where: { clubId_playerId: { clubId: club.id, playerId: player.id } },
      update: { rating: player.rating },
      create: { clubId: club.id, playerId: player.id, rating: player.rating },
    });
  }

  const hasFinished = await prisma.tournament.findFirst({
    where: { clubId: club.id, status: "FINISHED" },
  });
  if (!hasFinished) {
    await prisma.tournament.create({
      data: {
        clubId: club.id,
        name: `Кубок «${CLUB_NAME}» — май 2026`,
        description:
          "Швейцарская система, 12 участников. Русская пирамида. Победитель — Тест12 Игрок.",
        format: "SWISS",
        status: "FINISHED",
        startsAt: new Date("2026-05-18T12:00:00+03:00"),
        publishedAt: new Date("2026-05-01T10:00:00+03:00"),
      },
    });
  }

  const hasOpen = await prisma.tournament.findFirst({
    where: { clubId: club.id, status: { in: ["OPEN", "ACTIVE"] } },
  });
  if (!hasOpen) {
    await prisma.tournament.create({
      data: {
        clubId: club.id,
        name: `Открытый турнир — ${CLUB_NAME}`,
        description: "Олимпийская система, регистрация на billiard.guru.",
        format: "OLYMPIC",
        status: "OPEN",
        startsAt: new Date("2026-06-15T12:00:00+03:00"),
        publishedAt: new Date("2026-06-01T10:00:00+03:00"),
      },
    });
  }

  const updated = await prisma.club.findUnique({
    where: { id: club.id },
    include: {
      news: { orderBy: { publishedAt: "desc" } },
      tournaments: { select: { id: true, name: true, status: true } },
      _count: { select: { playerRatings: true } },
    },
  });

  console.log("\n✅", updated?.name);
  console.log("  id:", updated?.id);
  console.log("  tables: 6 pyramid + 3 pool + 1 snooker");
  console.log("  news:", updated?.news.length);
  console.log("  tournaments:", updated?.tournaments.length);
  console.log("  club ratings:", updated?._count.playerRatings);
  console.log(`  URL: http://localhost:3010/clubs/${club.id}`);
  console.log(`  manage: http://localhost:3010/manage/clubs/${club.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
