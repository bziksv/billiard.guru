"use client";

import { useEffect, useState } from "react";
import {
  getDefaultBracketParticipantRules,
  type BracketParticipantRules,
} from "@/lib/bracket-participant-rules";

function initialExactMode(
  participantExact: number | null,
  participantMin: number | null,
  participantMax: number | null,
  defaults: ReturnType<typeof getDefaultBracketParticipantRules>,
): boolean {
  if (participantExact !== null) return true;
  if (participantMin !== null || participantMax !== null) return false;
  return defaults.exact !== undefined;
}

export function BracketParticipantLimitEditor({
  formatCode,
  participantMin,
  participantMax,
  participantExact,
  participantRules,
  saving,
  onSave,
  onReset,
}: {
  formatCode: string;
  participantMin: number | null;
  participantMax: number | null;
  participantExact: number | null;
  participantRules: BracketParticipantRules;
  saving: boolean;
  onSave: (payload: {
    participantMin: number | null;
    participantMax: number | null;
    participantExact: number | null;
  }) => void | Promise<void>;
  onReset: () => void | Promise<void>;
}) {
  const defaults = getDefaultBracketParticipantRules(formatCode);
  const hasCustom =
    participantMin !== null ||
    participantMax !== null ||
    participantExact !== null;

  const [exactMode, setExactMode] = useState(() =>
    initialExactMode(participantExact, participantMin, participantMax, defaults),
  );
  const [exact, setExact] = useState(
    String(participantExact ?? defaults.exact ?? defaults.min),
  );
  const [min, setMin] = useState(String(participantMin ?? defaults.min));
  const [max, setMax] = useState(String(participantMax ?? defaults.max));

  // Синхронизация только после сохранения на сервере — не сбрасываем локальный режим.
  useEffect(() => {
    if (participantExact !== null) {
      setExactMode(true);
      setExact(String(participantExact));
      return;
    }
    if (participantMin !== null || participantMax !== null) {
      setExactMode(false);
      if (participantMin !== null) setMin(String(participantMin));
      if (participantMax !== null) setMax(String(participantMax));
      return;
    }
    setExact(String(defaults.exact ?? defaults.min));
    setMin(String(defaults.min));
    setMax(String(defaults.max));
  }, [
    formatCode,
    participantMin,
    participantMax,
    participantExact,
    defaults.exact,
    defaults.min,
    defaults.max,
  ]);

  function handleSave() {
    if (exactMode) {
      const n = Number.parseInt(exact, 10);
      if (!Number.isFinite(n) || n < 2) return;
      onSave({ participantMin: null, participantMax: null, participantExact: n });
      return;
    }
    const minN = Number.parseInt(min, 10);
    const maxN = Number.parseInt(max, 10);
    if (!Number.isFinite(minN) || !Number.isFinite(maxN) || minN < 2 || maxN < minN) {
      return;
    }
    onSave({
      participantMin: minN,
      participantMax: maxN,
      participantExact: null,
    });
  }

  return (
    <div
      className="border-t border-[var(--admin-border)] px-4 py-3"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="admin-label-xs mb-2">Участники при формировании</p>
      <p className="admin-muted mb-3 text-xs">
        Сейчас: <span className="text-[var(--admin-text)]">{participantRules.label}</span>
        {!hasCustom && " (по умолчанию)"}
      </p>

      <div className="space-y-2">
        <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
          <input
            type="radio"
            name={`participant-mode-${formatCode}`}
            value="exact"
            checked={exactMode}
            onChange={() => setExactMode(true)}
            className="h-4 w-4 shrink-0 accent-[var(--admin-accent)]"
          />
          <span className="text-xs">Ровно</span>
          <input
            type="number"
            min={2}
            max={128}
            value={exact}
            disabled={!exactMode}
            onChange={(e) => setExact(e.target.value)}
            onFocus={() => setExactMode(true)}
            className="admin-input w-16 px-2 py-1 text-sm tabular-nums disabled:opacity-40"
          />
        </label>

        <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
          <input
            type="radio"
            name={`participant-mode-${formatCode}`}
            value="range"
            checked={!exactMode}
            onChange={() => setExactMode(false)}
            className="h-4 w-4 shrink-0 accent-[var(--admin-accent)]"
          />
          <span className="text-xs">Диапазон</span>
          <input
            type="number"
            min={2}
            max={128}
            value={min}
            disabled={exactMode}
            onChange={(e) => setMin(e.target.value)}
            onFocus={() => setExactMode(false)}
            className="admin-input w-16 px-2 py-1 text-sm tabular-nums disabled:opacity-40"
            aria-label="Минимум участников"
          />
          <span className="admin-muted text-xs">—</span>
          <input
            type="number"
            min={2}
            max={128}
            value={max}
            disabled={exactMode}
            onChange={(e) => setMax(e.target.value)}
            onFocus={() => setExactMode(false)}
            className="admin-input w-16 px-2 py-1 text-sm tabular-nums disabled:opacity-40"
            aria-label="Максимум участников"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="admin-btn admin-btn--outline px-3 py-1 text-xs"
        >
          {saving ? "…" : "Сохранить"}
        </button>
        {hasCustom && (
          <button
            type="button"
            disabled={saving}
            onClick={onReset}
            className="admin-link text-xs"
          >
            Сбросить
          </button>
        )}
      </div>
    </div>
  );
}
