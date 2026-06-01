/**
 * Заполняет клуб демо-данными для публичной страницы.
 * Usage: npx tsx scripts/seed-club-demo.ts [clubId]
 */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/prisma";

const DEFAULT_DEMO_CLUB_ID = "cmptedqkj0000an3kwtnwt6yz";
const CLUB_ID = process.argv[2] ?? DEFAULT_DEMO_CLUB_ID;

const prisma = createPrismaClient();

async function main() {
  const existing = await prisma.club.findUnique({
    where: { id: CLUB_ID },
    include: { city: true },
  });

  if (!existing) {
    throw new Error(`Клуб ${CLUB_ID} не найден`);
  }

  const clubName = existing.name;
  const lat = existing.latitude ?? existing.city.latitude ?? 51.672;
  const lng = existing.longitude ?? existing.city.longitude ?? 39.1843;

  await prisma.club.update({
    where: { id: CLUB_ID },
    data: {
      email: "demo@billiard.guru",
      phone: "+79507775325",
      displayPhone: "+74731234567",
      photoUrl: "/demo/club-test.jpg",
      galleryUrls: [
        "/demo/club-test.jpg",
        "/demo/club-test-2.jpg",
        "/demo/club-test-3.jpg",
      ],
      description: `Бильярдный клуб «${clubName}» — демонстрационная страница платформы billiard.guru для любителей русского бильярда и пула.

У нас 8 профессиональных столов: 5 — русская пирамида (с лузами), 3 — американский пул 9 ft. Столы регулярно обслуживаются, сукно и резина в отличном состоянии.

Для постоянных игроков — абонементы и скидки в будние дни. Проводим турниры по выходным: олимпийская система, швейцарка и парные форматы. Регистрация на billiard.guru.

Есть зона отдыха, кофе и лёгкие закуски. Парковка во дворе клуба.`,
      address: "г. Воронеж, ул. Московский проспект, 129, ТЦ «Галерея Чиж», 3 этаж",
      latitude: lat,
      longitude: lng,
      workingHours: "Последний заход за стол — за 30 минут до закрытия.",
      weeklyHours: [
        { days: ["mon", "tue", "wed", "thu"], open: "12:00", close: "23:00" },
        { days: ["fri"], open: "12:00", close: "01:00", closesAfterMidnight: true },
        { days: ["sat", "sun"], open: "11:00", close: "01:00", closesAfterMidnight: true },
      ],
      tableCount: 8,
      tableCounts: { PYRAMID: 5, POOL: 3 },
      floorPlan: {
        version: 1,
        items: [
          { id: "demo-entrance", kind: "entrance", x: 50, y: 7 },
          { id: "demo-bar", kind: "bar", x: 10, y: 24 },
          { id: "demo-reception", kind: "reception", x: 22, y: 14 },
          { id: "demo-toilet", kind: "toilet", x: 92, y: 16 },
          { id: "demo-wardrobe", kind: "wardrobe", x: 92, y: 30 },
          { id: "demo-lounge", kind: "lounge", x: 90, y: 78 },
          { id: "demo-smoke", kind: "custom", x: 90, y: 58, label: "Курилка" },
          { id: "demo-p1", kind: "table", tableFormat: "PYRAMID", tableIndex: 1, x: 28, y: 38 },
          { id: "demo-p2", kind: "table", tableFormat: "PYRAMID", tableIndex: 2, x: 44, y: 38 },
          { id: "demo-p3", kind: "table", tableFormat: "PYRAMID", tableIndex: 3, x: 60, y: 38 },
          { id: "demo-p4", kind: "table", tableFormat: "PYRAMID", tableIndex: 4, x: 36, y: 58 },
          { id: "demo-p5", kind: "table", tableFormat: "PYRAMID", tableIndex: 5, x: 52, y: 58 },
          { id: "demo-pool1", kind: "table", tableFormat: "POOL", tableIndex: 1, x: 28, y: 78 },
          { id: "demo-pool2", kind: "table", tableFormat: "POOL", tableIndex: 2, x: 44, y: 78 },
          { id: "demo-pool3", kind: "table", tableFormat: "POOL", tableIndex: 3, x: 60, y: 78 },
        ],
      },
      priceTiers: [
        {
          label: "День",
          days: "weekdays",
          timeFrom: "12:00",
          timeTo: "17:00",
          price: "400 ₽/ч",
          note: "скидка 20%",
        },
        {
          label: "Вечер",
          days: "weekdays",
          timeFrom: "17:00",
          timeTo: "23:00",
          price: "500 ₽/ч",
        },
        {
          label: "Пятница",
          days: ["fri"],
          timeFrom: "12:00",
          timeTo: "01:00",
          closesAfterMidnight: true,
          price: "550 ₽/ч",
        },
        {
          label: "Выходные",
          days: "weekend",
          timeFrom: "11:00",
          timeTo: "01:00",
          closesAfterMidnight: true,
          price: "550 ₽/ч",
        },
        { label: "Абонемент", days: "all", price: "3 500 ₽", note: "10 часов" },
      ],
      gamePrice: null,
      bookingEnabled: true,
      bookingSlotMinutes: 30,
      bookingAdvanceDays: 14,
      telegramUsername: "KlubTestDemo",
      isVerified: true,
    },
  });

  await prisma.clubNews.deleteMany({ where: { clubId: CLUB_ID } });

  const newsItems = [
    {
      title: "Открыта регистрация на парный турнир 31 мая",
      body: `31 мая — швейцарская система по турам, Московская пирамида до 2 побед.

Регистрация с 11:30, начало в 12:00. Взнос 1000 ₽ с игрока, призовой фонд формируется из взносов.

Запись на billiard.guru или у администратора клуба.`,
      publishedAt: new Date("2026-05-28T10:00:00+03:00"),
    },
    {
      title: "Новый стол для свободной игры",
      body: "Установили седьмой стол для русского бильярда. Абонементы и почасовая оплата — у администратора. В будни с 12:00 до 17:00 — скидка 20% на почасовую игру.",
      publishedAt: new Date("2026-05-15T14:00:00+03:00"),
    },
    {
      title: "Летний график работы",
      body: `С 1 июня клуб работает по расширенному расписанию: пятница и суббота до 01:00.

Ждём всех на спарринги и турниры!`,
      publishedAt: new Date("2026-05-01T09:00:00+03:00"),
    },
  ];

  for (const item of newsItems) {
    await prisma.clubNews.create({
      data: { clubId: CLUB_ID, ...item },
    });
  }

  const players = await prisma.player.findMany({
    where: { cityId: existing.cityId, isVerified: true },
    take: 8,
    orderBy: { rating: "desc" },
  });

  for (const player of players) {
    await prisma.clubPlayerRating.upsert({
      where: { clubId_playerId: { clubId: CLUB_ID, playerId: player.id } },
      update: { rating: player.rating },
      create: {
        clubId: CLUB_ID,
        playerId: player.id,
        rating: player.rating,
      },
    });
  }

  const finishedTournament = await prisma.tournament.findFirst({
    where: { clubId: CLUB_ID, status: "FINISHED" },
  });

  if (!finishedTournament) {
    await prisma.tournament.create({
      data: {
        clubId: CLUB_ID,
        name: `Кубок «${clubName}» — весна 2026`,
        description:
          "Олимпийская система, 16 участников. Московская пирамида до 2 побед. Победитель — Тест16 Игрок.",
        format: "OLYMPIC",
        status: "FINISHED",
        startsAt: new Date("2026-04-12T11:00:00+03:00"),
        publishedAt: new Date("2026-04-01T10:00:00+03:00"),
      },
    });
  }

  const updated = await prisma.club.findUnique({
    where: { id: CLUB_ID },
    include: {
      news: { orderBy: { publishedAt: "desc" } },
      tournaments: { select: { id: true, name: true, status: true } },
      _count: { select: { playerRatings: true } },
    },
  });

  console.log("Club demo data updated:", updated?.name);
  console.log("  news:", updated?.news.length);
  console.log("  tournaments:", updated?.tournaments.length);
  console.log("  club ratings:", updated?._count.playerRatings);
  console.log(`  URL: http://localhost:3010/clubs/${CLUB_ID}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
