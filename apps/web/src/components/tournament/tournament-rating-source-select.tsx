"use client";

import { useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  TOURNAMENT_RATING_SOURCE_OPTIONS,
  tournamentRatingSourceHint,
  type TournamentRatingSource,
} from "@/lib/tournament-rating-display";

const CLUB_WARNING =
  "Рекомендуем использовать общий рейтинг.\n\n" +
  "Клубный рейтинг может отличаться от общего и путать лимит, фору и автопересчёт. " +
  "Общий рейтинг единый для всех турниров и обновляется автоматически при включённом авторейтинге.\n\n" +
  "Всё равно переключить на рейтинг клуба?";

type Props = {
  label?: string;
  value: TournamentRatingSource;
  onChange: (value: TournamentRatingSource) => void;
  disabled?: boolean;
  showHint?: boolean;
};

/** Выбор источника рейтинга: по умолчанию общий; при выборе клуба — предупреждение. */
export function TournamentRatingSourceSelect({
  label = "Источник рейтинга для лимита",
  value,
  onChange,
  disabled,
  showHint = true,
}: Props) {
  const [pendingClub, setPendingClub] = useState(false);

  function handleChange(next: string) {
    const v = next as TournamentRatingSource;
    if (v === "CLUB" && value !== "CLUB") {
      setPendingClub(true);
      return;
    }
    onChange(v);
  }

  return (
    <div className="space-y-2">
      <SearchableSelect
        label={label}
        options={TOURNAMENT_RATING_SOURCE_OPTIONS}
        value={value}
        onChange={handleChange}
        placeholder="Источник"
        searchPlaceholder="Источник…"
        disabled={disabled}
      />
      {showHint && (
        <p className="admin-muted text-xs">{tournamentRatingSourceHint(value)}</p>
      )}

      {pendingClub && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="club-rating-warn-title"
        >
          <div className="admin-card max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto p-6 shadow-xl">
            <h2
              id="club-rating-warn-title"
              className="text-lg font-semibold text-[var(--admin-notify-test-banner-text)]"
            >
              Лучше использовать общий рейтинг
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--admin-text-secondary)]">
              {CLUB_WARNING}
            </p>
            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                type="button"
                className="admin-btn admin-btn--primary px-4 py-2.5 text-sm"
                onClick={() => setPendingClub(false)}
              >
                Оставить общий
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--outline px-4 py-2.5 text-sm"
                onClick={() => {
                  setPendingClub(false);
                  onChange("CLUB");
                }}
              >
                Всё равно рейтинг клуба
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
