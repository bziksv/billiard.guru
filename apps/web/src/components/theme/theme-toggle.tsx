"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

function IconSun({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
      aria-hidden
    >
      <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z" />
    </svg>
  );
}

type ThemeToggleProps = {
  className?: string;
  showLabel?: boolean;
  collapsed?: boolean;
  variant?: "site" | "admin";
};

export function ThemeToggle({
  className,
  showLabel = false,
  collapsed = false,
  variant = "site",
}: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  const label = isDark ? "Тёмная тема" : "Светлая тема";
  const nextHint = isDark ? "Включить светлую тему" : "Включить тёмную тему";

  const baseClass =
    variant === "admin"
      ? cn(
          "admin-nav-muted flex w-full items-center rounded-lg text-sm transition-colors",
          collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
        )
      : "site-btn-ghost inline-flex h-9 w-9 items-center justify-center p-0";

  if (!mounted) {
    return (
      <button
        type="button"
        className={cn(baseClass, className)}
        aria-label="Тема"
        disabled
      >
        <IconMoon className="h-5 w-5 opacity-50" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={nextHint}
      aria-label={nextHint}
      className={cn(baseClass, className)}
    >
      {isDark ? (
        <IconMoon className="h-5 w-5 shrink-0" />
      ) : (
        <IconSun className="h-5 w-5 shrink-0" />
      )}
      {showLabel && !collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}
