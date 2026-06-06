"use client";

import Link from "next/link";
import { LEGAL_URLS } from "@/lib/legal";

type PersonalDataConsentCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  className?: string;
};

export function PersonalDataConsentCheckbox({
  checked,
  onChange,
  id = "personal-data-consent",
  className = "",
}: PersonalDataConsentCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`legal-consent-label flex cursor-pointer items-start gap-2.5 text-sm leading-snug text-[var(--text-secondary)] ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="legal-consent-checkbox mt-0.5 shrink-0"
        required
      />
      <span>
        Нажимая на эту кнопку, я даю своё согласие на{" "}
        <Link
          href={LEGAL_URLS.personalDataConsent}
          className="text-emerald-700 underline underline-offset-2 hover:text-emerald-600 dark:text-emerald-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          обработку персональных данных
        </Link>{" "}
        и соглашаюсь с условиями{" "}
        <Link
          href={LEGAL_URLS.privacy}
          className="text-emerald-700 underline underline-offset-2 hover:text-emerald-600 dark:text-emerald-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          политики конфиденциальности
        </Link>
        .
      </span>
    </label>
  );
}
