import { TELEGRAM_BOT_USERNAME } from "@/lib/brand";

/** Прямая ссылка: бронь в конкретном клубе без выбора из списка. */
export function buildBookClubLink(clubId: string): string {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=b${clubId}`;
}

export const TELEGRAM_BOOKING_LINK_HINT =
  "Если открылся только профиль — отправьте эту ссылку боту сообщением или нажмите «Start» под ссылкой ещё раз.";
