"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

function useIsMobileMenu() {
  const [mobile, setMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setMobile(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return mobile;
}

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
  const t = useTranslations();
  const router = useRouter();
  const isMobile = useIsMobileMenu();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ignoreOutsideRef = useRef(false);
  const initial = firstName[0]?.toUpperCase() ?? "?";
  const shortLabel = `${lastName} ${firstName[0]}.`;
  const fullName = `${lastName} ${firstName}`;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onScroll() {
      setOpen(false);
    }
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  useEffect(() => {
    if (!open || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || isMobile) return;
    function onPointerDown(e: PointerEvent) {
      if (ignoreOutsideRef.current) return;
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      const menu = document.getElementById("site-user-menu-popover");
      if (menu?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, isMobile]);

  function close() {
    setOpen(false);
  }

  function toggleOpen() {
    setOpen((v) => {
      const next = !v;
      if (next) {
        ignoreOutsideRef.current = true;
        requestAnimationFrame(() => {
          ignoreOutsideRef.current = false;
        });
      }
      return next;
    });
  }

  async function logout() {
    close();
    setLoggingOut(true);
    try {
      await fetch("/api/auth/me", { method: "DELETE" });
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const desktopMenu =
    open && !isMobile ? (
      <div
        id="site-user-menu-popover"
        className="site-popover site-user-popover absolute right-0 top-full z-[9997] mt-1.5 min-w-[11rem]"
        role="menu"
      >
        <Link href="/cabinet" onClick={close} className="site-popover-item" role="menuitem">
          {t("nav.cabinet")}
        </Link>
        {manageHref && (
          <Link
            href={manageHref}
            onClick={close}
            className="site-popover-item site-popover-item-active"
            role="menuitem"
          >
            {t("nav.manageClub")}
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            onClick={close}
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
          {loggingOut ? t("nav.loggingOut") : t("nav.logout")}
        </button>
      </div>
    ) : null;

  const mobileMenu =
    mounted && open && isMobile
      ? createPortal(
          <div
            id="site-user-menu-sheet"
            className="site-mobile-nav"
            role="menu"
            aria-labelledby="site-user-menu-heading"
          >
            <div className="site-mobile-nav-panel">
              <header className="site-mobile-nav-header">
                <div>
                  <p id="site-user-menu-heading" className="site-mobile-nav-heading">
                    {t("nav.accountMenu")}
                  </p>
                  <p className="site-mobile-nav-account-name">{fullName}</p>
                </div>
                <button
                  type="button"
                  className="site-mobile-nav-close"
                  aria-label={t("nav.closeMenu")}
                  onClick={close}
                >
                  <span aria-hidden>×</span>
                </button>
              </header>

              <nav className="site-mobile-nav-scroll site-mobile-nav-group">
                <Link href="/cabinet" onClick={close} className="site-mobile-nav-link" role="menuitem">
                  {t("nav.cabinet")}
                </Link>
                {manageHref && (
                  <Link
                    href={manageHref}
                    onClick={close}
                    className="site-mobile-nav-link site-mobile-nav-link-accent"
                    role="menuitem"
                  >
                    {t("nav.manageClub")}
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={close}
                    className="site-mobile-nav-link site-mobile-nav-link-accent"
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
                  className="site-mobile-nav-link text-left disabled:opacity-60"
                >
                  {loggingOut ? t("nav.loggingOut") : t("nav.logout")}
                </button>
              </nav>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={ref} className="site-header-user relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleOpen();
          }}
          className={cn(
            "site-user-trigger touch-manipulation",
            open && "site-user-trigger-open",
          )}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={t("nav.menuFor", { name: fullName })}
        >
          <span className="site-user-avatar">{initial}</span>
          <span className="site-user-name">{shortLabel}</span>
          <span className="site-user-chevron" aria-hidden>
            ▾
          </span>
        </button>
        {desktopMenu}
      </div>
      {mobileMenu}
    </>
  );
}
