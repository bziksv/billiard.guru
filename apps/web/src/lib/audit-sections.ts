/** Идентификаторы разделов для журнала изменений (хранение 180 дней). */
export const AUDIT_RETENTION_DAYS = 180;

export type AuditSectionId =
  | "club"
  | "floor"
  | "tariffs"
  | "players"
  | "staff"
  | "bookings"
  | "pokatat"
  | "tournaments"
  | "news"
  | "ideas"
  | "admin_clubs"
  | "admin_players"
  | "admin_tournaments"
  | "admin_ideas";

export const AUDIT_SECTION_LABELS: Record<AuditSectionId, string> = {
  club: "Профиль клуба",
  floor: "План зала",
  tariffs: "Тарифы",
  players: "Игроки клуба",
  staff: "Сотрудники",
  bookings: "Брони столов",
  pokatat: "Покатать",
  tournaments: "Турниры",
  news: "Новости",
  ideas: "Идеи",
  admin_clubs: "Клубы (админка)",
  admin_players: "Игроки (админка)",
  admin_tournaments: "Турниры (админка)",
  admin_ideas: "Идеи (админка)",
};

/** Сопоставление action → раздел (для старых записей без поля section). */
export function inferAuditSection(
  action: string,
  entityType: string,
): AuditSectionId | null {
  if (action.startsWith("club_staff.")) return "staff";
  if (action.startsWith("table_booking.") || entityType === "table_booking") return "bookings";
  if (action.startsWith("play_listing.") || entityType === "play_listing") return "pokatat";
  if (
    action.startsWith("club_player_rating.") ||
    action.startsWith("club.player_rating.") ||
    entityType === "club_player_rating"
  ) {
    return "players";
  }
  if (
    action.startsWith("club_news.") ||
    action.startsWith("club.news.") ||
    entityType === "club_news"
  ) {
    return "news";
  }
  if (action.startsWith("idea.") || entityType === "idea") return "ideas";
  if (action.startsWith("tournament.") || entityType === "tournament") return "tournaments";
  if (
    action === "club.update" ||
    action === "club.create" ||
    action === "club.delete" ||
    entityType === "club"
  ) {
    if (action === "club.delete") return "admin_clubs";
    return action.includes("floor") ? "floor" : "club";
  }
  if (action.startsWith("player.")) return "admin_players";
  return null;
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "club.update": "Изменён профиль клуба",
  "club.create": "Создан клуб",
  "club.delete": "Удалён клуб",
  "club_staff.add": "Добавлен сотрудник",
  "club_staff.remove": "Удалён сотрудник",
  "table_booking.create": "Новая бронь",
  "table_booking.manage.club": "Ручная бронь",
  "table_booking.manage.block": "Блокировка стола",
  "table_booking.update": "Изменена бронь",
  "club.player_rating.set": "Добавлен рейтинг игрока",
  "club.player_rating.update": "Изменён рейтинг игрока",
  "club.player_rating.remove": "Удалён рейтинг игрока",
  "club_news.create": "Создана новость",
  "club_news.delete": "Удалена новость",
  "club.news.create": "Создана новость",
  "club.news.delete": "Удалена новость",
  "table_booking.confirmed": "Бронь подтверждена",
  "table_booking.rejected": "Бронь отклонена",
  "table_booking.cancelled": "Бронь отменена",
  "table_booking.note": "Заметка к брони",
  "play_listing.manage.create": "Объявление клуба",
  "play_listing.manage.update": "Изменено объявление",
  "play_listing.manage.delete": "Удалено объявление",
  "play_listing.manage.response": "Ответ на отклик",
  "tournament.create": "Создан турнир",
  "tournament.update": "Изменён турнир",
  "tournament.delete": "Удалён турнир",
  "player.update": "Изменён игрок",
  "player.create": "Создан игрок",
  "idea.approve": "Идея одобрена",
  "idea.reject": "Идея отклонена",
};
