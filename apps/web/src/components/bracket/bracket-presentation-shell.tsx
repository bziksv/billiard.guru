"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AdminHorizontalScroll } from "@/components/admin/admin-horizontal-scroll";
import { cn } from "@/lib/cn";

export function BracketPresentationShell({
  open,
  title,
  onClose,
  tabs,
  toolbar,
  variant = "admin",
  contentClassName,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  /** Вкладки под заголовком (сетка, участники, встречи…). */
  tabs?: ReactNode;
  /** Доп. панель (галки отображения сетки и т.п.). */
  toolbar?: ReactNode;
  variant?: "admin" | "site";
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
    if (variant === "site") {
      document.body.classList.add("bracket-presentation-open");
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove("bracket-presentation-open");
    };
  }, [open, onClose, variant]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "bracket-presentation fixed inset-0 z-50 flex flex-col",
        variant === "admin" ? "admin-app" : "site-bracket-presentation",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Сетка: ${title}` : "Сетка на весь экран"}
    >
      <header
        className={cn(
          "bracket-presentation__header flex shrink-0 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4",
          variant === "site" && "site-bracket-presentation__header",
        )}
      >
        <span
          className={cn(
            "bracket-presentation__title hidden min-w-0 max-w-[min(28vw,14rem)] shrink-0 truncate sm:inline",
            variant === "site" && "site-bracket-presentation__title",
          )}
        >
          {title ?? "Турнирная сетка"}
        </span>
        {tabs ? (
          <AdminHorizontalScroll className="min-w-0 flex-1">
            <div className="flex w-max items-center gap-2 pb-0.5">
              {tabs}
              {toolbar}
            </div>
          </AdminHorizontalScroll>
        ) : toolbar ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 overflow-x-auto pb-0.5">
            {toolbar}
          </div>
        ) : (
          <span
            className={cn(
              "bracket-presentation__title min-w-0 flex-1 truncate sm:hidden",
              variant === "site" && "site-bracket-presentation__title",
            )}
          >
            {title ?? "Турнирная сетка"}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "shrink-0",
            variant === "admin"
              ? "admin-btn admin-btn--outline px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm"
              : "site-btn-secondary px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm",
          )}
        >
          Выйти · Esc
        </button>
      </header>
      <div
        className={cn(
          "bracket-presentation__content min-h-0 flex-1 overflow-hidden p-1.5 sm:p-2",
          variant === "site" && "site-bracket-presentation__content",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
