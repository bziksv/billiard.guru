"use client";

import { cn } from "@/lib/cn";

export function CoachReviewStars({
  score,
  max = 5,
  size = "md",
  className,
}: {
  score: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const rounded = Math.round(score * 2) / 2;
  const starClass = size === "sm" ? "text-sm" : "text-lg";

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-amber-400", className)} aria-hidden>
      {Array.from({ length: max }, (_, i) => {
        const filled = rounded >= i + 1;
        const half = !filled && rounded >= i + 0.5;
        return (
          <span key={i} className={cn(starClass, !filled && !half && "opacity-25")}>
            {half ? "★" : filled ? "★" : "☆"}
          </span>
        );
      })}
    </span>
  );
}

export function CoachReviewStarInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (score: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1" role="group" aria-label="Оценка от 1 до 5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className={cn(
            "rounded-md px-1 text-2xl leading-none transition",
            value >= star ? "text-amber-400" : "text-zinc-500 hover:text-amber-300",
            disabled && "cursor-not-allowed opacity-50",
          )}
          aria-label={`${star} из 5`}
          aria-pressed={value >= star}
        >
          {value >= star ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
