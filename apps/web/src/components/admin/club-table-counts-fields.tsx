"use client";

import {
  CLUB_TABLE_FORMATS,
  type ClubTableCounts,
} from "@/lib/club-table-formats";

export function ClubTableCountsFields({
  values,
  onChange,
}: {
  values: ClubTableCounts;
  onChange: (next: ClubTableCounts) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-400">Форматы столов — укажите количество по каждому типу</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {CLUB_TABLE_FORMATS.map((format) => (
          <label key={format.id} className="flex items-center gap-3 text-sm">
            <span className="min-w-[7.5rem] text-zinc-300">{format.label}</span>
            <input
              type="number"
              min={0}
              max={500}
              name={`tableCount_${format.id}`}
              value={values[format.id] ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                const next = { ...values };
                if (raw === "") {
                  delete next[format.id];
                } else {
                  const n = Number(raw);
                  if (Number.isFinite(n) && n >= 0) next[format.id] = n;
                }
                onChange(next);
              }}
              placeholder="0"
              className="site-input w-20 text-center"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
