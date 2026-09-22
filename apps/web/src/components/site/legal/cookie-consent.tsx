"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { SiteContainer } from "@/components/site/site-container";
import {
  hasClientAnalyticsConsent,
  persistCookieConsentClient,
  syncCookieConsentFromStorage,
} from "@/lib/cookie-consent-client";
import { LEGAL_URLS } from "@/lib/legal";

export function CookieConsentPopup() {
  const t = useTranslations("cookie.consent");
  const [visible, setVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (syncCookieConsentFromStorage() || hasClientAnalyticsConsent()) {
      setVisible(false);
      return;
    }
    setVisible(true);
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
    persistCookieConsentClient();
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
          {t("beforeCookies")}
          <Link href={LEGAL_URLS.cookies} className="cookie-consent-bar-link">
            {t("cookiesLink")}
          </Link>
          {t("afterCookies")}
          <Link
            href={LEGAL_URLS.personalDataConsent}
            className="cookie-consent-bar-link"
          >
            {t("consentLink")}
          </Link>
          {t("midConfirm")}
          <Link href={LEGAL_URLS.privacy} className="cookie-consent-bar-link">
            {t("privacyLink")}
          </Link>
          {t("and")}
          <Link
            href={LEGAL_URLS.recommendationTechnologies}
            className="cookie-consent-bar-link"
          >
            {t("recommendationLink")}
          </Link>
          {t("after")}
        </p>
        <button type="button" onClick={accept} className="cookie-consent-bar-accept">
          {t("accept")}
        </button>
      </SiteContainer>
    </div>
  );
}
