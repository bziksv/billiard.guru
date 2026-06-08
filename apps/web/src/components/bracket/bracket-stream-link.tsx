"use client";

import { cn } from "@/lib/cn";

export function BracketStreamLink({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-bracket-interactive
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "bracket-stream-link inline-flex shrink-0 items-center justify-center rounded-md border border-[var(--bracket-row-border)] bg-[var(--bracket-card-bg)] p-0.5 text-[var(--bracket-meta-text)] transition-colors hover:border-emerald-500/60 hover:text-emerald-600",
        className,
      )}
      title="Смотреть трансляцию"
      aria-label="Смотреть трансляцию"
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        <path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h11A2.5 2.5 0 0 1 18 5.5v9A2.5 2.5 0 0 1 15.5 17h-11A2.5 2.5 0 0 1 2 14.5v-9Zm2.5-.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-11Zm2.75 2.9 5.5 3.25a.35.35 0 0 1 0 .6l-5.5 3.25A.35.35 0 0 1 7 14.35V5.65a.35.35 0 0 1 .53-.25Z" />
      </svg>
    </a>
  );
}
