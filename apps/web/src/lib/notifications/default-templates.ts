import type { NotificationId } from "@/lib/notifications/catalog";

/**
 * Шаблоны с {{placeholders}} — показываются в админке и используются как fallback при отправке.
 */
export const NOTIFICATION_DEFAULT_TEMPLATES: Partial<Record<NotificationId, string>> = {
  "tournament-approval-request":
    "🏆 <b>Запрос на публикацию турнира</b>\n\n" +
    "Создан турнир от имени вашего клуба «<b>{{clubName}}</b>»:\n\n" +
    "<b>{{tournamentName}}</b>\n" +
    "{{format}}\n" +
    "{{cityName}} · {{startsAt}}{{description}}\n\n" +
    "Подтвердите публикацию — игрокам в радиусе {{radiusKm}} км уйдёт уведомление.",

  "tournament-nearby-announce":
    "📣 <b>Новый турнир рядом с вами</b>\n\n" +
    "<b>{{tournamentName}}</b>\n" +
    "Клуб: {{clubName}}, {{cityName}}\n" +
    "{{format}}\n" +
    "{{startsAt}}{{description}}\n\n" +
    "Подробнее: {{link}}",

  "match-start-scheduled":
    "🎱 <b>Встреча назначена</b>\n\n" +
    "Турнир: <b>{{tournamentName}}</b>\n" +
    "{{matchNo}}" +
    "Соперник: {{opponent}}\n" +
    "{{ratings}}" +
    "{{handicap}}" +
    "Начало: <b>{{startsAt}}</b>\n" +
    "Клуб: {{clubName}}",

  "tournament-registration-by-club":
    "🏆 <b>Вас зарегистрировали на турнир</b>\n\n" +
    "<b>{{tournamentName}}</b>\n" +
    "Клуб: {{clubName}}{{cityName}}\n" +
    "{{format}}\n" +
    "Начало: {{startsAt}}{{link}}",

  "tournament-registration-self":
    "✅ <b>Вы подали заявку на турнир</b>\n\n" +
    "<b>{{tournamentName}}</b>\n" +
    "Клуб: {{clubName}}{{cityName}}\n" +
    "{{format}}\n" +
    "Начало: {{startsAt}}\n\n" +
    "Ожидайте подтверждения от организатора.{{link}}",

  "tournament-registration-confirmed":
    "✅ <b>Регистрация на турнир подтверждена</b>\n\n" +
    "<b>{{tournamentName}}</b>\n" +
    "Клуб: {{clubName}}{{cityName}}\n" +
    "{{format}}\n" +
    "Начало: {{startsAt}}{{link}}",

  "tournament-registration-rejected":
    "❌ <b>Заявка на турнир отклонена</b>\n\n" +
    "<b>{{tournamentName}}</b>\n" +
    "Клуб: {{clubName}}{{cityName}}\n" +
    "{{format}}\n" +
    "Начало: {{startsAt}}{{link}}",

  "club-booking-new":
    "🎱 Новая заявка на бронь — {{clubName}}\n\n" +
    "👤 {{guest}}\n" +
    "📞 {{phone}}\n" +
    "🪑 {{table}}\n" +
    "{{tableHint}}" +
    "🕐 {{time}}\n" +
    "{{note}}\n\n" +
    "🟢 свободен · 🟠 ожидает · 🔴 занят — на схеме ниже.\n" +
    "Подтвердите кнопками или в разделе «Брони столов».",

  "player-booking-confirmed":
    "✅ <b>Бронь подтверждена</b>\n\n" +
    "<b>{{clubName}}</b>\n" +
    "🪑 {{table}}\n" +
    "{{tableHint}}" +
    "🕐 {{time}}\n\n" +
    "Ждём вас в клубе!{{link}}",

  "player-booking-rejected":
    "❌ <b>Бронь отклонена</b>\n\n" +
    "<b>{{clubName}}</b>\n" +
    "🪑 {{table}}\n" +
    "{{tableHint}}" +
    "🕐 {{time}}\n\n" +
    "Выберите другое время или свяжитесь с клубом.{{link}}",

  "player-booking-cancelled":
    "❌ <b>Бронь отменена клубом</b>\n\n" +
    "<b>{{clubName}}</b>\n" +
    "🪑 {{table}}\n" +
    "{{tableHint}}" +
    "🕐 {{time}}{{link}}",

  "idea-moderation-request":
    "💡 <b>Новая идея на модерации</b>\n\n" +
    "<b>{{title}}</b>\n\n" +
    "{{body}}\n\n" +
    "{{authorLine}}\n\n" +
    "Модерация: {{link}}",

  "idea-broadcast":
    "💡 <b>Новая идея на billiard.guru</b>\n\n" +
    "<b>{{title}}</b>\n\n" +
    "{{body}}\n\n" +
    "Автор: {{authorName}}\n\n" +
    "Оцените идею:",

  "auth-login-request":
    "🔐 <b>billiard.guru</b>\n\n" +
    "Вы входите в личный кабинет.\n" +
    "Если это не вы — нажмите «Отмена».",

  "club-confirm-resend":
    "🏢 <b>Подтвердите клуб на billiard.guru</b>\n\n" +
    "«<b>{{clubName}}</b>»\n\n" +
    "Нажмите кнопку ниже, чтобы подтвердить право владения.",
};

export function getNotificationDefaultTemplate(id: string): string | undefined {
  return NOTIFICATION_DEFAULT_TEMPLATES[id as NotificationId];
}

/** Справочный текст для админки (ответы бота — правка в коде, не в БД). */
export const NOTIFICATION_REFERENCE_TEMPLATES: Partial<Record<NotificationId, string>> = {
  "tournament-approval-response":
    "✅ Турнир «{{tournamentName}}» опубликован на billiard.guru.\n" +
    "Уведомления игрокам поблизости отправляются.\n\n" +
    "❌ Публикация турнира «{{tournamentName}}» отклонена.",
  "idea-moderation-response": "Готово / ошибка модерации (зависит от действия).",
  "idea-vote-feedback": "👍 Нравится · 👍 N · 👎 M",
  "auth-login-response":
    "✅ Вход подтверждён. Вернитесь в браузер.\n\n❌ Вход отменён.",
};

export function getNotificationReferenceTemplate(id: string): string | undefined {
  return NOTIFICATION_REFERENCE_TEMPLATES[id as NotificationId];
}
