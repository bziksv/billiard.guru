/** Платная опция: рассылка новости игрокам города в Telegram (см. docs/MONETIZATION.md). */
export const CLUB_NEWS_CITY_BROADCAST_LABEL =
  "Разослать игрокам города в мессенджеры";

export const CLUB_NEWS_CITY_BROADCAST_PAID_HINT =
  "Доступно только по платной подписке клуба (скоро).";

export function clubNewsCityBroadcastAdminShort(requested: boolean): string {
  return requested ? "Рассылка по городу" : "—";
}
