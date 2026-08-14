"use client";

import { useState } from "react";
import {
  formatRating,
  RATING_EDIT_STEP,
  snapToRatingEditStep,
} from "@/lib/rating";

function snapRatingInput(value: string | number): string {
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return "";
  return formatRating(snapToRatingEditStep(n));
}

export function TournamentTeamRatingEditor({
  teamId,
  baseRating,
  ratingOverride,
  bracketLocked,
  onUpdated,
  disabled = false,
  resetHint,
}: {
  teamId: string;
  baseRating: number;
  ratingOverride?: number | null;
  bracketLocked: boolean;
  onUpdated: () => void | Promise<void>;
  disabled?: boolean;
  /** Подпись сброса, например «к Σ 4.5» или «к 2.2». */
  resetHint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const hasOverride = ratingOverride != null;
  const effectiveRating = hasOverride ? (ratingOverride as number) : baseRating;
  const inputValue = drafts[teamId] ?? formatRating(effectiveRating);
  const baseLabel = formatRating(baseRating);

  async function saveRating(value: number | null) {
    setBusy(true);
    try {
      const res = await fetch("/api/tournaments/pairs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, ratingOverride: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось изменить рейтинг");
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[teamId];
        return next;
      });
      await onUpdated();
    } finally {
      setBusy(false);
    }
  }

  function stepRating(delta: number) {
    void saveRating(snapToRatingEditStep(effectiveRating + delta));
  }

  function commitDraft() {
    const raw = drafts[teamId];
    if (raw === undefined) return;
    const snapped = snapRatingInput(raw);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[teamId];
      return next;
    });
    if (snapped === "" || Number(snapped) === effectiveRating) return;
    void saveRating(Number(snapped));
  }

  const isDisabled = disabled || busy;
  const resetLabel = resetHint ?? `к ${baseLabel}`;

  return (
    <span
      className="inline-flex flex-wrap items-center gap-1.5"
      title={
        bracketLocked
          ? "Рейтинг участника (влияет на фору в предстоящих встречах), шаг 0,05"
          : "Рейтинг участника для посева, шаг 0,05"
      }
    >
      <span className="text-xs font-medium text-zinc-400">рейтинг</span>
      <span className="inline-flex items-center overflow-hidden rounded-md border border-zinc-600 bg-zinc-950">
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => stepRating(-RATING_EDIT_STEP)}
          aria-label={`Уменьшить на ${RATING_EDIT_STEP}`}
          className="px-2.5 py-1 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          −
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          disabled={isDisabled}
          onChange={(e) =>
            setDrafts((prev) => ({
              ...prev,
              [teamId]: e.target.value,
            }))
          }
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={[
            "w-[4.25rem] border-x border-zinc-700 bg-zinc-900 px-2 py-1 text-center font-mono text-sm tabular-nums outline-none",
            hasOverride ? "text-amber-300" : "text-zinc-50",
          ].join(" ")}
        />
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => stepRating(RATING_EDIT_STEP)}
          aria-label={`Увеличить на ${RATING_EDIT_STEP}`}
          className="px-2.5 py-1 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          +
        </button>
      </span>
      {hasOverride ? (
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => void saveRating(null)}
          title={`Сбросить к ${baseLabel}`}
          className="rounded border border-zinc-600 px-2 py-0.5 text-xs text-zinc-300 hover:border-zinc-400 hover:text-zinc-100 disabled:opacity-50"
        >
          {resetLabel}
        </button>
      ) : null}
    </span>
  );
}
