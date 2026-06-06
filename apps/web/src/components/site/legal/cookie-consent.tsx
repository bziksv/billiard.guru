"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SiteContainer } from "@/components/site/site-container";
import { COOKIE_CONSENT_STORAGE_KEY, LEGAL_URLS } from "@/lib/legal";

export function CookieConsentPopup() {
  const [visible, setVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) !== "accepted") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    document.documentElement.classList.add("cookie-consent-visible");

    const updateHeight = () => {
      const height = barRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty(
        "--cookie-consent-bar-height",
        `${height}px`,
      );
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    if (barRef.current) observer.observe(barRef.current);
    window.addEventListener("resize", updateHeight);

    return () => {
      document.documentElement.classList.remove("cookie-consent-visible");
      document.documentElement.style.removeProperty("--cookie-consent-bar-height");
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [visible]);

  function accept() {
    try {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      ref={barRef}
      className="cookie-consent-bar"
      role="dialog"
      aria-labelledby="cookie-consent-desc"
    >
      <SiteContainer className="cookie-consent-bar-inner">
        <p id="cookie-consent-desc" className="cookie-consent-bar-text">
          Этот сайт использует cookie-файлы для настройки рекламы и сбора статистики.
          Оставаясь на сайте, вы соглашаетесь на обработку ваших персональных данных
          в соответствии с нашей{" "}
          <Link href={LEGAL_URLS.cookies} className="cookie-consent-bar-link">
            политикой cookies
          </Link>
          .
        </p>
        <button type="button" onClick={accept} className="cookie-consent-bar-accept">
          Принять
        </button>
      </SiteContainer>
    </div>
  );
}
