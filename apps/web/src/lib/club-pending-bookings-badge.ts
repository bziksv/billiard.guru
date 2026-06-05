/** Событие: страница броней обновила число ожидающих заявок. */
export const CLUB_PENDING_BOOKINGS_EVENT = "setka:club-pending-bookings";

export type ClubPendingBookingsDetail = {
  clubId: string;
  count: number;
};

export function pendingBookingsBadgeLabel(count: number): string | null {
  if (count <= 0) return null;
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  const word =
    n > 10 && n < 20 ? "Броней" : n1 === 1 ? "Бронь" : n1 >= 2 && n1 <= 4 ? "Брони" : "Броней";
  return `+${count} ${word}`;
}

export function dispatchClubPendingBookings(detail: ClubPendingBookingsDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLUB_PENDING_BOOKINGS_EVENT, { detail }));
}
