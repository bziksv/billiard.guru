"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export function BracketPresentationShell({
  open,
  title,
  onClose,
  tabs,
  contentClassName,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  /** Вкладки под заголовком (сетка, участники, встречи…). */
  tabs?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn("admin-app bracket-presentation fixed inset-0 z-40 flex flex-col")}
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Сетка: ${title}` : "Сетка на весь экран"}
    >
      <header className="bracket-presentation__header flex shrink-0 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <span className="bracket-presentation__title hidden min-w-0 max-w-[min(28vw,14rem)] shrink-0 truncate sm:inline">
          {title ?? "Турнирная сетка"}
        </span>
        {tabs ? (
          <div className="min-w-0 flex-1 overflow-x-auto">{tabs}</div>
        ) : (
          <span className="bracket-presentation__title min-w-0 flex-1 truncate sm:hidden">
            {title ?? "Турнирная сетка"}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="admin-btn admin-btn--outline shrink-0 px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm"
        >
          Выйти · Esc
        </button>
      </header>
      <div
        className={cn(
          "bracket-presentation__content min-h-0 flex-1 overflow-hidden p-1.5 sm:p-2",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
