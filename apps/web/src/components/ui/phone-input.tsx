"use client";

import { useEffect, useState } from "react";
import {
  formatNationalDisplay,
  formatPhoneInput,
  getDialCode,
  getPhoneExample,
} from "@/lib/phone";

interface PhoneInputProps {
  countryName: string;
  value: string;
  onChange: (e164: string, valid: boolean) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
}

export function PhoneInput({
  countryName,
  value,
  onChange,
  name = "phone",
  required,
  disabled,
}: PhoneInputProps) {
  const [display, setDisplay] = useState("");
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof formatPhoneInput>>({
    display: "",
    e164: "",
    valid: false,
  });

  useEffect(() => {
    if (value) {
      const r = formatPhoneInput(value, countryName);
      setDisplay(formatNationalDisplay(value, countryName));
      setResult(r);
    } else {
      setDisplay("");
      setResult({ display: "", e164: "", valid: false });
    }
  }, [countryName, value]);

  function handleChange(raw: string) {
    const r = formatPhoneInput(raw, countryName);
    const national = formatNationalDisplay(raw, countryName);
    setDisplay(national);
    setResult(r);
    onChange(r.e164, r.valid);
  }

  const showError = touched && !result.valid && display.length > 0;
  const showSuccess = result.valid;

  const borderClass = showError
    ? "border-red-500 ring-1 ring-red-500/30"
    : showSuccess
      ? "border-emerald-500 ring-1 ring-emerald-500/30"
      : "border-zinc-700 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600/30";

  const exampleNational = getPhoneExample(countryName)
    .replace(getDialCode(countryName), "")
    .trim();

  return (
    <div>
      <label className="mb-1 block text-sm text-zinc-400">Телефон</label>
      <div
        className={`flex overflow-hidden rounded-lg border bg-zinc-800 transition ${borderClass} ${disabled ? "opacity-50" : ""}`}
      >
        <span className="flex shrink-0 items-center border-r border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-emerald-400">
          {getDialCode(countryName)}
        </span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={display}
          disabled={disabled || !countryName}
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
      {!countryName && (
        <p className="mt-1 text-xs text-zinc-500">Сначала выберите страну</p>
      )}
      {countryName && !showError && !showSuccess && (
        <p className="mt-1 text-xs text-zinc-500">
          Введите номер без кода страны — код подставим автоматически
        </p>
      )}
      {showError && result.error && (
        <p className="mt-1 text-xs text-red-400">{result.error}</p>
      )}
      {showSuccess && (
        <p className="mt-1 text-xs text-emerald-400/80">Номер принят</p>
      )}
    </div>
  );
}
