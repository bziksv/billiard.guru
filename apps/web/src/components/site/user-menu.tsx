"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { t } from "@/lib/site";

export function UserMenu({
  firstName,
  lastName,
  isAdmin,
  manageHref,
}: {
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  manageHref?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const initial = firstName[0]?.toUpperCase() ?? "?";

  const updatePosition = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      const menu = document.getElementById("site-user-menu-popover");
      if (menu?.contains(target)) return;
      setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  async function logout() {
    setOpen(false);
    setLoggingOut(true);
    try {
      await fetch("/api/auth/me", { method: "DELETE" });
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const menu =
    open && menuPos ? (
      <div
        id="site-user-menu-popover"
        className="site-popover site-user-popover fixed z-[200] min-w-[11rem]"
        style={{ top: menuPos.top, right: menuPos.right }}
        role="menu"
      >
        <p className="site-popover-divider sm:hidden">
          {lastName} {firstName}
        </p>
        <Link
          href="/cabinet"
          onClick={() => setOpen(false)}
          className="site-popover-item"
          role="menuitem"
        >
          {t("nav.cabinet")}
        </Link>
        {manageHref && (
          <Link
            href={manageHref}
            onClick={() => setOpen(false)}
            className="site-popover-item site-popover-item-active"
            role="menuitem"
          >
            Управление клубом
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="site-popover-item site-popover-item-active"
            role="menuitem"
          >
            {t("nav.admin")}
          </Link>
        )}
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          role="menuitem"
          className="site-popover-item inline-flex w-full items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loggingOut && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {loggingOut ? "Выход…" : t("nav.logout")}
        </button>
      </div>
    ) : null;

  return (
    <>
      <div ref={ref} className="relative z-[1] shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className={cn("site-user-trigger", open && "site-user-trigger-open")}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span className="site-user-avatar">{initial}</span>
          <span className="site-user-name">
            {lastName} {firstName[0]}.
          </span>
          <span className="hidden text-[10px] text-zinc-500 sm:inline" aria-hidden>
            ▾
          </span>
        </button>
      </div>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
