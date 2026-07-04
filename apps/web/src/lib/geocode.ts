const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "SetkaBilliard/1.0 (https://billiard.guru; club geocoding)";

export type GeocodeResult = {
  latitude: number;
  longitude: number;
};

type NominatimAddress = {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
};

type NominatimHit = {
  lat: string;
  lon: string;
  display_name?: string;
  type?: string;
  class?: string;
  importance?: number;
  address?: NominatimAddress;
};

export type GeocodeStreetHouse = {
  streetLine: string;
  houseNumber: string;
  houseBase: string;
  houseSuffix?: string;
  userHasCorpus: boolean;
};

const CORPUS_PATTERN = /(?:^|[\s,])(?:к|корп\.?|стр\.?|лит\.?)\s*\d[\da-zа-яё]*/i;

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

export function stripLeadingCity(address: string, cityName: string): string {
  return address
    .trim()
    .replace(new RegExp(`^г\\.\\s*${escapeRegExp(cityName)}\\s*,?\\s*`, "i"), "")
    .replace(new RegExp(`^город\\s+${escapeRegExp(cityName)}\\s*,?\\s*`, "i"), "")
    .replace(new RegExp(`^${escapeRegExp(cityName)}\\s*,?\\s*`, "i"), "")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Упрощает адрес для геокодера: убирает город, этаж, ТЦ и тип улицы. */
export function simplifyClubAddress(address: string, cityName?: string): string {
  let line = address
    .replace(/,\s*\d+\s+этаж/gi, "")
    .replace(/,\s*ТЦ\s+[«"][^»"]+[»"]/gi, "")
    .replace(/^г\.\s*[^,]+,\s*/i, "")
    .replace(/^город\s+[^,]+,\s*/i, "")
    .replace(/ул\.\s*/gi, "")
    .replace(/пр\.\s*/gi, "проспект ")
    .replace(/,\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cityName) {
    line = stripLeadingCity(line, cityName);
  }

  return line;
}

/** Дом/корпус из строки «Московский проспект 102 В». */
export function extractStreetHouse(
  address: string,
  cityName: string,
): GeocodeStreetHouse | null {
  const line = stripLeadingCity(address.trim(), cityName);
  const userHasCorpus = CORPUS_PATTERN.test(line);

  const match = line.match(
    /^(.+?\D)\s+(\d+)\s*[-–]?\s*([а-яёa-z])?(?:\s*(?:к|корп\.?|стр\.?|лит\.?)\s*\d[\da-zа-яё]*)?\s*$/i,
  );
  if (!match) return null;

  const streetLine = match[1]!.replace(/\s+/g, " ").trim();
  const houseBase = match[2]!;
  const houseSuffix = match[3]?.toLowerCase();
  const houseNumber = houseSuffix ? `${houseBase}${houseSuffix}` : houseBase;

  if (!streetLine || !houseBase) return null;

  return {
    streetLine,
    houseNumber,
    houseBase,
    houseSuffix,
    userHasCorpus,
  };
}

function hitHasExtraCorpus(hit: NominatimHit): boolean {
  const text = `${hit.address?.house_number ?? ""} ${hit.display_name ?? ""}`;
  return CORPUS_PATTERN.test(text);
}

function normalizeHouseToken(value: string): string {
  return value.toLowerCase().replace(/[\s–-]/g, "");
}

function scoreGeocodeHit(hit: NominatimHit, parsed: GeocodeStreetHouse | null): number {
  let score = hit.importance ?? 0.5;
  const houseNumber = hit.address?.house_number ?? "";
  const normalizedHouse = normalizeHouseToken(houseNumber);
  const normalizedDisplay = normalizeHouseToken(hit.display_name ?? "");

  if (parsed) {
    const wanted = normalizeHouseToken(parsed.houseNumber);
    const wantedBase = normalizeHouseToken(parsed.houseBase);

    if (normalizedHouse.includes(wanted) || normalizedDisplay.includes(wanted)) {
      score += 5;
      if (!hitHasExtraCorpus(hit)) score += 2;
    } else if (parsed.houseSuffix && normalizedHouse === wantedBase) {
      // «102» без литеры, когда в адресе указано «102В»
      score -= 10;
    } else if (
      normalizedHouse.startsWith(wantedBase) ||
      normalizedDisplay.includes(wantedBase)
    ) {
      score += 1;
    }

    if (!parsed.userHasCorpus && hitHasExtraCorpus(hit)) {
      score -= 2;
    }
  }

  if (hit.type === "yes") score -= 1.5;
  if (
    hit.type &&
    ["house", "residential", "apartments", "commercial", "retail", "building"].includes(
      hit.type,
    )
  ) {
    score += 1.5;
  }

  return score;
}

function hitKey(hit: NominatimHit): string {
  const lat = Number.parseFloat(hit.lat).toFixed(5);
  const lon = Number.parseFloat(hit.lon).toFixed(5);
  return `${lat},${lon}`;
}

function pickBestGeocodeHit(
  hits: NominatimHit[],
  parsed: GeocodeStreetHouse | null,
): GeocodeResult | null {
  let best: { hit: NominatimHit; score: number } | null = null;

  for (const hit of hits) {
    const latitude = Number.parseFloat(hit.lat);
    const longitude = Number.parseFloat(hit.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const score = scoreGeocodeHit(hit, parsed);
    if (!best || score > best.score) {
      best = { hit, score };
    }
  }

  if (!best) return null;

  return {
    latitude: Number.parseFloat(best.hit.lat),
    longitude: Number.parseFloat(best.hit.lon),
  };
}

function geocodeQueries(
  address: string,
  cityName: string,
  countryName: string,
): string[] {
  const trimmed = address.trim();
  const withoutLeadingCity = stripLeadingCity(trimmed, cityName);
  const simplified = simplifyClubAddress(trimmed, cityName);
  const parsed = extractStreetHouse(trimmed, cityName);

  const queries = [
    `${trimmed}, ${cityName}, ${countryName}`,
    `${withoutLeadingCity}, ${cityName}, ${countryName}`,
    `${simplified}, ${cityName}, ${countryName}`,
    `${simplified}, ${cityName}`,
    `${withoutLeadingCity}, ${cityName}`,
  ];

  if (parsed) {
    queries.push(
      `${parsed.streetLine} ${parsed.houseNumber}, ${cityName}, ${countryName}`,
      `${parsed.streetLine}, ${parsed.houseNumber}, ${cityName}, ${countryName}`,
    );
    if (!parsed.houseSuffix) {
      queries.push(
        `${parsed.streetLine} ${parsed.houseBase}, ${cityName}, ${countryName}`,
        `${parsed.streetLine}, ${parsed.houseBase}, ${cityName}, ${countryName}`,
      );
    }
  }

  return uniqueQueries(queries);
}

function structuredGeocodeParams(
  address: string,
  cityName: string,
  countryName: string,
): Array<Record<string, string>> {
  const parsed = extractStreetHouse(address, cityName);
  if (!parsed) return [];

  const params: Array<Record<string, string>> = [];

  if (parsed.houseSuffix) {
    params.push({
      street: `${parsed.streetLine} ${parsed.houseNumber}`,
      city: cityName,
      country: countryName,
    });
  } else {
    params.push({
      street: `${parsed.streetLine} ${parsed.houseBase}`,
      city: cityName,
      country: countryName,
    });
  }

  return params;
}

async function fetchNominatimHits(
  params: URLSearchParams,
  limit = 8,
): Promise<NominatimHit[]> {
  const url = new URL(NOMINATIM_URL);
  url.search = params.toString();
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return [];

  const data = (await res.json()) as NominatimHit[];
  return Array.isArray(data) ? data : [];
}

/** Геокодирование через OpenStreetMap Nominatim (бесплатно, без ключа). */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  const params = new URLSearchParams();
  params.set("q", q);
  const hits = await fetchNominatimHits(params, 8);
  return pickBestGeocodeHit(hits, null);
}

export async function geocodeClubAddress(
  address: string | null | undefined,
  cityName: string,
  countryName: string,
): Promise<GeocodeResult | null> {
  if (!address?.trim()) return null;

  const parsed = extractStreetHouse(address, cityName);
  const collected = new Map<string, NominatimHit>();

  const addHits = (hits: NominatimHit[]) => {
    for (const hit of hits) {
      collected.set(hitKey(hit), hit);
    }
  };

  for (const query of geocodeQueries(address, cityName, countryName)) {
    const params = new URLSearchParams();
    params.set("q", query);
    addHits(await fetchNominatimHits(params, 8));
    await new Promise((resolve) => setTimeout(resolve, 1_100));
  }

  for (const structured of structuredGeocodeParams(address, cityName, countryName)) {
    const params = new URLSearchParams(structured);
    addHits(await fetchNominatimHits(params, 8));
    await new Promise((resolve) => setTimeout(resolve, 1_100));
  }

  return pickBestGeocodeHit([...collected.values()], parsed);
}
