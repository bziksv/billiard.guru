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
      <header className="bracket-presentation__header flex shrink-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5">
          <span className="bracket-presentation__title truncate">
            {title ?? "Турнирная сетка"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="admin-btn admin-btn--outline shrink-0 px-3 py-1.5 text-sm"
          >
            Выйти · Esc
          </button>
        </div>
        {tabs ? (
          <div className="bracket-presentation__tabs overflow-x-auto px-4 pb-2.5">
            {tabs}
          </div>
        ) : null}
      </header>
      <div
        className={cn(
          "bracket-presentation__content min-h-0 flex-1 overflow-hidden p-2 sm:p-3",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
