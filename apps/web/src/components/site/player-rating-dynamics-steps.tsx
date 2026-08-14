"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPreviewDelta, formatPreviewRating } from "@/lib/rating-preview";

const PAGE_SIZE = 8;

export type RatingDynamicsStep = {
  matchId: string;
  at: string;
  opponentId: string;
  opponentIds: string[];
  opponentName: string;
  won: boolean;
  isPair: boolean;
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  opponentRatingBefore: number;
};

function OpponentNameLinks({
  name,
  ids,
}: {
  name: string;
  ids: string[];
}) {
  const parts = name.split(" / ").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <>
      {parts.map((part, i) => {
        const id = ids[i];
        return (
          <span key={`${id ?? part}-${i}`}>
            {i > 0 ? " / " : null}
            {id ? (
              <Link
                href={`/players/${id}`}
                className="hover:text-emerald-500 hover:underline"
              >
                {part}
              </Link>
            ) : (
              part
            )}
          </span>
        );
      })}
    </>
  );
}

export function PlayerRatingDynamicsSteps({
  steps,
}: {
  steps: RatingDynamicsStep[];
}) {
  const t = useTranslations("playerRatingDynamics");
  const locale = useLocale() === "en" ? "en-GB" : "ru-RU";
  const ordered = useMemo(() => [...steps].reverse(), [steps]);
  const pageCount = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const [page, setPage] = useState(0);
  const safePage = Math.min(page, pageCount - 1);
  const slice = ordered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );
  const from = ordered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = Math.min(ordered.length, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("recentTitle")}</h3>
        {pageCount > 1 && (
          <span className="text-xs tabular-nums text-[var(--text-muted)]">
            {t("pageOf", { from, to, total: ordered.length })}
          </span>
        )}
      </div>

      {/* Заголовки колонок — десктоп */}
      <div className="mb-2 hidden grid-cols-[7rem_minmax(0,1fr)_5.5rem_7.5rem] gap-3 px-3 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)] sm:grid">
        <span>{t("colResult")}</span>
        <span>{t("colOpponent")}</span>
        <span className="text-right">{t("colDelta")}</span>
        <span className="text-right">{t("colRating")}</span>
      </div>

      <ul className="space-y-2">
        {slice.map((s) => {
          const up = s.delta > 0;
          const down = s.delta < 0;
          const date = new Date(s.at).toLocaleDateString(locale, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
          const deltaClass = up
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : down
              ? "bg-rose-500/12 text-rose-700 dark:text-rose-300"
              : "bg-[var(--bg-muted)] text-[var(--text-muted)]";
          const opponentIds =
            s.opponentIds.length > 0 ? s.opponentIds : [s.opponentId];

          return (
            <li
              key={`${s.matchId}-${s.won ? "w" : "l"}`}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)]/50 px-3 py-3 sm:grid sm:grid-cols-[7rem_minmax(0,1fr)_5.5rem_7.5rem] sm:items-center sm:gap-3 sm:py-2.5"
            >
              {/* Результат */}
              <div className="mb-2 flex items-center gap-2 sm:mb-0">
                <span
                  className={`inline-flex min-w-[4.5rem] items-center justify-center rounded-lg px-2 py-1 text-xs font-semibold ${
                    s.won
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-500/12 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {s.won ? t("win") : t("loss")}
                </span>
                <span className="text-xs text-[var(--text-muted)] sm:hidden">
                  {date}
                  {s.isPair ? ` · ${t("pair")}` : ""}
                </span>
              </div>

              {/* Соперник */}
              <div className="min-w-0">
                <div className="truncate font-medium leading-tight">
                  <OpponentNameLinks
                    name={s.opponentName}
                    ids={opponentIds}
                  />
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                  <span className="hidden sm:inline">{date}</span>
                  <span className="hidden sm:inline"> · </span>
                  <span>
                    {t("oppRating")}:{" "}
                    <span className="font-mono tabular-nums">
                      {formatPreviewRating(s.opponentRatingBefore)}
                    </span>
                  </span>
                  {s.isPair ? (
                    <span className="hidden sm:inline"> · {t("pair")}</span>
                  ) : null}
                </div>
              </div>

              {/* Мобильная строка цифр */}
              <div className="mt-2 flex items-center justify-between gap-3 sm:contents">
                <div className="sm:text-right">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] sm:hidden">
                    {t("colDelta")}
                  </div>
                  <span
                    className={`inline-flex min-w-[3.75rem] justify-center rounded-lg px-2 py-1 font-mono text-sm font-bold tabular-nums ${deltaClass}`}
                  >
                    {formatPreviewDelta(s.delta)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] sm:hidden">
                    {t("colRating")}
                  </div>
                  <div className="font-mono text-sm tabular-nums leading-tight">
                    <span className="text-[var(--text-muted)]">
                      {formatPreviewRating(s.ratingBefore)}
                    </span>
                    <span className="mx-1 text-[var(--text-muted)]">→</span>
                    <span className="font-semibold">
                      {formatPreviewRating(s.ratingAfter)}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            className="site-btn-ghost rounded-lg px-4 py-2 text-sm disabled:opacity-40"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            ← {t("back")}
          </button>
          <span className="text-xs tabular-nums text-[var(--text-muted)]">
            {t("pageOf", { from, to, total: ordered.length })}
          </span>
          <button
            type="button"
            className="site-btn-ghost rounded-lg px-4 py-2 text-sm disabled:opacity-40"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            {t("forward")} →
          </button>
        </div>
      )}
    </div>
  );
}
