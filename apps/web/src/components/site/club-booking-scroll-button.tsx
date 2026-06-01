"use client";

export function ClubBookingScrollButton() {
  function scrollToBooking() {
    document.getElementById("club-booking")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <button
      type="button"
      onClick={scrollToBooking}
      className="club-booking-scroll-btn site-btn-primary w-full"
    >
      Забронировать стол
    </button>
  );
}
