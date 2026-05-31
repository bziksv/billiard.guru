/** Демо-контент для секций, пока нет модели новостей/объявлений в БД. */

export type HomeNewsItem = {
  id: string;
  title: string;
  excerpt: string;
  authorType: "club" | "player";
  authorName: string;
  city: string;
  date: string;
  preview?: boolean;
};

export type HomeAnnouncement = {
  id: string;
  kind: "player" | "club";
  title: string;
  body: string;
  meta: string;
  preview?: boolean;
};

export const HOME_DEMO_NEWS: HomeNewsItem[] = [
  {
    id: "n1",
    title: "Открыта регистрация на парный турнир",
    excerpt:
      "31 мая — швейцарская система, Московская пирамида до 2 побед. Рейтинг пары формируется автоматически.",
    authorType: "club",
    authorName: "Абрилок",
    city: "Воронеж",
    date: "28 мая",
    preview: true,
  },
  {
    id: "n2",
    title: "Ищу напарника на воскресный турнир",
    excerpt:
      "Рейтинг ~5, играю активный разбой. Готов тренироваться вечером перед стартом.",
    authorType: "player",
    authorName: "Станислав В.",
    city: "Воронеж",
    date: "29 мая",
    preview: true,
  },
  {
    id: "n3",
    title: "Новый стол для свободной игры",
    excerpt:
      "Установили стол для русского бильярда. Абонементы и почасовая оплата — в профиле клуба.",
    authorType: "club",
    authorName: "Клуб тест",
    city: "Воронеж",
    date: "30 мая",
    preview: true,
  },
];

export const HOME_DEMO_PLAYER_ADS: HomeAnnouncement[] = [
  {
    id: "pa1",
    kind: "player",
    title: "Спарринг по средам",
    body: "Ищу партнёра 4–6 рейтинг, вечер после 19:00. Московская пирамида.",
    meta: "Воронеж · игрок",
    preview: true,
  },
  {
    id: "pa2",
    kind: "player",
    title: "Пара на парный турнир",
    body: "Есть регистрация, нужен напарник с рейтингом от 3. Пишите в Telegram.",
    meta: "Воронеж · игрок",
    preview: true,
  },
];

export const HOME_DEMO_CLUB_ADS: HomeAnnouncement[] = [
  {
    id: "ca1",
    kind: "club",
    title: "Стол — от 800 ₽/час",
    body: "Русский бильярд, заказ шар-луза. Скидка 10% в будни до 16:00.",
    meta: "Абрилок · клуб",
    preview: true,
  },
  {
    id: "ca2",
    kind: "club",
    title: "Турнирные столы + трансляция",
    body: "Проводим турниры под ключ. Рассылка участникам в Telegram.",
    meta: "Клуб тест · клуб",
    preview: true,
  },
];

export const HOME_FEATURES = [
  {
    icon: "🏆",
    title: "Турниры",
    desc: "Публикация, регистрация, сетки и рейтинг — всё в одном месте.",
  },
  {
    icon: "📰",
    title: "Новости",
    desc: "Клубы и игроки делятся анонсами — через личный кабинет и модерацию.",
  },
  {
    icon: "🤝",
    title: "Спарринг-партнёр",
    desc: "Скоро: Telegram-бот подберёт соперника в вашем городе по рейтингу и месту игры.",
  },
  {
    icon: "🔔",
    title: "Уведомления клубов",
    desc: "Клубы смогут слать анонсы турниров и акций подписчикам прямо в Telegram.",
  },
] as const;
