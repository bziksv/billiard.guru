"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { PLAYERS_PAGE_SIZES } from "@/lib/public-queries";

const BASE_PATH = "/players";

function buildHref(params: URLSearchParams): string {
  const q = params.toString();
  return q ? `${BASE_PATH}?${q}` : BASE_PATH;
}

export function PlayersSearchBar({ size }: { size: number }) {
  const t = useTranslations("pages.players");
  const router = useRouter();
  const searchParams = useSearchParams();
  // Локальное состояние инициализируется один раз из URL и больше не
  // перезаписывается из searchParams — иначе навигация после дебаунса
  // затирает символы, набранные в процессе.
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushQuery(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = next.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page");
    router.push(buildHref(params));
  }

  function onChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushQuery(next), 500);
  }

  function changeSize(nextSize: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("size", String(nextSize));
    params.delete("page");
    router.push(buildHref(params));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <form
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (debounceRef.current) clearTimeout(debounceRef.current);
          pushQuery(value);
        }}
      >
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="site-input w-full"
          aria-label={t("searchPlaceholder")}
        />
      </form>
      <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <span className="whitespace-nowrap">{t("perPage")}</span>
        <select
          value={size}
          onChange={(e) => changeSize(Number(e.target.value))}
          className="site-input py-1.5"
        >
          {PLAYERS_PAGE_SIZES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const SORT_FIELDS = ["name", "city", "rating", "winrate", "tournaments"] as const;
type PlayersSortField = (typeof SORT_FIELDS)[number];

export function PlayersSortHeader({
  field,
  label,
  align = "end",
}: {
  field: PlayersSortField;
  label: string;
  align?: "start" | "end";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSort = searchParams.get("sort") ?? "";
  const currentField: PlayersSortField = (
    SORT_FIELDS as readonly string[]
  ).includes(rawSort)
    ? (rawSort as PlayersSortField)
    : "rating";
  const currentDir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const active = currentField === field;
  const nextDir = active && currentDir === "desc" ? "asc" : "desc";

  function sort() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", field);
    if (nextDir === "asc") params.set("dir", "asc");
    else params.delete("dir");
    params.delete("page");
    router.push(buildHref(params));
  }

  return (
    <button
      type="button"
      onClick={sort}
      className={`inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 ${
        align === "end" ? "ml-auto" : ""
      } ${active ? "text-emerald-600 dark:text-emerald-400" : ""}`}
    >
      {label}
      <span aria-hidden className="text-xs">
        {active ? (currentDir === "desc" ? "↓" : "↑") : "↕"}
      </span>
    </button>
  );
}

export function PlayersPagination({
  page,
  pageCount,
  from,
  to,
  total,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
}) {
  const t = useTranslations("pages.players");
  const router = useRouter();
  const searchParams = useSearchParams();

  function goTo(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    router.push(buildHref(params));
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <span className="text-sm text-[var(--text-muted)]">
        {t("showing", { from, to, total })}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            className="site-btn-ghost px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← {t("prev")}
          </button>
          <span className="text-sm text-[var(--text-muted)]">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page >= pageCount}
            className="site-btn-ghost px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("next")} →
          </button>
        </div>
      )}
    </div>
  );
}
