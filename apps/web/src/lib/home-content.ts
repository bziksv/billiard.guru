/** Типы и статический контент для главной страницы. */

export type HomeNewsItem = {
  id: string;
  title: string;
  excerpt: string;
  authorType: "club" | "player";
  authorName: string;
  city: string;
  date: string;
  href?: string;
  /** Устаревший демо-контент с меткой «пример» */
  preview?: boolean;
};

export type HomeAnnouncement = {
  id: string;
  kind: "player" | "club";
  title: string;
  body: string;
  meta: string;
  href?: string;
  preview?: boolean;
};

export type HomeFeature = {
  icon: string;
  title: string;
  desc: string;
  href?: string;
};

export const HOME_FEATURES: HomeFeature[] = [
  {
    icon: "🏆",
    title: "Турниры",
    desc: "Публикация, регистрация, интерактивные сетки и протокол — для одиночных и парных форматов.",
    href: "/tournaments",
  },
  {
    icon: "📊",
    title: "Форматы сеток",
    desc: "Олимпийская, швейцарская и эталонные сетки на 16, 32 и 64 — с демо-схемами в справочнике.",
    href: "/brackets",
  },
  {
    icon: "🤝",
    title: "Покатать",
    desc: "Объявления игроков и клубов: спарринг, напарник, свободные столы — на сайте и в Telegram-боте.",
    href: "/pokatat",
  },
  {
    icon: "📱",
    title: "Telegram-бот",
    desc: "Турниры, уведомления о матчах, управление клубом, брони столов и «Покатать» — в @BilliardGuruBot.",
    href: "/login",
  },
  {
    icon: "📰",
    title: "Новости клубов",
    desc: "Анонсы турниров и акций — клуб публикует в профиле, игроки видят в ленте на главной.",
    href: "/clubs",
  },
  {
    icon: "🎱",
    title: "Бронь столов",
    desc: "Онлайн-запись в клубах с схемой зала — игрок выбирает стол и время, клуб подтверждает.",
    href: "/clubs",
  },
];

export const HOME_TICKER_ITEMS = [
  "Турниры и сетки на 16, 32 и 64",
  "Справочник форматов с демо-схемами",
  "Покатать — объявления игроков и клубов",
  "Telegram-бот: турниры и уведомления",
  "Бронирование столов онлайн",
  "Рейтинг и профили игроков",
  "Новости и анонсы клубов",
] as const;
