const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "SetkaBilliard/1.0 (https://billiard.guru; club geocoding)";

export type GeocodeResult = {
  latitude: number;
  longitude: number;
};

function uniqueQueries(queries: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of queries) {
    const trimmed = q.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/** Упрощает адрес для геокодера: убирает город, этаж, ТЦ и тип улицы. */
export function simplifyClubAddress(address: string): string {
  return address
    .replace(/,\s*\d+\s+этаж/gi, "")
    .replace(/,\s*ТЦ\s+[«"][^»"]+[»"]/gi, "")
    .replace(/^г\.\s*[^,]+,\s*/i, "")
    .replace(/^город\s+[^,]+,\s*/i, "")
    .replace(/ул\.\s*/gi, "")
    .replace(/пр\.\s*/gi, "проспект ")
    .replace(/,\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function geocodeQueries(
  address: string,
  cityName: string,
  countryName: string,
): string[] {
  const trimmed = address.trim();
  const simplified = simplifyClubAddress(trimmed);
  const withoutLeadingCity = trimmed
    .replace(new RegExp(`^г\\.\\s*${cityName}\\s*,?\\s*`, "i"), "")
    .replace(new RegExp(`^${cityName}\\s*,?\\s*`, "i"), "")
    .trim();

  return uniqueQueries([
    `${trimmed}, ${cityName}, ${countryName}`,
    `${withoutLeadingCity}, ${cityName}, ${countryName}`,
    `${simplified}, ${cityName}, ${countryName}`,
    `${simplified}, ${cityName}`,
    `${withoutLeadingCity}, ${cityName}`,
  ]);
}

/** Геокодирование через OpenStreetMap Nominatim (бесплатно, без ключа). */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  const hit = data[0];
  if (!hit) return null;

  const latitude = Number.parseFloat(hit.lat);
  const longitude = Number.parseFloat(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

export async function geocodeClubAddress(
  address: string | null | undefined,
  cityName: string,
  countryName: string,
): Promise<GeocodeResult | null> {
  if (!address?.trim()) return null;

  for (const query of geocodeQueries(address, cityName, countryName)) {
    const coords = await geocodeAddress(query);
    if (coords) return coords;
    await new Promise((resolve) => setTimeout(resolve, 1_100));
  }

  return null;
}
