import {
  getNotificationDefaultTemplate,
  getNotificationReferenceTemplate,
} from "@/lib/notifications/default-templates";

/**
 * Единый реестр уведомлений billiard.guru.
 * При добавлении нового Telegram-сообщения: 1) запись здесь, 2) отправка через dispatchNotification().
 */

export type NotificationChannel = "telegram";
export type NotificationCategory =
  | "tournaments"
  | "auth"
  | "clubs"
  | "bookings"
  | "ideas"
  | "bot";
export type NotificationKind = "outbound" | "bot_reply" | "deeplink";

export interface NotificationDefinition {
  /** Уникальный ключ — передаётся в dispatchNotification() */
  id: string;
  title: string;
  description: string;
  category: NotificationCategory;
  /** outbound — сервер инициирует; bot_reply — ответ на действие в боте; deeplink — пользователь открывает бота по ссылке */
  kind: NotificationKind;
  channel: NotificationChannel;
  recipient: string;
  trigger: string;
  implementation: string;
  hasButtons: boolean;
  /** Событие в audit_log (если пишется) */
  auditAction?: string;
  /** id других уведомлений, которые могут следовать за этим */
  chainsTo?: string[];
  /** id уведомлений, которые должны произойти раньше */
  triggeredBy?: string[];
  examplePreview: string;
  /** Массовая рассылка — в тестовом режиме только выбранные получатели */
  massBroadcast?: boolean;
  /** Можно отключить и менять шаблон в /admin/notifications */
  manageable?: boolean;
  /** Игрок не может отключить в личном кабинете */
  playerLocked?: boolean;
  /** Плейсхолдеры для templateOverride: {{name}} */
  templatePlaceholders?: string[];
  /** Полный шаблон с {{placeholders}} — подставляется в форму и при отправке */
  defaultTemplate?: string;
  /** Текст для просмотра в админке (ответы бота — только в коде) */
  referenceTemplate?: string;
}

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  tournaments: "Турниры",
  auth: "Вход и регистрация",
  clubs: "Клубы",
  bookings: "Брони столов",
  ideas: "Идеи",
  bot: "Ответы бота",
};

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  outbound: "Исходящее",
  bot_reply: "Ответ бота",
  deeplink: "Ссылка в бот (без push с сервера)",
};

export const NOTIFICATION_CATALOG = [
  {
    id: "tournament-approval-request",
    title: "Запрос на публикацию турнира",
    description:
      "Клубу отправляется карточка турнира с кнопками «Опубликовать» / «Отклонить». Без подтверждённого Telegram клуба турнир не создаётся.",
    category: "tournaments",
    kind: "outbound",
    channel: "telegram",
    recipient: "Владелец клуба (club.telegramId)",
    trigger: "Создание турнира в админке или кабинете клуба (POST /api/tournaments)",
    implementation: "tournament-approval.ts → requestClubTournamentApproval()",
    hasButtons: true,
    auditAction: "tournament.approval.requested",
    chainsTo: ["tournament-approval-response", "tournament-nearby-announce"],
    examplePreview:
      "🏆 Запрос на публикацию турнира… Подтвердите публикацию — игрокам в радиусе 150 км уйдёт уведомление.",
    manageable: true,
    templatePlaceholders: [
      "tournamentName",
      "clubName",
      "cityName",
      "format",
      "startsAt",
      "description",
      "radiusKm",
    ],
  },
  {
    id: "tournament-nearby-announce",
    title: "Новый турнир рядом",
    description:
      "Массовая рассылка подтверждённым игрокам в городах в радиусе 150 км от клуба турнира.",
    category: "tournaments",
    kind: "outbound",
    channel: "telegram",
    recipient: "Игроки с telegramId в ближайших городах",
    trigger: "Клуб нажал «Опубликовать» в Telegram (после tournament-approval-request)",
    implementation: "tournament-approval.ts → notifyNearbyPlayers()",
    hasButtons: false,
    auditAction: "tournament.notify.nearby",
    triggeredBy: ["tournament-approval-request"],
    examplePreview: "📣 Новый турнир рядом с вами… Подробнее: ссылка на турнир",
    massBroadcast: true,
    manageable: true,
    templatePlaceholders: [
      "tournamentName",
      "clubName",
      "cityName",
      "format",
      "startsAt",
      "description",
      "link",
    ],
  },
  {
    id: "tournament-approval-response",
    title: "Результат публикации турнира",
    description: "Ответ владельцу клуба после нажатия кнопки или deep link tournament_approve_*.",
    category: "tournaments",
    kind: "bot_reply",
    channel: "telegram",
    recipient: "Владелец клуба",
    trigger: "Callback / сообщение tournament_approve_* или tournament_reject_*",
    implementation: "tournament-approval.ts → handleTournamentApproval*",
    hasButtons: false,
    triggeredBy: ["tournament-approval-request"],
    examplePreview: "✅ Турнир опубликован… / ❌ Публикация отклонена",
  },
  {
    id: "match-start-scheduled",
    title: "Встреча назначена",
    description:
      "Участникам матча при сохранении времени начала в модалке результата на сетке.",
    category: "tournaments",
    kind: "outbound",
    channel: "telegram",
    recipient: "Игроки обеих сторон встречи (с telegramId)",
    trigger: "PATCH /api/tournaments/bracket — поле startedAt у матча",
    implementation: "match-start-notification.ts → notifyMatchStartScheduled()",
    hasButtons: true,
    auditAction: "tournament.match.start.notify",
    examplePreview: "🎱 Встреча назначена… Соперник, начало, кнопка «Открыть турнир»",
    manageable: true,
    templatePlaceholders: [
      "tournamentName",
      "matchNo",
      "opponent",
      "startsAt",
      "clubName",
      "link",
    ],
  },
  {
    id: "tournament-registration-by-club",
    title: "Вас зарегистрировали на турнир",
    description:
      "Игроку, которого владелец клуба добавил в список участников (заявка в статусе «ожидает»).",
    category: "tournaments",
    kind: "outbound",
    channel: "telegram",
    recipient: "Добавленный игрок (player.telegramId)",
    trigger: "POST /api/tournaments/register с source: CLUB; парные — POST /api/tournaments/teams",
    implementation: "tournament-registration-notify.ts → notifyTournamentRegisteredByClub()",
    hasButtons: true,
    auditAction: "tournament.registration.notify.by_club",
    examplePreview:
      "🏆 Вас зарегистрировали на турнир… Клуб, дата, кнопка «Открыть турнир»",
    manageable: true,
    templatePlaceholders: [
      "tournamentName",
      "clubName",
      "cityName",
      "format",
      "startsAt",
      "link",
    ],
  },
  {
    id: "tournament-registration-self",
    title: "Вы зарегистрировались на турнир",
    description: "Игроку после самостоятельной подачи заявки на странице турнира.",
    category: "tournaments",
    kind: "outbound",
    channel: "telegram",
    recipient: "Игрок (player.telegramId)",
    trigger: "POST /api/tournaments/self-register",
    implementation: "tournament-registration-notify.ts → notifyTournamentSelfRegistered()",
    hasButtons: true,
    auditAction: "tournament.registration.notify.self",
    examplePreview:
      "✅ Вы подали заявку на турнир… Ожидайте подтверждения от организатора.",
    manageable: true,
    templatePlaceholders: [
      "tournamentName",
      "clubName",
      "cityName",
      "format",
      "startsAt",
      "link",
    ],
  },
  {
    id: "tournament-registration-confirmed",
    title: "Регистрация на турнир подтверждена",
    description:
      "Игроку после подтверждения заявки организатором в «Заявки на участие».",
    category: "tournaments",
    kind: "outbound",
    channel: "telegram",
    recipient: "Игрок (player.telegramId)",
    trigger:
      "PATCH /api/tournaments/register или teams — CONFIRMED из PENDING или отмена отклонения (REJECTED → CONFIRMED)",
    implementation:
      "tournament-registration-notify.ts → notifyTournamentRegistrationConfirmed()",
    hasButtons: true,
    auditAction: "tournament.registration.notify.confirmed",
    examplePreview: "✅ Регистрация на турнир подтверждена…",
    manageable: true,
    templatePlaceholders: [
      "tournamentName",
      "clubName",
      "cityName",
      "format",
      "startsAt",
      "link",
    ],
  },
  {
    id: "tournament-registration-rejected",
    title: "Заявка на турнир отклонена",
    description:
      "Игроку после отклонения заявки организатором в «Заявки на участие».",
    category: "tournaments",
    kind: "outbound",
    channel: "telegram",
    recipient: "Игрок (player.telegramId)",
    trigger:
      "PATCH /api/tournaments/register или teams — status: REJECTED из PENDING",
    implementation:
      "tournament-registration-notify.ts → notifyTournamentRegistrationRejected()",
    hasButtons: true,
    auditAction: "tournament.registration.notify.rejected",
    examplePreview: "❌ Заявка на турнир отклонена…",
    manageable: true,
    templatePlaceholders: [
      "tournamentName",
      "clubName",
      "cityName",
      "format",
      "startsAt",
      "link",
    ],
  },
  {
    id: "club-booking-new",
    title: "Новая заявка на бронь",
    description: "Клубу приходит заявка игрока или гостя на стол.",
    category: "bookings",
    kind: "outbound",
    channel: "telegram",
    recipient: "Клуб (club.telegramId)",
    trigger: "Создание брони игроком (POST /api/clubs/[id]/bookings)",
    implementation: "club-booking-notify.ts → notifyClubNewBooking()",
    hasButtons: false,
    examplePreview: "🎱 Новая заявка на бронь — имя, телефон, стол, время",
    manageable: true,
    templatePlaceholders: ["clubName", "guest", "phone", "table", "tableHint", "time", "note"],
  },
  {
    id: "idea-moderation-request",
    title: "Новая идея на модерации",
    description:
      "Суперадминам в Telegram: текст идеи и кнопки «Одобрить» / «Отклонить». Получатели: TELEGRAM_ADMIN_IDS или все SUPERADMIN с telegramId.",
    category: "ideas",
    kind: "outbound",
    channel: "telegram",
    recipient: "Суперадмины",
    trigger: "Создание идеи (createIdea)",
    implementation: "idea-moderation.ts → notifyAdminsAboutNewIdea()",
    hasButtons: true,
    auditAction: "idea.submit",
    chainsTo: ["idea-author-approved", "idea-author-rejected", "idea-broadcast"],
    examplePreview: "💡 Новая идея на модерации… Модерация: /admin/ideas",
    manageable: true,
    templatePlaceholders: ["title", "body", "authorLine", "link"],
  },
  {
    id: "idea-author-approved",
    title: "Идея одобрена",
    description: "Автору идеи после одобрения в Telegram или админке.",
    category: "ideas",
    kind: "outbound",
    channel: "telegram",
    recipient: "Автор идеи",
    trigger: "Одобрение идеи (approveIdeaByTelegram / админка)",
    implementation: "idea-moderation.ts → notifyAuthorApproved()",
    hasButtons: false,
    triggeredBy: ["idea-moderation-request"],
    examplePreview: "✅ Ваша идея прошла модерацию…",
  },
  {
    id: "idea-author-rejected",
    title: "Идея отклонена",
    description: "Автору с опциональной причиной.",
    category: "ideas",
    kind: "outbound",
    channel: "telegram",
    recipient: "Автор идеи",
    trigger: "Отклонение идеи",
    implementation: "idea-moderation.ts → notifyAuthorRejected()",
    hasButtons: false,
    triggeredBy: ["idea-moderation-request"],
    examplePreview: "❌ Идея не прошла модерацию…",
  },
  {
    id: "idea-broadcast",
    title: "Новая идея на сайте",
    description:
      "Рассылка всем подтверждённым игрокам (кроме автора) с кнопками голосования.",
    category: "ideas",
    kind: "outbound",
    channel: "telegram",
    recipient: "Все verified игроки с telegramId",
    trigger: "После одобрения идеи",
    implementation: "idea-moderation.ts → broadcastApprovedIdea()",
    hasButtons: true,
    auditAction: "idea.notify.broadcast",
    triggeredBy: ["idea-moderation-request"],
    examplePreview: "💡 Новая идея на billiard.guru… Оцените идею (👍/👎)",
    massBroadcast: true,
    manageable: true,
    templatePlaceholders: ["title", "body", "authorName", "link"],
  },
  {
    id: "idea-moderation-response",
    title: "Ответ модератору по идее",
    description: "Результат нажатия кнопок одобрения/отклонения в боте.",
    category: "ideas",
    kind: "bot_reply",
    channel: "telegram",
    recipient: "Суперадмин",
    trigger: "Callback idea_approve_* / idea_reject_*",
    implementation: "idea-moderation.ts → handleIdeaModerationCallback()",
    hasButtons: false,
    triggeredBy: ["idea-moderation-request"],
    examplePreview: "Готово / ошибка модерации",
  },
  {
    id: "idea-vote-feedback",
    title: "Голос по идее",
    description: "Подтверждение лайка/дизлайка в боте.",
    category: "ideas",
    kind: "bot_reply",
    channel: "telegram",
    recipient: "Игрок",
    trigger: "Callback idea_like_* / idea_dislike_*",
    implementation: "idea-moderation.ts → handleIdeaVoteCallback()",
    hasButtons: false,
    triggeredBy: ["idea-broadcast"],
    examplePreview: "👍 Нравится · 👍 N · 👎 M",
  },
  {
    id: "auth-login-request",
    title: "Подтверждение входа",
    description: "Игроку при входе по телефону на /login — кнопки подтвердить/отменить.",
    category: "auth",
    kind: "outbound",
    channel: "telegram",
    recipient: "Игрок (player.telegramId)",
    trigger: "Запрос входа по телефону (auth-phone-flow → createLoginChallenge)",
    implementation: "login-challenge.ts → createLoginChallenge()",
    hasButtons: true,
    chainsTo: ["auth-login-response"],
    examplePreview: "🔐 Вы входите в личный кабинет…",
    manageable: true,
    /** Игрок не может отключить в /cabinet */
    playerLocked: true,
  },
  {
    id: "auth-login-response",
    title: "Результат входа",
    description: "После нажатия кнопки или ссылки login_* в боте.",
    category: "auth",
    kind: "bot_reply",
    channel: "telegram",
    recipient: "Игрок",
    trigger: "Callback login_confirm_* / login_cancel_*",
    implementation: "login-challenge.ts → handleLoginCallback()",
    hasButtons: false,
    auditAction: "auth.login.confirm",
    triggeredBy: ["auth-login-request"],
    examplePreview: "✅ Вход подтверждён. Вернитесь в браузер. / ❌ Вход отменён",
  },
  {
    id: "registration-deeplink-player",
    title: "Подтверждение игрока (ссылка)",
    description:
      "Сервер не шлёт push: на сайте показывается ссылка t.me/...?start=confirm_<token>. Игрок сам открывает бота.",
    category: "auth",
    kind: "deeplink",
    channel: "telegram",
    recipient: "Новый игрок",
    trigger: "POST /api/players — в ответе confirmLink",
    implementation: "telegram.ts → buildConfirmLink()",
    hasButtons: false,
    chainsTo: ["registration-success-player"],
    examplePreview: "Пользователь переходит в бота по confirm_<uuid>",
  },
  {
    id: "registration-deeplink-club",
    title: "Подтверждение клуба (ссылка)",
    description: "Аналогично игроку — ссылка после регистрации клуба.",
    category: "clubs",
    kind: "deeplink",
    channel: "telegram",
    recipient: "Владелец клуба",
    trigger: "POST /api/clubs или /api/manage/clubs",
    implementation: "telegram.ts → buildConfirmLink()",
    hasButtons: false,
    chainsTo: ["registration-success-club"],
    examplePreview: "confirm_<uuid> в боте",
  },
  {
    id: "registration-success-player",
    title: "Игрок подтверждён",
    description: "После /start confirm_* или кнопки «Подтвердить по телефону».",
    category: "auth",
    kind: "bot_reply",
    channel: "telegram",
    recipient: "Игрок",
    trigger: "Webhook: confirm token или контакт в боте",
    implementation: "telegram-handler.ts → confirmPlayer()",
    hasButtons: false,
    auditAction: "player.telegram.confirm",
    triggeredBy: ["registration-deeplink-player"],
    examplePreview:
      "✅ Регистрация подтверждена! … Вы будете получать уведомления о турнирах",
  },
  {
    id: "registration-success-club",
    title: "Клуб подтверждён",
    description: "После привязки Telegram к клубу.",
    category: "clubs",
    kind: "bot_reply",
    channel: "telegram",
    recipient: "Владелец клуба",
    trigger: "Webhook: confirm token клуба",
    implementation: "telegram-handler.ts → confirmClub()",
    hasButtons: false,
    auditAction: "club.telegram.confirm",
    triggeredBy: ["registration-deeplink-club"],
    examplePreview: "✅ Клуб подтверждён! Управление: billiard.guru/manage",
  },
  {
    id: "bot-start-welcome",
    title: "Приветствие /start",
    description: "Предложение подтвердить номер кнопкой request_contact.",
    category: "bot",
    kind: "bot_reply",
    channel: "telegram",
    recipient: "Любой пользователь бота",
    trigger: "Команда /start (если не verified)",
    implementation: "telegram-handler.ts → promptContactConfirmation()",
    hasButtons: true,
    examplePreview: "👋 billiard.guru… Подтвердить по телефону",
  },
  {
    id: "bot-start-already-verified",
    title: "Уже подтверждён",
    description: "/start для игрока, который уже в базе.",
    category: "bot",
    kind: "bot_reply",
    channel: "telegram",
    recipient: "Игрок",
    trigger: "/start при isVerified",
    implementation: "telegram-handler.ts → sendVerifiedWelcome()",
    hasButtons: true,
    examplePreview: "✅ billiard.guru… Выберите пункт меню",
  },
  {
    id: "bot-profile-summary",
    title: "Мой профиль",
    description: "Данные из личного кабинета: имя, город, телефон, рейтинг, роль.",
    category: "bot",
    kind: "bot_reply",
    channel: "telegram",
    recipient: "Игрок",
    trigger: "Кнопка «👤 Мой Профиль» или /profile",
    implementation: "telegram-bot-menu.ts → handleMyProfile()",
    hasButtons: true,
    examplePreview: "👤 Мой профиль… Открыть кабинет",
  },
  {
    id: "bot-tournaments-summary",
    title: "Мои турниры",
    description: "Список регистраций игрока из кабинета.",
    category: "bot",
    kind: "bot_reply",
    channel: "telegram",
    recipient: "Игрок",
    trigger: "Кнопка «🏆 Мои турниры» или /tournaments",
    implementation: "telegram-bot-menu.ts → handleMyTournaments()",
    hasButtons: true,
    examplePreview: "🏆 Мои турниры…",
  },
  {
    id: "bot-bookings-summary",
    title: "Мои брони",
    description: "Предстоящие брони столов из кабинета.",
    category: "bot",
    kind: "bot_reply",
    channel: "telegram",
    recipient: "Игрок",
    trigger: "Кнопка «🎱 Мои брони» или /bookings",
    implementation: "telegram-bot-menu.ts → handleMyBookings()",
    hasButtons: true,
    examplePreview: "🎱 Мои брони…",
  },
  {
    id: "bot-notifications-summary",
    title: "Уведомления",
    description: "Настройки Telegram-уведомлений с переключением кнопками.",
    category: "bot",
    kind: "bot_reply",
    channel: "telegram",
    recipient: "Игрок",
    trigger: "Кнопка «🔔 Уведомления» или /notifications",
    implementation: "telegram-bot-menu.ts → handleMyNotifications()",
    hasButtons: true,
    examplePreview: "🔔 Уведомления… ✅/❌",
  },
  {
    id: "bot-booking-wizard",
    title: "Бронирование стола",
    description: "Клубы города игрока → формат → дата → время → подтверждение.",
    category: "bot",
    kind: "bot_reply",
    channel: "telegram",
    recipient: "Игрок",
    trigger: "«📅 Забронировать», /book или клуб под «Мои брони»",
    implementation: "telegram-bot-booking.ts → handleBookingCallback()",
    hasButtons: true,
    examplePreview: "📅 Забронировать стол… ✅ Забронировать",
  },
] satisfies NotificationDefinition[];

/** Все допустимые id для dispatchNotification (должны совпадать с каталогом). */
export type NotificationId = NotificationDefinition["id"];

const byId = new Map<string, NotificationDefinition>(
  NOTIFICATION_CATALOG.map((n) => [n.id, n]),
);

export function getNotificationById(id: string): NotificationDefinition | undefined {
  const n = byId.get(id);
  if (!n) return undefined;
  const defaultTemplate = getNotificationDefaultTemplate(id);
  const referenceTemplate = getNotificationReferenceTemplate(id);
  if (!defaultTemplate && !referenceTemplate) return n;
  return {
    ...n,
    ...(defaultTemplate ? { defaultTemplate } : {}),
    ...(referenceTemplate ? { referenceTemplate } : {}),
  };
}

export function listNotificationsByCategory(
  category: NotificationCategory,
): NotificationDefinition[] {
  return NOTIFICATION_CATALOG.filter((n) => n.category === category);
}

export const NOTIFICATION_AUDIT_ACTIONS = [
  ...new Set(
    NOTIFICATION_CATALOG.map((n) => n.auditAction).filter(Boolean) as string[],
  ),
];

/** Цепочки для схемы на странице админки */
export const NOTIFICATION_FLOWS: { title: string; steps: string[] }[] = [
  {
    title: "Публикация турнира",
    steps: [
      "tournament-approval-request",
      "tournament-approval-response",
      "tournament-nearby-announce",
    ],
  },
  {
    title: "Участие в турнире",
    steps: [
      "tournament-registration-by-club",
      "tournament-registration-self",
      "tournament-registration-confirmed",
      "tournament-registration-rejected",
    ],
  },
  {
    title: "Вход в кабинет",
    steps: ["auth-login-request", "auth-login-response"],
  },
  {
    title: "Регистрация игрока",
    steps: ["registration-deeplink-player", "registration-success-player"],
  },
  {
    title: "Регистрация клуба",
    steps: ["registration-deeplink-club", "registration-success-club"],
  },
  {
    title: "Идея",
    steps: [
      "idea-moderation-request",
      "idea-moderation-response",
      "idea-author-approved",
      "idea-broadcast",
      "idea-vote-feedback",
    ],
  },
  {
    title: "Сетка",
    steps: ["match-start-scheduled"],
  },
  {
    title: "Бронь стола",
    steps: ["club-booking-new"],
  },
];
