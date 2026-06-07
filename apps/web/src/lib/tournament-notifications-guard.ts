/** Турнир создан с галкой «без уведомлений» — не слать Telegram по нему. */
export function tournamentNotificationsSuppressed(tournament: {
  suppressNotifications?: boolean | null;
}): boolean {
  return tournament.suppressNotifications === true;
}
