"use client";

import { useState } from "react";
import { buildBookClubLink, TELEGRAM_BOOKING_LINK_HINT } from "@/lib/telegram-booking-link";

export function ClubTelegramBookingLink({
  clubId,
  compact = false,
}: {
  clubId: string;
  /** На карточке клуба — короткая кнопка; в кабинете — с копированием и подсказкой */
  compact?: boolean;
}) {
  const link = buildBookClubLink(clubId);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Скопируйте ссылку:", link);
    }
  }

  if (compact) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="club-telegram-booking-link site-btn-secondary w-full text-center"
      >
        Забронировать в Telegram
      </a>
    );
  }

  return (
    <div className="club-telegram-booking-block space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div>
        <p className="text-sm font-medium">Ссылка для Telegram</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Игрок сразу попадёт к бронированию в вашем клубе — без выбора из списка.
          {` ${TELEGRAM_BOOKING_LINK_HINT}`}
        </p>
      </div>
      <code className="block break-all rounded-lg bg-[var(--surface)] px-3 py-2 text-xs">
        {link}
      </code>
      <div className="flex flex-wrap gap-2">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="site-btn-primary px-4 py-2 text-sm"
        >
          Открыть в Telegram
        </a>
        <button type="button" onClick={() => void copyLink()} className="site-btn-secondary px-4 py-2 text-sm">
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
    </div>
  );
}
