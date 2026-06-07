"use client";

import { useEffect, useState } from "react";

export function BracketFormatLabelEditor({
  adminLabel,
  catalogLabel,
  saving,
  onSave,
  onReset,
}: {
  adminLabel: string;
  catalogLabel: string;
  saving: boolean;
  onSave: (label: string) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(adminLabel);
  const overridden = adminLabel !== catalogLabel;
  const dirty = draft.trim() !== adminLabel;

  useEffect(() => {
    setDraft(adminLabel);
  }, [adminLabel]);

  return (
    <div className="border-t border-[var(--admin-border)] px-4 py-3">
      <label className="block text-xs font-medium text-[var(--admin-text-secondary)]">
        Название в списках
      </label>
      <input
        type="text"
        value={draft}
        maxLength={500}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        className="admin-input mt-1.5 w-full text-sm"
        placeholder={catalogLabel}
      />
      <p className="admin-muted mt-1.5 text-xs">
        {overridden ? (
          <>
            По умолчанию: <span className="text-[var(--admin-text)]">{catalogLabel}</span>
          </>
        ) : (
          "Используется название из каталога. Измените — появится при создании турнира и в карточках."
        )}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={saving || !draft.trim() || !dirty}
          className="admin-btn admin-btn--primary px-2 py-1 text-xs disabled:opacity-50"
          onClick={() => onSave(draft.trim())}
        >
          {saving ? "Сохранение…" : "Сохранить название"}
        </button>
        {overridden && (
          <button
            type="button"
            disabled={saving}
            className="admin-btn admin-btn--outline px-2 py-1 text-xs"
            onClick={onReset}
          >
            Сбросить
          </button>
        )}
      </div>
    </div>
  );
}
