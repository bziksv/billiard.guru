"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { localizedGeoName } from "@/lib/geo-display";
import type { AppLocale } from "@/i18n/routing";

type City = { id: string; nameRu: string; nameEn?: string | null };
type Country = { id: string; nameRu: string; nameEn?: string | null; cities: City[] };

type GeoFilterProps = {
  basePath: string;
  /** Профиль / серверный geo, если в URL нет countryId/cityId */
  initialCountryId?: string;
  initialCityId?: string;
  variant?: "bar" | "inline";
};

const SITE_GEO_INPUT =
  "site-input w-full disabled:cursor-not-allowed disabled:opacity-50";
const SITE_GEO_DROPDOWN =
  "geo-searchable-dropdown absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-xl py-1 shadow-lg";
const SITE_GEO_OPTION =
  "geo-searchable-option w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-muted)]";
const SITE_GEO_OPTION_SELECTED =
  "geo-searchable-option w-full bg-[var(--bg-muted)] px-3 py-2 text-left text-sm text-emerald-600 dark:text-emerald-400";
const SITE_GEO_EMPTY = "px-3 py-2 text-sm text-[var(--text-muted)]";

function useGeoFilter({
  basePath,
  initialCountryId,
  initialCityId,
}: Pick<GeoFilterProps, "basePath" | "initialCountryId" | "initialCityId">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const countryId =
    searchParams.get("countryId") ?? initialCountryId ?? "";
  const cityId = searchParams.get("cityId") ?? initialCityId ?? "";

  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    fetch("/api/geo")
      .then((r) => r.json())
      .then(setCountries)
      .catch(() => setCountries([]));
  }, []);

  const selectedCountry = countries.find((c) => c.id === countryId);
  const cities = selectedCountry?.cities ?? [];

  function apply(nextCountry: string, nextCity: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextCountry) params.set("countryId", nextCountry);
    else params.delete("countryId");
    if (nextCity) params.set("cityId", nextCity);
    else params.delete("cityId");
    const q = params.toString();
    router.push(q ? `${basePath}?${q}` : basePath);
  }

  return { countryId, cityId, countries, cities, apply };
}

function GeoCountrySelect({
  locale,
  countries,
  countryId,
  onChange,
  compact,
}: {
  locale: AppLocale;
  countries: Country[];
  countryId: string;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  const t = useTranslations("geo");
  const options = useMemo(
    () => [
      { value: "", label: t("all") },
      ...countries.map((c) => ({
        value: c.id,
        label: localizedGeoName(c.nameRu, locale, c.nameEn),
      })),
    ],
    [countries, locale, t],
  );

  return (
    <SearchableSelect
      options={options}
      value={countryId}
      onChange={onChange}
      placeholder={t("country")}
      searchPlaceholder={t("searchCountry")}
      emptyMessage={t("noResults")}
      inputClassName={
        compact
          ? `${SITE_GEO_INPUT} geo-filter-inline-select min-w-0 flex-1 md:flex-none md:max-w-[9rem] py-1.5 text-[0.8125rem]`
          : SITE_GEO_INPUT
      }
      dropdownClassName={SITE_GEO_DROPDOWN}
      optionClassName={SITE_GEO_OPTION}
      selectedOptionClassName={SITE_GEO_OPTION_SELECTED}
      emptyClassName={SITE_GEO_EMPTY}
      className={compact ? "min-w-0 flex-1 md:flex-none md:max-w-[9rem]" : "min-w-[160px] flex-1"}
    />
  );
}

function GeoCitySelect({
  locale,
  cities,
  cityId,
  countryId,
  onChange,
  compact,
}: {
  locale: AppLocale;
  cities: City[];
  cityId: string;
  countryId: string;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  const t = useTranslations("geo");
  const options = useMemo(
    () => [
      { value: "", label: t("all") },
      ...cities.map((c) => ({
        value: c.id,
        label: localizedGeoName(c.nameRu, locale, c.nameEn),
      })),
    ],
    [cities, locale, t],
  );

  return (
    <SearchableSelect
      options={options}
      value={cityId}
      onChange={onChange}
      placeholder={t("city")}
      searchPlaceholder={t("searchCity")}
      emptyMessage={t("noResults")}
      disabled={!countryId}
      inputClassName={
        compact
          ? `${SITE_GEO_INPUT} geo-filter-inline-select min-w-0 flex-1 md:flex-none md:max-w-[9rem] py-1.5 text-[0.8125rem]`
          : SITE_GEO_INPUT
      }
      dropdownClassName={SITE_GEO_DROPDOWN}
      optionClassName={SITE_GEO_OPTION}
      selectedOptionClassName={SITE_GEO_OPTION_SELECTED}
      emptyClassName={SITE_GEO_EMPTY}
      className={compact ? "min-w-0 flex-1 md:flex-none md:max-w-[9rem]" : "min-w-[160px] flex-1"}
    />
  );
}

export function GeoFilterBar({
  basePath,
  initialCountryId,
  initialCityId,
  variant = "bar",
}: GeoFilterProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("geo");
  const { countryId, cityId, countries, cities, apply } = useGeoFilter({
    basePath,
    initialCountryId,
    initialCityId,
  });

  if (variant === "inline") {
    return (
      <div className="geo-filter-inline w-full md:w-auto">
        <span className="geo-filter-inline-label">{t("region")}</span>
        <GeoCountrySelect
          locale={locale}
          countries={countries}
          countryId={countryId}
          onChange={(id) => apply(id, "")}
          compact
        />
        <GeoCitySelect
          key={countryId}
          locale={locale}
          cities={cities}
          cityId={cityId}
          countryId={countryId}
          onChange={(id) => apply(countryId, id)}
          compact
        />
      </div>
    );
  }

  return (
    <div className="geo-filter-bar">
      <div className="geo-filter-label">
        <span>{t("country")}</span>
        <GeoCountrySelect
          locale={locale}
          countries={countries}
          countryId={countryId}
          onChange={(id) => apply(id, "")}
        />
      </div>
      <div className="geo-filter-label">
        <span>{t("city")}</span>
        <GeoCitySelect
          key={countryId}
          locale={locale}
          cities={cities}
          cityId={cityId}
          countryId={countryId}
          onChange={(id) => apply(countryId, id)}
        />
      </div>
    </div>
  );
}
