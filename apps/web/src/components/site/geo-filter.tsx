"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/lib/site";

type City = { id: string; nameRu: string };
type Country = { id: string; nameRu: string; cities: City[] };

export function GeoFilterBar({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const countryId = searchParams.get("countryId") ?? "";
  const cityId = searchParams.get("cityId") ?? "";

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
    const params = new URLSearchParams();
    if (nextCountry) params.set("countryId", nextCountry);
    if (nextCity) params.set("cityId", nextCity);
    const q = params.toString();
    router.push(q ? `${basePath}?${q}` : basePath);
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
