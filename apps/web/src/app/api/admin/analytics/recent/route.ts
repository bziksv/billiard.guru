import { NextRequest, NextResponse } from "next/server";
import {
  ANALYTICS_ALLOWED_PERIODS,
  ANALYTICS_COUNTRY_UNKNOWN,
  type AnalyticsSurfaceId,
} from "@/lib/analytics/constants";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { listRecentVisits, type RecentVisitsFilter } from "@/lib/analytics/stats-server";

const ALLOWED_SURFACES = new Set<AnalyticsSurfaceId>(["MARKETING", "ADMIN", "MANAGE"]);

function parseRecentVisitsFilter(sp: URLSearchParams): RecentVisitsFilter | undefined {
  const surface = sp.get("surface") ?? "";
  const country = sp.get("country") ?? "";
  const registered = sp.get("registered") ?? "";
  const path = sp.get("path")?.trim() ?? "";

  const filter: RecentVisitsFilter = {};
  let hasFilter = false;

  if (ALLOWED_SURFACES.has(surface as AnalyticsSurfaceId)) {
    filter.surface = surface as AnalyticsSurfaceId;
    hasFilter = true;
  }

  if (country === ANALYTICS_COUNTRY_UNKNOWN) {
    filter.countryCode = ANALYTICS_COUNTRY_UNKNOWN;
    hasFilter = true;
  } else if (country && /^[A-Z]{2}$/.test(country)) {
    filter.countryCode = country;
    hasFilter = true;
  }

  if (registered === "yes" || registered === "no") {
    filter.registered = registered;
    hasFilter = true;
  }

  if (path) {
    filter.path = path.slice(0, 128);
    hasFilter = true;
  }

  return hasFilter ? filter : undefined;
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const sp = request.nextUrl.searchParams;
    const rawDays = Number(sp.get("days") ?? "30");
    const periodDays = ANALYTICS_ALLOWED_PERIODS.has(rawDays) ? rawDays : 30;
    const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
    const pageSize = Math.min(50, Math.max(10, Number(sp.get("pageSize") ?? "20") || 20));
    const filter = parseRecentVisitsFilter(sp);

    const result = await listRecentVisits({ periodDays, page, pageSize, filter });
    return NextResponse.json(result);
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
