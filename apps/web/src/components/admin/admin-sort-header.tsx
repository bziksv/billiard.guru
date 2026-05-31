"use client";

import { useState } from "react";

export type SortDir = "asc" | "desc";

export function AdminSortHeader<T extends string>({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: T;
  activeKey: T;
  dir: SortDir;
  onSort: (key: T) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  return (
    <th className={`px-4 py-3 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1"
      >
        {label}
        <span className={`text-xs ${active ? "admin-sort-active" : "admin-sort-idle"}`}>
          {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

export function useSortToggle<T extends string>(
  initialKey: T,
  initialDir: SortDir = "desc",
  ascByDefault: T[] = [],
) {
  const [sortKey, setSortKey] = useState(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  function toggleSort(key: T) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(ascByDefault.includes(key) ? "asc" : "desc");
    }
  }

  return { sortKey, sortDir, toggleSort };
}

export function formatAdminDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
