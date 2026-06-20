import type { NextRequest } from "next/server";
import { countryCodeFromTimezone } from "@/lib/analytics/timezone-country";

const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const geoCache = new Map<string, { code: string; name: string; at: number }>();

const ruRegionNames = new Intl.DisplayNames(["ru"], { type: "region" });

function normalizeIp(raw: string): string {
  const ip = raw.trim();
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip === "127.0.0.1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return true;
  return false;
}

export function getClientIp(request: NextRequest): string | null {
  const headerNames = [
    "cf-connecting-ip",
    "true-client-ip",
    "x-real-ip",
    "x-client-ip",
    "x-forwarded-for",
  ];

  for (const name of headerNames) {
    const raw = request.headers.get(name);
    if (!raw) continue;
    const candidate = name === "x-forwarded-for" ? raw.split(",")[0]?.trim() : raw.trim();
    if (candidate) return normalizeIp(candidate);
  }

  return null;
}

export function countryNameFromCode(code: string): string {
  try {
    return ruRegionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

function countryFromHeaders(request: NextRequest): { code: string; name: string } | null {
  for (const header of ["cf-ipcountry", "x-vercel-ip-country", "x-country-code"]) {
    const raw = request.headers.get(header)?.trim().toUpperCase();
    if (!raw || raw === "XX" || raw === "T1") continue;
    if (/^[A-Z]{2}$/.test(raw)) {
      return { code: raw, name: countryNameFromCode(raw) };
    }
  }
  return null;
}

function countryFromTimezone(clientTimezone?: string | null): { code: string; name: string } | null {
  const code = countryCodeFromTimezone(clientTimezone);
  if (!code) return null;
  return { code, name: countryNameFromCode(code) };
}

async function lookupViaIpWhoIs(ip: string): Promise<{ code: string; name: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      country_code?: string;
      country?: string;
    };
    if (!data.success || !data.country_code) return null;
    const code = data.country_code.toUpperCase();
    return { code, name: countryNameFromCode(code) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupViaIpApi(ip: string): Promise<{ code: string; name: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode`,
      { signal: controller.signal, cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      countryCode?: string;
    };
    if (data.status !== "success" || !data.countryCode) return null;
    const code = data.countryCode.toUpperCase();
    return { code, name: countryNameFromCode(code) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupCountryByIp(ip: string): Promise<{ code: string; name: string } | null> {
  if (isPrivateIp(ip)) return null;

  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.at < GEO_CACHE_TTL_MS) {
    return { code: cached.code, name: cached.name };
  }

  const result = (await lookupViaIpWhoIs(ip)) ?? (await lookupViaIpApi(ip));
  if (result) {
    geoCache.set(ip, { ...result, at: Date.now() });
  }
  return result;
}

export async function resolveVisitorCountry(
  request: NextRequest,
  clientTimezone?: string | null,
): Promise<{ code: string; name: string } | null> {
  const fromHeader = countryFromHeaders(request);
  if (fromHeader) return fromHeader;

  const ip = getClientIp(request);
  if (ip) {
    const fromIp = await lookupCountryByIp(ip);
    if (fromIp) return fromIp;
  }

  return countryFromTimezone(clientTimezone);
}

export function normalizeCountryFields(
  code: string | null | undefined,
): { countryCode: string; countryName: string } | null {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  const countryCode = code.toUpperCase();
  return { countryCode, countryName: countryNameFromCode(countryCode) };
}

export function countryFlagEmoji(code: string | null | undefined): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  const points = [...code].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...points);
}
