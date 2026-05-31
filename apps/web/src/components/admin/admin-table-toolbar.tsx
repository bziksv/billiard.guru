"use client";

import type { ReactNode } from "react";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";

/** Панель фильтров над таблицей в админке — эталон: /admin/players */
export function AdminTableToolbar({
  children,
  count,
}: {
  children: ReactNode;
  count?: { shown: number; total: number };
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      {children}
      {count && (
        <p className="flex items-end pb-2 text-sm text-zinc-500">
          {count.shown} из {count.total}
        </p>
      )}
    </div>
  );
}

export function AdminTableSearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-zinc-500">
      Поиск
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
      />
    </label>
  );
}

/** SearchableSelect с этalon-стилями для панели фильтров */
export function AdminFilterSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
}: {
  label: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  return (
    <SearchableSelect
      label={label}
      labelClassName="text-xs text-zinc-500"
      className="min-w-[160px]"
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? "Все"}
      searchPlaceholder={searchPlaceholder ?? `${label}…`}
    />
  );
}

export const VERIFIED_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Все" },
  { value: "verified", label: "Подтверждённые" },
  { value: "pending", label: "Ожидают" },
] as const;

export type VerifiedStatusFilter = (typeof VERIFIED_STATUS_FILTER_OPTIONS)[number]["value"];

export function matchesVerifiedFilter(
  isVerified: boolean,
  filter: VerifiedStatusFilter,
): boolean {
  if (filter === "verified") return isVerified;
  if (filter === "pending") return !isVerified;
  return true;
}
