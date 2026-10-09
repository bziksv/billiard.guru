"use client";

import { useMemo, useState } from "react";
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
  /** Рейтинг соперника на старт встречи; null если в журнале нет. */
  opponentRatingBefore: number | null;
};

export type RatingDynamicsStepLabels = {
  recentTitle: string;
  colResult: string;
  colOpponent: string;
  colDelta: string;
  colRating: string;
  oppRating: string;
  win: string;
  loss: string;
  pair: string;
  back: string;
  forward: string;
  /** Шаблон с плейсхолдерами {from}, {to}, {total}. */
  pageOfTemplate: string;
  dateLocale: string;
};

function formatPageOf(
  template: string,
  from: number,
  to: number,
  total: number,
): string {
  return template
    .replaceAll("{from}", String(from))
    .replaceAll("{to}", String(to))
    .replaceAll("{total}", String(total));
}

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
  labels,
}: {
  steps: RatingDynamicsStep[];
  labels: RatingDynamicsStepLabels;
}) {
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
        <h3 className="text-sm font-semibold">{labels.recentTitle}</h3>
        {pageCount > 1 && (
          <span className="text-xs tabular-nums text-[var(--text-muted)]">
            {formatPageOf(labels.pageOfTemplate, from, to, ordered.length)}
          </span>
        )}
      </div>

      <div className="rating-dynamics-head">
        <span>{labels.colResult}</span>
        <span>{labels.colOpponent}</span>
        <span className="text-right">{labels.colDelta}</span>
        <span className="text-right">{labels.colRating}</span>
      </div>

      <ul className="space-y-2">
        {slice.map((s) => {
          const up = s.delta > 0;
          const down = s.delta < 0;
          const date = new Date(s.at).toLocaleDateString(labels.dateLocale, {
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
              className="rating-dynamics-row"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex min-w-[4.5rem] items-center justify-center rounded-lg px-2 py-0.5 text-xs font-semibold ${
                    s.won
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-500/12 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {s.won ? labels.win : labels.loss}
                </span>
                <span className="rating-dynamics-row__mobile-date text-xs text-[var(--text-muted)]">
                  {date}
                  {s.isPair ? ` · ${labels.pair}` : ""}
                </span>
              </div>

              <div className="min-w-0">
                <div className="truncate font-medium leading-snug">
                  <OpponentNameLinks
                    name={s.opponentName}
                    ids={opponentIds}
                  />
                </div>
                <div className="mt-0.5 text-xs leading-snug text-[var(--text-muted)]">
                  <span className="rating-dynamics-row__desktop-date">{date}</span>
                  {s.opponentRatingBefore != null ? (
                    <>
                      <span className="rating-dynamics-row__desktop-date">
                        {" "}
                        ·{" "}
                      </span>
                      <span>
                        {labels.oppRating}:{" "}
                        <span className="font-mono tabular-nums">
                          {formatPreviewRating(s.opponentRatingBefore)}
                        </span>
                      </span>
                    </>
                  ) : null}
                  {s.isPair ? (
                    <span className="rating-dynamics-row__desktop-date">
                      {" "}
                      · {labels.pair}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="rating-dynamics-row__stat">
                <span className="rating-dynamics-row__mobile-label text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  {labels.colDelta}
                </span>
                <span
                  className={`inline-flex min-w-[3.5rem] justify-center rounded-lg px-2 py-0.5 font-mono text-sm font-bold tabular-nums ${deltaClass}`}
                >
                  {formatPreviewDelta(s.delta)}
                </span>
              </div>

              <div className="rating-dynamics-row__stat">
                <span className="rating-dynamics-row__mobile-label text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  {labels.colRating}
                </span>
                <div className="font-mono text-sm tabular-nums leading-snug">
                  <span className="text-[var(--text-muted)]">
                    {formatPreviewRating(s.ratingBefore)}
                  </span>
                  <span className="mx-1 text-[var(--text-muted)]">→</span>
                  <span className="font-semibold">
                    {formatPreviewRating(s.ratingAfter)}
                  </span>
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
            ← {labels.back}
          </button>
          <span className="text-xs tabular-nums text-[var(--text-muted)]">
            {formatPageOf(labels.pageOfTemplate, from, to, ordered.length)}
          </span>
          <button
            type="button"
            className="site-btn-ghost rounded-lg px-4 py-2 text-sm disabled:opacity-40"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            {labels.forward} →
          </button>
        </div>
      )}
    </div>
  );
}
