"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LEGAL_URLS } from "@/lib/legal";

type PersonalDataConsentCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  className?: string;
};

const linkClassName =
  "text-emerald-700 underline underline-offset-2 hover:text-emerald-600 dark:text-emerald-400";

export function PersonalDataConsentCheckbox({
  checked,
  onChange,
  id = "personal-data-consent",
  className = "",
}: PersonalDataConsentCheckboxProps) {
  const t = useTranslations("legal.consentCheckbox");

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
        {t.rich("text", {
          personalData: (chunks) => (
            <Link
              href={LEGAL_URLS.personalDataConsent}
              className={linkClassName}
              target="_blank"
              rel="noopener noreferrer"
            >
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link
              href={LEGAL_URLS.privacy}
              className={linkClassName}
              target="_blank"
              rel="noopener noreferrer"
            >
              {chunks}
            </Link>
          ),
        })}
      </span>
    </label>
  );
}
