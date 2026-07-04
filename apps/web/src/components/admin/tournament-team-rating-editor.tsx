"use client";

import { useState } from "react";

/** Привязка рейтинга к шагу 0,5 (рейтинги и фора всегда кратны 0,5). */
function snapRating(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return Math.max(0, Math.round(n * 2) / 2).toFixed(1);
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
  /** Подпись сброса, например «сброс (Σ 4,5)» или «сброс к рейтингу 2,0». */
  resetHint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const hasOverride = ratingOverride != null;
  const effectiveRating = hasOverride ? (ratingOverride as number) : baseRating;
  const inputValue = drafts[teamId] ?? effectiveRating.toFixed(1);

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
    void saveRating(Number(snapRating(effectiveRating + delta)));
  }

  function commitDraft() {
    const raw = drafts[teamId];
    if (raw === undefined) return;
    const snapped = snapRating(raw);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[teamId];
      return next;
    });
    if (snapped === "" || Number(snapped) === effectiveRating) return;
    void saveRating(Number(snapped));
  }

  const isDisabled = disabled || busy;

  return (
    <span
      className="flex flex-wrap items-center gap-1"
      title={
        bracketLocked
          ? "Рейтинг участника (влияет на фору в предстоящих встречах)"
          : "Рейтинг участника для посева"
      }
    >
      <span className="mr-0.5 text-xs text-zinc-500">рейтинг</span>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => stepRating(-0.5)}
        aria-label="Уменьшить на 0,5"
        className="admin-btn admin-btn--outline px-2 py-0.5 text-xs disabled:opacity-50"
      >
        −
      </button>
      <input
        type="number"
        step="0.5"
        min="0"
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
          "w-16 rounded border bg-zinc-900 px-2 py-0.5 text-center text-xs",
          hasOverride
            ? "border-amber-700/60 text-amber-300"
            : "border-zinc-600 text-zinc-100",
        ].join(" ")}
      />
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => stepRating(0.5)}
        aria-label="Увеличить на 0,5"
        className="admin-btn admin-btn--outline px-2 py-0.5 text-xs disabled:opacity-50"
      >
        +
      </button>
      {hasOverride ? (
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => void saveRating(null)}
          title={resetHint ?? `Сбросить к ${baseRating.toFixed(1)}`}
          className="ml-1 text-xs text-zinc-500 underline hover:text-zinc-300 disabled:opacity-50"
        >
          {resetHint ?? `сброс (${baseRating.toFixed(1)})`}
        </button>
      ) : null}
    </span>
  );
}
