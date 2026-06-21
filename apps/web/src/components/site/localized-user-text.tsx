"use client";

import { useLocale, useTranslations } from "next-intl";
import { LinkifiedText } from "@/components/site/linkified-text";
import type { AppLocale } from "@/i18n/routing";
import { isRuOnlyOnEn, resolveLocalizedField } from "@/lib/localized-db-text";

type Props = {
  text: string;
  textEn?: string | null;
  className?: string;
  linkify?: boolean;
};

/** Пользовательский текст из БД: на EN при кириллице без перевода — notice. */
export function LocalizedUserText({ text, textEn, className, linkify }: Props) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("detail.ruOnly");
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (isRuOnlyOnEn(locale, trimmed, textEn)) {
    return (
      <p className={className ?? "text-sm italic leading-relaxed text-[var(--text-muted)]"}>
        {t("notice")}
      </p>
    );
  }

  const display = resolveLocalizedField(locale, trimmed, textEn);

  if (linkify) {
    return (
      <p className={className ?? "whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]"}>
        <LinkifiedText text={display} />
      </p>
    );
  }

  return (
    <div className={className ?? "whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]"}>
      {display}
    </div>
  );
}
