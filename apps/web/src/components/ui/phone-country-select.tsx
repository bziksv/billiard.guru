"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { AppLocale } from "@/i18n/routing";
import { localizedGeoName } from "@/lib/geo-display";
import {
  DEFAULT_PHONE_COUNTRY,
  getDialCode,
  isPhoneCountrySupported,
} from "@/lib/phone";

type GeoCountry = {
  id: string;
  nameRu: string;
  nameEn?: string | null;
};

type PhoneCountrySelectProps = {
  value: string;
  onChange: (countryNameRu: string) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
};

const SITE_INPUT =
  "site-input w-full disabled:cursor-not-allowed disabled:opacity-50";
const SITE_DROPDOWN =
  "geo-searchable-dropdown overflow-auto rounded-xl py-1 shadow-lg";
const SITE_OPTION =
  "geo-searchable-option w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-muted)]";
const SITE_OPTION_SELECTED =
  "geo-searchable-option w-full bg-[var(--bg-muted)] px-3 py-2 text-left text-sm text-emerald-600 dark:text-emerald-400";
const SITE_EMPTY = "px-3 py-2 text-sm text-[var(--text-muted)]";

export function PhoneCountrySelect({
  value,
  onChange,
  label,
  placeholder,
  required,
}: PhoneCountrySelectProps) {
  const locale = useLocale() as AppLocale;
  const tGeo = useTranslations("geo");
  const [countries, setCountries] = useState<GeoCountry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/geo")
      .then((r) => r.json())
      .then((data: GeoCountry[]) => {
        setCountries(data.filter((c) => isPhoneCountrySupported(c.nameRu)));
      })
      .catch(() => setCountries([]))
      .finally(() => setLoading(false));
  }, []);

  const options = useMemo(() => {
    return [...countries]
      .sort((a, b) => {
        if (a.nameRu === DEFAULT_PHONE_COUNTRY) return -1;
        if (b.nameRu === DEFAULT_PHONE_COUNTRY) return 1;
        const labelA = localizedGeoName(a.nameRu, locale, a.nameEn);
        const labelB = localizedGeoName(b.nameRu, locale, b.nameEn);
        return labelA.localeCompare(labelB, locale === "en" ? "en" : "ru");
      })
      .map((country) => {
        const name = localizedGeoName(country.nameRu, locale, country.nameEn);
        const dial = getDialCode(country.nameRu);
        return {
          value: country.nameRu,
          label: `${name} (${dial})`,
          searchText: `${country.nameRu} ${country.nameEn ?? ""} ${dial.replace("+", "")}`,
        };
      });
  }, [countries, locale]);

  return (
    <SearchableSelect
      label={label}
      labelClassName="text-sm text-[var(--text-secondary)]"
      options={options}
      value={value}
      onChange={onChange}
      placeholder={loading ? tGeo("loading") : (placeholder ?? tGeo("country"))}
      searchPlaceholder={tGeo("searchCountry")}
      emptyMessage={loading ? tGeo("loading") : tGeo("noResults")}
      disabled={loading}
      required={required}
      inputClassName={SITE_INPUT}
      dropdownClassName={SITE_DROPDOWN}
      optionClassName={SITE_OPTION}
      selectedOptionClassName={SITE_OPTION_SELECTED}
      emptyClassName={SITE_EMPTY}
    />
  );
}
