"use client";

import {
  TOURNAMENT_DISCIPLINES,
  gameTypesForDiscipline,
} from "@/lib/tournament-discipline";

export function DisciplinePicker({
  discipline,
  gameType,
  onChange,
  className,
  selectClassName = "site-input w-full",
  required = false,
}: {
  discipline: string | null;
  gameType: string | null;
  onChange: (discipline: string | null, gameType: string | null) => void;
  className?: string;
  selectClassName?: string;
  required?: boolean;
}) {
  const subtypes = gameTypesForDiscipline(discipline);
  const mark = required ? <span className="text-rose-500"> *</span> : null;

  return (
    <div className={className ?? "grid gap-3 sm:grid-cols-2"}>
      <label className="block">
        <span className="mb-1 block text-xs text-zinc-500">
          Тип игры (дисциплина){mark}
        </span>
        <select
          value={discipline ?? ""}
          onChange={(e) => onChange(e.target.value || null, null)}
          className={selectClassName}
        >
          <option value="">Не указана</option>
          {TOURNAMENT_DISCIPLINES.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-zinc-500">Вид игры{mark}</span>
        <select
          value={gameType ?? ""}
          disabled={subtypes.length === 0}
          onChange={(e) => onChange(discipline, e.target.value || null)}
          className={selectClassName}
        >
          <option value="">{subtypes.length === 0 ? "—" : "Не указан"}</option>
          {subtypes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.ru}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
