"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type ClubMapClientProps = {
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cityName?: string;
  countryName?: string;
};

type YmapsMap = {
  destroy: () => void;
  geoObjects: { add: (obj: unknown) => void };
};

declare global {
  interface Window {
    ymaps?: {
      ready: (cb: () => void) => void;
      Map: new (
        element: string | HTMLElement,
        options: { center: [number, number]; zoom: number; controls?: string[] },
      ) => YmapsMap;
      Placemark: new (
        coords: [number, number],
        properties?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => unknown;
    };
  }
}

/** Ключ JS API 2.1: https://developer.tech.yandex.ru/ — ограничение по HTTP Referer. */
const YANDEX_MAPS_API_KEY = (
  process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? ""
).trim();

let ymapsLoad: Promise<void> | null = null;

function mapLabel(
  address: string | null | undefined,
  cityName: string | undefined,
): string {
  return [address, cityName].filter(Boolean).join(", ");
}

function isRussia(countryName?: string) {
  return countryName === "Россия" || countryName === "Russia";
}

function yandexMapLink(
  lat: number | null,
  lng: number | null,
  query: string,
): string {
  if (lat != null && lng != null) {
    return `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;
  }
  return `https://yandex.ru/maps/?text=${encodeURIComponent(query)}`;
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
  locale: string,
): string {
  const q = lat != null && lng != null ? `${lat},${lng}` : query;
  const hl = locale === "en" ? "en" : "ru";
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&hl=${hl}&z=16&output=embed`;
}

/** Виджет без JS API — работает без ключа. */
function yandexWidgetSrc(
  lat: number,
  lng: number,
  locale: string,
): string {
  const lang = locale === "en" ? "en_US" : "ru_RU";
  const params = new URLSearchParams({
    ll: `${lng},${lat}`,
    z: "16",
    pt: `${lng},${lat},pm2rdm`,
    lang,
  });
  return `https://yandex.ru/map-widget/v1/?${params.toString()}`;
}

function loadYmaps(apiKey: string, lang: string): Promise<void> {
  if (ymapsLoad) return ymapsLoad;
  ymapsLoad = new Promise((resolve, reject) => {
    if (window.ymaps) {
      window.ymaps.ready(() => resolve());
      return;
    }
    const script = document.createElement("script");
    const params = new URLSearchParams({
      apikey: apiKey,
      lang,
    });
    script.src = `https://api-maps.yandex.ru/2.1/?${params.toString()}`;
    script.async = true;
    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error("Yandex Maps load failed"));
        return;
      }
      window.ymaps.ready(() => resolve());
    };
    script.onerror = () => reject(new Error("Yandex Maps script error"));
    document.head.appendChild(script);
  });
  return ymapsLoad;
}

function GoogleMapEmbed({
  lat,
  lng,
  query,
  title,
  locale,
}: {
  lat: number | null;
  lng: number | null;
  query: string;
  title: string;
  locale: string;
}) {
  return (
    <iframe
      title={title}
      className="club-map-frame h-80 w-full border-0"
      width="100%"
      height="320"
      src={googleEmbedSrc(lat, lng, query, locale)}
      allowFullScreen
    />
  );
}

function YandexMapWidget({
  lat,
  lng,
  title,
  locale,
}: {
  lat: number;
  lng: number;
  title: string;
  locale: string;
}) {
  return (
    <iframe
      title={title}
      className="club-map-frame h-80 w-full border-0"
      width="100%"
      height="320"
      src={yandexWidgetSrc(lat, lng, locale)}
      allowFullScreen
    />
  );
}

function YandexMapCanvas({
  lat,
  lng,
  apiKey,
  locale,
  markerTitle,
  ariaLabel,
  onFailed,
}: {
  lat: number;
  lng: number;
  apiKey: string;
  locale: string;
  markerTitle: string;
  ariaLabel: string;
  onFailed: () => void;
}) {
  const reactId = useId();
  const mapId = `club-ymap-${reactId.replace(/:/g, "")}`;
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;

  useEffect(() => {
    let map: YmapsMap | null = null;
    let cancelled = false;
    const failTimer = window.setTimeout(() => onFailedRef.current(), 8000);
    const lang = locale === "en" ? "en_US" : "ru_RU";

    void loadYmaps(apiKey, lang)
      .then(() => {
        if (cancelled || !window.ymaps) return;
        window.clearTimeout(failTimer);
        map = new window.ymaps.Map(mapId, {
          center: [lat, lng],
          zoom: 16,
          controls: ["zoomControl", "fullscreenControl"],
        });
        map.geoObjects.add(
          new window.ymaps.Placemark(
            [lat, lng],
            { balloonContent: markerTitle },
            { preset: "islands#greenDotIcon" },
          ),
        );
      })
      .catch(() => {
        if (!cancelled) onFailedRef.current();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(failTimer);
      map?.destroy();
    };
  }, [apiKey, lat, lng, locale, mapId, markerTitle]);

  return (
    <div
      id={mapId}
      className="club-map-canvas h-80 w-full"
      role="application"
      aria-label={ariaLabel}
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
  const t = useTranslations("clubMap");
  const locale = useLocale();
  const lat = latitude ?? null;
  const lng = longitude ?? null;
  const hasCoords = lat != null && lng != null;
  const label = mapLabel(address, cityName);
  const searchQuery = label || name;
  const isRu = isRussia(countryName);
  const canUseYandexJs = Boolean(YANDEX_MAPS_API_KEY) && hasCoords;
  const [useYandexWidget, setUseYandexWidget] = useState(!canUseYandexJs);

  if (!hasCoords && !address) {
    return (
      <p className="text-sm text-zinc-500">
        {cityName ? t("cityOnly", { city: cityName }) : t("addressPending")}
      </p>
    );
  }

  const preferYandex = isRu || hasCoords;
  const mapTitle = t("title", { query: searchQuery });
  const mapAria = t("aria", { label: label || name });
  const externalLink = preferYandex
    ? yandexMapLink(lat, lng, searchQuery)
    : googleMapLink(lat, lng, searchQuery);
  const externalLinkLabel = preferYandex ? t("openYandex") : t("openGoogle");

  let mapNode: ReactNode = null;
  if (hasCoords && canUseYandexJs && !useYandexWidget) {
    mapNode = (
      <YandexMapCanvas
        lat={lat!}
        lng={lng!}
        apiKey={YANDEX_MAPS_API_KEY}
        locale={locale}
        markerTitle={name}
        ariaLabel={mapAria}
        onFailed={() => setUseYandexWidget(true)}
      />
    );
  } else if (hasCoords) {
    mapNode = (
      <YandexMapWidget
        lat={lat!}
        lng={lng!}
        title={mapTitle}
        locale={locale}
      />
    );
  } else if (!isRu) {
    mapNode = (
      <GoogleMapEmbed
        lat={lat}
        lng={lng}
        query={searchQuery}
        title={mapTitle}
        locale={locale}
      />
    );
  }

  return (
    <div className="space-y-3">
      {label && <p className="text-sm text-zinc-300">{label}</p>}
      {mapNode ? (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-100 dark:bg-zinc-200">
          {mapNode}
        </div>
      ) : null}
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
