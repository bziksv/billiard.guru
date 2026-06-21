"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

import { isEnContentReady } from "@/i18n/en-ready-paths";

type Props = {
  children: React.ReactNode;
};

export function EnLocaleContentGuard({ children }: Props) {
  const locale = useLocale();
  const pathname = usePathname();
  const normalized = pathname === "" ? "/" : pathname;

  if (locale === "en" && !isEnContentReady(normalized)) {
    return <EnNotAvailableClient ruPath={normalized} />;
  }

  return children;
}

function EnNotAvailableClient({ ruPath }: { ruPath: string }) {
  const t = useTranslations("enUnavailable");
  const router = useRouter();

  return (
    <div className="site-container py-16">
      <div className="site-card mx-auto max-w-lg p-8 text-center">
        <h1 className="site-section-title text-xl">{t("title")}</h1>
        <p className="guide-body-text mt-3 text-sm leading-relaxed">{t("body")}</p>
        <button
          type="button"
          className="site-btn-primary mt-6 inline-flex"
          onClick={() => router.replace(ruPath, { locale: "ru" })}
        >
          {t("cta")}
        </button>
      </div>
    </div>
  );
}

export function LocaleSwitcher({
  className,
  variant = "header",
}: {
  className?: string;
  variant?: "header" | "footer";
}) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("locale");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function switchTo(next: AppLocale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    setOpen(false);
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      ref={ref}
      className={cn(
        "site-locale-switcher relative shrink-0",
        variant === "footer" && "w-full",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "site-locale-trigger",
          open && "site-locale-trigger-open",
          variant === "footer" && "site-locale-trigger-footer",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("switch")}
      >
        <span className="site-locale-trigger-label">
          {variant === "header" ? locale.toUpperCase() : t(locale as "ru" | "en")}
        </span>
        <span className="site-locale-trigger-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          className={cn(
            "site-popover site-locale-popover top-full",
            variant === "footer" ? "left-0 right-0" : "right-0",
          )}
          role="listbox"
          aria-label={t("switch")}
        >
          {routing.locales.map((loc) => (
            <button
              key={loc}
              type="button"
              role="option"
              aria-selected={loc === locale}
              onClick={() => switchTo(loc as AppLocale)}
              className={cn(
                "site-popover-item",
                loc === locale && "site-popover-item-active",
              )}
            >
              {t(loc as "ru" | "en")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
