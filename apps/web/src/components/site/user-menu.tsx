"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/site";

export function UserMenu({
  firstName,
  lastName,
  isAdmin,
}: {
  firstName: string;
  lastName: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = firstName[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn("site-user-trigger", open && "site-user-trigger-open")}
        aria-expanded={open}
      >
        <span className="site-user-avatar">{initial}</span>
        <span className="site-user-name">
          {lastName} {firstName[0]}.
        </span>
        <span className="text-[10px] text-zinc-500" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="site-popover right-0 top-full min-w-[10rem]">
          <p className="site-popover-divider sm:hidden">
            {lastName} {firstName}
          </p>
          <Link
            href="/cabinet"
            onClick={() => setOpen(false)}
            className="site-popover-item"
          >
            {t("nav.cabinet")}
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="site-popover-item site-popover-item-active"
            >
              {t("nav.admin")}
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="site-popover-item inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {loggingOut ? "Выход…" : t("nav.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
