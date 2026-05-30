"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface City {
  id: string;
  nameRu: string;
}

export interface CountryInfo {
  id: string;
  nameRu: string;
}

interface Country {
  id: string;
  nameRu: string;
  cities: City[];
}

interface CitySelectProps {
  value: string;
  onChange: (cityId: string) => void;
  onCountryChange?: (country: CountryInfo | null) => void;
  required?: boolean;
}

export function CitySelect({
  value,
  onChange,
  onCountryChange,
  required,
}: CitySelectProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryId, setCountryId] = useState("");

  useEffect(() => {
    fetch("/api/geo")
      .then((r) => r.json())
      .then(setCountries);
  }, []);

  useEffect(() => {
    if (value && countries.length) {
      for (const c of countries) {
        if (c.cities.some((city) => city.id === value)) {
          setCountryId(c.id);
          onCountryChange?.({ id: c.id, nameRu: c.nameRu });
          break;
        }
      }
    }
  }, [value, countries, onCountryChange]);

  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.id, label: c.nameRu })),
    [countries],
  );

  const cityOptions = useMemo(() => {
    const cities = countries.find((c) => c.id === countryId)?.cities ?? [];
    return cities.map((city) => ({ value: city.id, label: city.nameRu }));
  }, [countries, countryId]);

  function handleCountryChange(id: string) {
    setCountryId(id);
    onChange("");
    const country = countries.find((c) => c.id === id);
    onCountryChange?.(
      country ? { id: country.id, nameRu: country.nameRu } : null,
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SearchableSelect
        label="Страна"
        options={countryOptions}
        value={countryId}
        onChange={handleCountryChange}
        placeholder="Выберите страну"
        searchPlaceholder="Поиск страны…"
        required={required}
      />
      <SearchableSelect
        label="Город"
        options={cityOptions}
        value={value}
        onChange={onChange}
        placeholder="Выберите город"
        searchPlaceholder="Поиск города…"
        disabled={!countryId}
        required={required}
      />
    </div>
  );
}
