"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

function Spinner() {
  return (
    <span
      className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}

export function AsyncTextButton({
  onClick,
  children,
  loadingLabel,
  className,
  variant = "neutral",
  disabled,
}: {
  onClick: () => void | Promise<void>;
  children: ReactNode;
  loadingLabel?: string;
  className?: string;
  variant?: "emerald" | "red" | "neutral";
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading || disabled) return;
    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || disabled}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-60",
        variant === "emerald" && "text-emerald-400",
        variant === "red" && "text-red-400",
        variant === "neutral" && "text-zinc-400",
        className,
      )}
    >
      {loading && <Spinner />}
      {loading ? (loadingLabel ?? "…") : children}
    </button>
  );
}

export function AsyncButton({
  onClick,
  children,
  loadingLabel,
  className,
  disabled,
}: {
  onClick: () => void | Promise<void>;
  children: ReactNode;
  loadingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading || disabled) return;
    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || disabled}
      className={cn("inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60", className)}
    >
      {loading && (
        <span
          className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {loading ? (loadingLabel ?? "…") : children}
    </button>
  );
}
