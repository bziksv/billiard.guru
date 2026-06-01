"use client";

import { useEffect, useId, useRef, useState } from "react";

export type ClubMapClientProps = {
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cityName?: string;
  countryName?: string;
};

type DgisMapInstance = { remove: () => void };
type DgisMarker = { addTo: (map: DgisMapInstance) => DgisMarker };

declare global {
  interface Window {
    DG?: {
      then: (
        resolve: () => void,
        reject?: (err: unknown) => void,
      ) => Promise<void>;
      map: (
        elementId: string,
        options: { center: [number, number]; zoom: number },
      ) => DgisMapInstance;
      marker: (coords: [number, number]) => DgisMarker;
    };
  }
}

let dgisLoad: Promise<void> | null = null;

function mapLabel(
  address: string | null | undefined,
  cityName: string | undefined,
): string {
  return [address, cityName].filter(Boolean).join(", ");
}

function isRussia(countryName?: string) {
  return countryName === "Россия" || countryName === "Russia";
}

function dgisMapLink(
  lat: number | null,
  lng: number | null,
  query: string,
): string {
  if (lat != null && lng != null) {
    return `https://2gis.ru/geo/${lng},${lat}`;
  }
  return `https://2gis.ru/search/${encodeURIComponent(query)}`;
}

function googleMapLink(
  lat: number | null,
  lng: number | null,
  query: string,
): string {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function googleEmbedSrc(
  lat: number | null,
  lng: number | null,
  query: string,
): string {
  const q =
    lat != null && lng != null
      ? `${lat},${lng}`
      : query;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&hl=ru&z=16&output=embed`;
}

function loadDgis(): Promise<void> {
  if (dgisLoad) return dgisLoad;
  dgisLoad = new Promise((resolve, reject) => {
    if (window.DG) {
      void window.DG.then(resolve, reject);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://maps.api.2gis.ru/2.0/loader.js?pkg=full";
    script.async = true;
    script.onload = () => {
      if (!window.DG) {
        reject(new Error("2GIS не загрузился"));
        return;
      }
      void window.DG.then(resolve, reject);
    };
    script.onerror = () => reject(new Error("2GIS script error"));
    document.head.appendChild(script);
  });
  return dgisLoad;
}

function GoogleMapEmbed({
  lat,
  lng,
  query,
}: {
  lat: number | null;
  lng: number | null;
  query: string;
}) {
  return (
    <iframe
      title={`Карта — ${query}`}
      className="club-map-frame h-80 w-full border-0"
      width="100%"
      height="320"
      src={googleEmbedSrc(lat, lng, query)}
      allowFullScreen
    />
  );
}

function DgisMapCanvas({
  lat,
  lng,
  label,
  onFailed,
}: {
  lat: number;
  lng: number;
  label: string;
  onFailed: () => void;
}) {
  const reactId = useId();
  const mapId = `club-map-${reactId.replace(/:/g, "")}`;
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;

  useEffect(() => {
    let map: DgisMapInstance | null = null;
    let cancelled = false;
    const failTimer = window.setTimeout(() => onFailedRef.current(), 6000);

    void loadDgis()
      .then(() => {
        if (cancelled || !window.DG) return;
        window.clearTimeout(failTimer);
        map = window.DG.map(mapId, {
          center: [lat, lng],
          zoom: 16,
        });
        window.DG.marker([lat, lng]).addTo(map);
      })
      .catch(() => {
        if (!cancelled) onFailedRef.current();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(failTimer);
      map?.remove();
    };
  }, [lat, lng, mapId]);

  return (
    <div
      id={mapId}
      className="club-map-canvas h-80 w-full"
      role="application"
      aria-label={`Карта: ${label}`}
    />
  );
}

export function ClubMapClient({
  name,
  address,
  latitude,
  longitude,
  cityName,
  countryName,
}: ClubMapClientProps) {
  const lat = latitude ?? null;
  const lng = longitude ?? null;
  const hasCoords = lat != null && lng != null;
  const label = mapLabel(address, cityName);
  const searchQuery = label || name;
  const isRu = isRussia(countryName);
  const [useGoogleFallback, setUseGoogleFallback] = useState(!isRu);

  if (!hasCoords && !address) {
    return (
      <p className="text-sm text-zinc-500">
        {cityName ? `Город: ${cityName}` : "Адрес уточняется у клуба."}
      </p>
    );
  }

  const usingDgis = isRu && !useGoogleFallback && hasCoords;
  const externalLink = usingDgis
    ? dgisMapLink(lat, lng, searchQuery)
    : googleMapLink(lat, lng, searchQuery);
  const externalLinkLabel = usingDgis
    ? "Открыть в 2GIS →"
    : "Открыть в Google Картах →";

  return (
    <div className="space-y-3">
      {label && <p className="text-sm text-zinc-300">{label}</p>}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-100 dark:bg-zinc-200">
        {hasCoords && isRu && !useGoogleFallback ? (
          <DgisMapCanvas
            lat={lat!}
            lng={lng!}
            label={label || name}
            onFailed={() => setUseGoogleFallback(true)}
          />
        ) : (
          <GoogleMapEmbed lat={lat} lng={lng} query={searchQuery} />
        )}
      </div>
      <a
        href={externalLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm text-emerald-400 hover:underline"
      >
        {externalLinkLabel}
      </a>
    </div>
  );
}
