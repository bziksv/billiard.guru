"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/lib/site";

type City = { id: string; nameRu: string };
type Country = { id: string; nameRu: string; cities: City[] };

type GeoFilterProps = {
  basePath: string;
  /** Профиль / серверный geo, если в URL нет countryId/cityId */
  initialCountryId?: string;
  initialCityId?: string;
  variant?: "bar" | "inline";
};

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

export function GeoFilterBar({
  basePath,
  initialCountryId,
  initialCityId,
  variant = "bar",
}: GeoFilterProps) {
  const { countryId, cityId, countries, cities, apply } = useGeoFilter({
    basePath,
    initialCountryId,
    initialCityId,
  });

  if (variant === "inline") {
    return (
      <div className="geo-filter-inline w-full md:w-auto">
        <span className="geo-filter-inline-label">{t("geo.region")}</span>
        <select
          value={countryId}
          onChange={(e) => apply(e.target.value, "")}
          className="site-input geo-filter-inline-select min-w-0 flex-1 md:flex-none md:max-w-[9rem]"
          aria-label={t("geo.country")}
        >
          <option value="">{t("geo.all")}</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameRu}
            </option>
          ))}
        </select>
        <select
          value={cityId}
          onChange={(e) => apply(countryId, e.target.value)}
          className="site-input geo-filter-inline-select min-w-0 flex-1 md:flex-none md:max-w-[9rem]"
          aria-label={t("geo.city")}
          disabled={!countryId}
        >
          <option value="">{t("geo.all")}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameRu}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="geo-filter-bar">
      <label className="geo-filter-label">
        {t("geo.country")}
        <select
          value={countryId}
          onChange={(e) => apply(e.target.value, "")}
          className="site-input"
        >
          <option value="">{t("geo.all")}</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameRu}
            </option>
          ))}
        </select>
      </label>
      <label className="geo-filter-label">
        {t("geo.city")}
        <select
          value={cityId}
          onChange={(e) => apply(countryId, e.target.value)}
          className="site-input"
          disabled={!countryId}
        >
          <option value="">{t("geo.all")}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameRu}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
