"use client";

import type { CSSProperties, ReactNode } from "react";
import { BracketStreamLink } from "@/components/bracket/bracket-stream-link";
import { cn } from "@/lib/cn";

export function BracketMatchNumberRow({
  matchNumber,
  tableLabel,
  streamUrl,
  onClick,
  className,
  style,
  numberPrefix = "№",
  rightExtra,
}: {
  matchNumber: number;
  tableLabel?: string | null;
  streamUrl?: string | null;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  numberPrefix?: string;
  rightExtra?: ReactNode;
}) {
  const baseClass = cn(
    "llb-bracket-match__meta bracket-match-number-row grid w-full shrink-0 grid-cols-2 overflow-hidden border-b border-[var(--bracket-row-border)] bg-[var(--bracket-card-bg)] p-0 text-[10px] leading-none text-[var(--bracket-meta-text)]",
    onClick && "bracket-match-meta--clickable cursor-pointer",
    className,
  );

  const cells: ReactNode = (
    <>
      <span className="flex min-h-0 min-w-0 items-center justify-center overflow-hidden border-r border-[var(--bracket-row-border)] px-1">
        <span className="bracket-round-label truncate font-semibold tabular-nums">
          {numberPrefix}
          {matchNumber}
        </span>
      </span>
      <span className="flex min-h-0 min-w-0 items-center justify-end gap-0.5 overflow-hidden px-1">
        <span
          className="min-w-0 flex-1 truncate text-right text-[9px] leading-none"
          title={tableLabel ?? undefined}
        >
          {tableLabel ?? "—"}
        </span>
        {streamUrl && (
          <BracketStreamLink url={streamUrl} className="!h-[14px] !w-[14px] !p-0" />
        )}
        {rightExtra}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        data-bracket-interactive
        onClick={onClick}
        className={baseClass}
        style={style}
        title="Результат встречи"
      >
        {cells}
      </button>
    );
  }

  return (
    <div className={baseClass} style={style}>
      {cells}
    </div>
  );
}
