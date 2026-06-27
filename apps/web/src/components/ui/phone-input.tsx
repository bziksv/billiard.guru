"use client";

import { useEffect, useState } from "react";
import {
  formatNationalDisplay,
  formatPhoneInput,
  getDialCode,
  getPhoneExample,
  isPhoneCountrySupported,
  type PhoneNormalizeResult,
} from "@/lib/phone";
import { formatPhoneValidationError } from "@/lib/phone-validation-errors";
import type { AppLocale } from "@/i18n/routing";

interface PhoneInputProps {
  countryName: string;
  value: string;
  onChange: (e164: string, valid: boolean) => void;
  /** Язык ошибок валидации; по умолчанию ru (admin/manage без next-intl). */
  locale?: AppLocale;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  labels?: {
    phone?: string;
    pickCountryFirst?: string;
    hint?: string;
    accepted?: string;
  };
}

const DEFAULT_LABELS = {
  phone: "Телефон",
  pickCountryFirst: "Сначала выберите страну",
  hint: "Введите номер без кода страны — код подставим автоматически",
  accepted: "Номер принят",
};

export function PhoneInput({
  countryName,
  value,
  onChange,
  locale = "ru",
  name = "phone",
  required,
  disabled,
  labels: labelsProp,
}: PhoneInputProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const countryReady = Boolean(countryName && isPhoneCountrySupported(countryName));
  const [display, setDisplay] = useState("");
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<PhoneNormalizeResult>({
    display: "",
    e164: "",
    valid: false,
  });

  function validationMessage(r: PhoneNormalizeResult): string | undefined {
    if (!r.errorCode) return r.error;
    return formatPhoneValidationError(r.errorCode, r.errorParams ?? {}, locale);
  }

  useEffect(() => {
    if (!countryReady) {
      setDisplay("");
      setResult({ display: "", e164: "", valid: false });
      return;
    }
    if (value) {
      const r = formatPhoneInput(value, countryName);
      setDisplay(formatNationalDisplay(value, countryName));
      setResult(r);
    } else {
      setDisplay("");
      setResult({ display: "", e164: "", valid: false });
    }
  }, [countryName, countryReady, value]);

  function handleChange(raw: string) {
    if (!countryReady) return;
    const r = formatPhoneInput(raw, countryName);
    const national = formatNationalDisplay(raw, countryName);
    setDisplay(national);
    setResult(r);
    onChange(r.e164, r.valid);
  }

  const showError = touched && !result.valid && display.length > 0;
  const showSuccess = result.valid;
  const errorMessage = validationMessage(result);

  const borderClass = showError
    ? "border-red-500 ring-1 ring-red-500/30"
    : showSuccess
      ? "border-emerald-500 ring-1 ring-emerald-500/30"
      : "border-zinc-700 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600/30";

  const exampleNational = countryReady
    ? getPhoneExample(countryName)
        .replace(getDialCode(countryName), "")
        .trim()
    : "";

  return (
    <div>
      <label className="mb-1 block text-sm text-zinc-400">{labels.phone}</label>
      <div
        className={`flex overflow-hidden rounded-lg border bg-zinc-800 transition ${borderClass} ${disabled || !countryReady ? "opacity-50" : ""}`}
      >
        <span className="flex shrink-0 items-center border-r border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-emerald-400">
          {countryReady ? getDialCode(countryName) : "—"}
        </span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={display}
          disabled={disabled || !countryReady}
          placeholder={exampleNational}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setTouched(true)}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-600"
        />
        {showSuccess && (
          <span className="flex items-center px-3 text-emerald-400" aria-hidden>
            ✓
          </span>
        )}
      </div>
      <input
        type="hidden"
        name={name}
        value={result.valid ? result.e164 : ""}
        required={required}
      />
      {!countryReady && (
        <p className="mt-1 text-xs text-zinc-500">{labels.pickCountryFirst}</p>
      )}
      {countryReady && !showError && !showSuccess && (
        <p className="mt-1 text-xs text-zinc-500">{labels.hint}</p>
      )}
      {showError && errorMessage && (
        <p className="mt-1 text-xs text-red-400">{errorMessage}</p>
      )}
      {showSuccess && (
        <p className="mt-1 text-xs text-emerald-400/80">{labels.accepted}</p>
      )}
    </div>
  );
}
