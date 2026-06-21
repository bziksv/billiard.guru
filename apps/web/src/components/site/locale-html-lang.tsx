"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/** Синхронизирует `<html lang>` с активной локалью (root layout статичен). */
export function LocaleHtmlLang() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
