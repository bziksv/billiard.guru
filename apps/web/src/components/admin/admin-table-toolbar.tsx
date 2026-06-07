"use client";

import type { ReactNode } from "react";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { cn } from "@/lib/cn";

/** Панель фильтров над таблицей в админке — эталон: /admin/players */
export function AdminTableToolbar({
  children,
  count,
}: {
  children: ReactNode;
  count?: { shown: number; total: number };
}) {
  return (
    <div className="admin-panel mb-4 flex flex-wrap gap-3 p-4">
      {children}
      {count && (
        <p className="admin-muted flex items-end pb-2 text-sm">
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
    <label className="flex min-w-[200px] flex-1 flex-col gap-1">
      <span className="admin-label-xs">Поиск</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="admin-input px-3 py-2 text-sm"
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
      labelClassName="admin-label-xs"
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
  { value: "pending", label: "Не подтверждённые" },
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

export function parseVerifiedStatusFilter(
  value: string | null | undefined,
): VerifiedStatusFilter {
  if (value === "verified" || value === "pending") return value;
  return "all";
}

/** Быстрый фильтр: все / не подтверждённые / подтверждённые. */
export function AdminVerifiedFilterChips({
  value,
  onChange,
  counts,
}: {
  value: VerifiedStatusFilter;
  onChange: (value: VerifiedStatusFilter) => void;
  counts: { all: number; verified: number; pending: number };
}) {
  const items: { value: VerifiedStatusFilter; label: string; count: number }[] = [
    { value: "all", label: "Все", count: counts.all },
    { value: "pending", label: "Не подтверждённые", count: counts.pending },
    { value: "verified", label: "Подтверждённые", count: counts.verified },
  ];

  return (
    <div
      className="flex min-w-[200px] flex-col gap-1"
      role="group"
      aria-label="Статус подтверждения"
    >
      <span className="admin-label-xs">Подтверждение</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
              value === item.value
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "admin-btn border-[var(--admin-border)]",
            )}
          >
            {item.label}
            <span className="ml-1.5 font-mono text-xs opacity-80">({item.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
