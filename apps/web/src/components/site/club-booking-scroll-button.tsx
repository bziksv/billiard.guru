"use client";

import { useTranslations } from "next-intl";

export function ClubBookingScrollButton() {
  const t = useTranslations("detail.club");

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
      {t("bookTable")}
    </button>
  );
}
