"use client";

import { useMemo } from "react";
import { BracketScrollCenter } from "@/components/bracket/bracket-scroll-center";
import {
  bracketCanvasClassName,
  bracketShellClassName,
  bracketViewRootClassName,
} from "@/lib/bracket-canvas-class";
import { cn } from "@/lib/cn";
import type { BracketMatchView } from "@/lib/bracket-view";
import { isMatchResolved } from "@/lib/match-result";
import excelRef from "@/lib/excel-bracket-64-reference.json";
import {
  buildExcelBracketLayout,
  excelColHeaderLeft,
  type ExcelMatchRef,
} from "@/lib/excel-bracket-layout";
import { teamLabel } from "@/lib/pair-tournament";
import {
  GRID_CARD_W,
  GRID_META_H,
  GRID_PAD,
  GRID_ROW_H,
} from "@/lib/swiss-bracket-layout";

function ExcelMatchCard({
  refMatch,
  live,
  onMatchClick,
}: {
  refMatch: ExcelMatchRef;
  live?: BracketMatchView;
  onMatchClick?: (match: BracketMatchView) => void;
}) {
  const footerLines = refMatch.footer
    ? refMatch.footer.split(",").map((s) => s.trim())
    : [];
  const interactive = Boolean(live && onMatchClick);
  const finished = live ? isMatchResolved(live.status, live.winnerTeamId) : false;
  const winnerId = live?.winnerTeamId ?? null;
  const team1Wins = winnerId === live?.team1?.id;
  const team2Wins = winnerId === live?.team2?.id;

  const row1 =
    live?.team1 != null
      ? teamLabel(live.team1)
      : refMatch.seed1 != null
        ? `#${refMatch.seed1}`
        : "—";
  const row2 =
    live?.team2 != null
      ? teamLabel(live.team2)
      : refMatch.seed2 != null
        ? `#${refMatch.seed2}`
        : "—";

  const body = (
    <>
      <div className="llb-bracket-match__meta flex items-center justify-between px-2 font-mono text-[11px] tabular-nums">
        <span>#{refMatch.no}</span>
        {finished && (
          <span className="text-[10px] text-[var(--bracket-meta-text)]">✓</span>
        )}
      </div>
      <div
        className={cn(
          "flex w-full items-center border-b border-[var(--bracket-row-border)] px-2 text-[12px]",
          team1Wins && "bg-[var(--bracket-row-winner-bg)] text-[var(--bracket-row-winner-text)]",
          !team1Wins && live?.team1 && "text-[var(--bracket-row-text)]",
          !live?.team1 && "text-[var(--bracket-row-text)]",
        )}
        style={{ height: GRID_ROW_H }}
      >
        <span className="truncate">{row1}</span>
      </div>
      <div
        className={cn(
          "flex w-full items-center px-2 text-[12px]",
          team2Wins && "bg-[var(--bracket-row-winner-bg)] text-[var(--bracket-row-winner-text)]",
          !team2Wins && live?.team2 && "text-[var(--bracket-row-text)]",
          !live?.team2 && "text-[var(--bracket-row-text)]",
        )}
        style={{ height: GRID_ROW_H }}
      >
        <span className="truncate">{row2}</span>
      </div>
      {footerLines.length > 0 && (
        <div className="border-t border-[var(--bracket-row-border)] px-2 py-1 text-[10px] leading-tight text-[var(--bracket-meta-text)]">
          {footerLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      )}
    </>
  );

  if (interactive && live) {
    return (
      <button
        type="button"
        data-bracket-interactive
        className="bracket-match-card llb-bracket-match w-full cursor-pointer text-left transition-colors hover:bg-emerald-950/20"
        style={{ width: GRID_CARD_W }}
        onClick={() => onMatchClick?.(live)}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      className="bracket-match-card llb-bracket-match select-none"
      style={{ width: GRID_CARD_W }}
    >
      {body}
    </div>
  );
}

function linkPath(
  from: { x: number; y: number; width: number; height: number },
  to: { x: number; y: number; width: number; height: number },
) {
  const x1 = from.x + from.width;
  const y1 = from.y + from.height / 2;
  const x2 = to.x;
  const y2 = to.y + to.height / 2;
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
}

export function ExcelBracketView({
  liveByMatchNo,
  onMatchClick,
  presentation = false,
}: {
  liveByMatchNo?: Map<number, BracketMatchView>;
  onMatchClick?: (match: BracketMatchView) => void;
  presentation?: boolean;
} = {}) {
  const refMatches = excelRef.matches as ExcelMatchRef[];
  const layout = useMemo(() => buildExcelBracketLayout(refMatches), [refMatches]);

  return (
    <div className={bracketViewRootClassName(presentation)}>
    <div className={cn(bracketShellClassName(presentation), presentation && "min-h-0 flex-1")}>
      <BracketScrollCenter
        centerX={layout.centerX}
        contentHeight={layout.totalHeight}
        contentScrollY={presentation ? "start" : "center"}
        className={bracketCanvasClassName({ presentation })}
      >
        <div
          className="relative"
          style={{ width: layout.totalWidth, height: layout.totalHeight }}
        >
          {layout.colOrder.map((excelCol) => {
            const left = excelColHeaderLeft(excelCol);
            const label = layout.colLabels[String(excelCol)];
            if (left == null || !label) return null;
            return (
              <div
                key={excelCol}
                className="pointer-events-none absolute text-[10px] leading-tight text-[var(--bracket-meta-text)]"
                style={{ left, top: GRID_PAD, width: GRID_CARD_W }}
              >
                {label}
              </div>
            );
          })}

          <svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            width={layout.totalWidth}
            height={layout.totalHeight}
            aria-hidden
          >
            {layout.links.map(({ from, to }) => {
              const fp = layout.positions.get(from);
              const tp = layout.positions.get(to);
              if (!fp || !tp) return null;
              return (
                <path
                  key={`${from}-${to}`}
                  d={linkPath(fp, tp)}
                  fill="none"
                  stroke="var(--bracket-edge-loss, #f87171)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  opacity={0.75}
                />
              );
            })}
          </svg>

          {refMatches.map((m) => {
            const pos = layout.positions.get(m.no);
            if (!pos) return null;
            const live = liveByMatchNo?.get(m.no);
            return (
              <div
                key={m.no}
                className="absolute z-10"
                style={{ left: pos.x, top: pos.y, width: pos.width }}
              >
                <ExcelMatchCard
                  refMatch={m}
                  live={live}
                  onMatchClick={onMatchClick}
                />
              </div>
            );
          })}
        </div>
      </BracketScrollCenter>
    </div>
    </div>
  );
}
