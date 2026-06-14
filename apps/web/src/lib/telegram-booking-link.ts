import { TELEGRAM_BOT_USERNAME } from "@/lib/brand";

/** Прямая ссылка: бронь в конкретном клубе без выбора из списка. */
export function buildBookClubLink(clubId: string): string {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=book_${clubId}`;
}
