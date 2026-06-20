import type { AnalyticsSurface, Prisma } from "@/generated/prisma/client";
import {
  ANALYTICS_COUNTRY_UNKNOWN,
  ANALYTICS_RETENTION_DAYS,
  ANALYTICS_RETENTION_LABEL,
  ANALYTICS_SURFACE_LABELS,
  type AnalyticsSurfaceId,
} from "@/lib/analytics/constants";
import { prisma } from "@/lib/prisma";
import { countryNameFromCode } from "@/lib/analytics/geo";
import { BOOKING_TIMEZONE } from "@/lib/table-booking";

export type AnalyticsDailyPoint = {
  date: string;
  label: string;
  marketingViews: number;
  adminViews: number;
  manageViews: number;
  marketingVisitors: number;
  adminVisitors: number;
  manageVisitors: number;
};

export type AnalyticsTopPage = {
  path: string;
  surface: AnalyticsSurfaceId;
  surfaceLabel: string;
  views: number;
  visitors: number;
};

export type AnalyticsRecentVisit = {
  id: string;
  atLabel: string;
  surface: AnalyticsSurfaceId;
  surfaceLabel: string;
  path: string;
  visitorId: string;
  playerLabel: string | null;
  isRegistered: boolean;
  countryCode: string | null;
  countryName: string | null;
};

export type AnalyticsCountryStat = {
  countryCode: string;
  countryName: string;
  visitors: number;
  views: number;
};

export type AnalyticsCountryDailyPoint = {
  date: string;
  label: string;
  visitors: number;
};

export type AnalyticsCountryDailySeries = {
  countryCode: string;
  countryName: string;
  daily: AnalyticsCountryDailyPoint[];
};

export type AnalyticsHourlyPoint = {
  hour: number;
  label: string;
  marketingViews: number;
  adminViews: number;
  manageViews: number;
};

export type VisitorAnalyticsReport = {
  periodDays: number;
  retentionDays: number;
  retentionLabel: string;
  generatedAt: string;
  totals: {
    pageViewsMarketing: number;
    pageViewsAdmin: number;
    pageViewsManage: number;
    pageViewsAll: number;
    uniqueVisitorsMarketing: number;
    uniqueVisitorsAdmin: number;
    uniqueVisitorsManage: number;
    uniqueVisitorsAll: number;
    registeredVisitors: number;
    anonymousVisitors: number;
    registeredSharePct: number;
  };
  daily: AnalyticsDailyPoint[];
  hourly: AnalyticsHourlyPoint[] | null;
  topPages: AnalyticsTopPage[];
  topCountries: AnalyticsCountryStat[];
  countryDaily: AnalyticsCountryDailySeries[];
};

export type RecentVisitsPage = {
  items: AnalyticsRecentVisit[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type RecentVisitsFilter = {
  surface?: AnalyticsSurfaceId;
  countryCode?: string;
  registered?: "yes" | "no";
  path?: string;
};

function buildRecentVisitsWhere(
  since: Date,
  filter?: RecentVisitsFilter,
): Prisma.SitePageViewWhereInput {
  const where: Prisma.SitePageViewWhereInput = { createdAt: { gte: since } };

  if (filter?.surface) {
    where.surface = filter.surface;
  }

  if (filter?.countryCode === ANALYTICS_COUNTRY_UNKNOWN) {
    where.countryCode = null;
  } else if (filter?.countryCode) {
    where.countryCode = filter.countryCode;
  }

  if (filter?.registered === "yes") {
    where.playerId = { not: null };
  } else if (filter?.registered === "no") {
    where.playerId = null;
  }

  const path = filter?.path?.trim();
  if (path) {
    where.path = { contains: path };
  }

  return where;
}

function startOfPeriod(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BOOKING_TIMEZONE }).format(date);
}

function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: BOOKING_TIMEZONE,
  }).format(date);
}

function formatWhen(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: BOOKING_TIMEZONE,
  }).format(date);
}

function mapRecentRow(row: {
  id: string;
  createdAt: Date;
  surface: AnalyticsSurface;
  path: string;
  visitorId: string;
  playerId: string | null;
  countryCode: string | null;
  countryName: string | null;
  player: { firstName: string; lastName: string } | null;
}): AnalyticsRecentVisit {
  return {
    id: row.id,
    atLabel: formatWhen(row.createdAt),
    surface: row.surface as AnalyticsSurfaceId,
    surfaceLabel:
      ANALYTICS_SURFACE_LABELS[row.surface as AnalyticsSurfaceId] ?? row.surface,
    path: row.path,
    visitorId: row.visitorId.slice(0, 8),
    playerLabel: row.player ? `${row.player.lastName} ${row.player.firstName}` : null,
    isRegistered: Boolean(row.playerId),
    countryCode: row.countryCode,
    countryName: row.countryCode ? countryNameFromCode(row.countryCode) : row.countryName,
  };
}

export async function listRecentVisits(input: {
  periodDays: number;
  page: number;
  pageSize: number;
  filter?: RecentVisitsFilter;
}): Promise<RecentVisitsPage> {
  const since = startOfPeriod(input.periodDays);
  const page = Math.max(1, input.page);
  const pageSize = Math.min(50, Math.max(10, input.pageSize));
  const skip = (page - 1) * pageSize;

  const where = buildRecentVisitsWhere(since, input.filter);

  const [total, rows] = await Promise.all([
    prisma.sitePageView.count({ where }),
    prisma.sitePageView.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        player: {
          select: { firstName: true, lastName: true },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: rows.map(mapRecentRow),
    page,
    pageSize,
    total,
    totalPages,
  };
}

function buildDailySeries(
  days: number,
  rows: { day: string; surface: AnalyticsSurface; views: bigint; visitors: bigint }[],
): AnalyticsDailyPoint[] {
  const byDay = new Map<
    string,
    {
      marketingViews: number;
      adminViews: number;
      manageViews: number;
      marketingVisitors: number;
      adminVisitors: number;
      manageVisitors: number;
    }
  >();

  for (let i = 0; i < days; i++) {
    const d = startOfPeriod(days);
    d.setDate(d.getDate() + i);
    const key = dayKey(d);
    byDay.set(key, {
      marketingViews: 0,
      adminViews: 0,
      manageViews: 0,
      marketingVisitors: 0,
      adminVisitors: 0,
      manageVisitors: 0,
    });
  }

  for (const row of rows) {
    const bucket = byDay.get(row.day);
    if (!bucket) continue;
    const views = Number(row.views);
    const visitors = Number(row.visitors);
    if (row.surface === "MARKETING") {
      bucket.marketingViews = views;
      bucket.marketingVisitors = visitors;
    } else if (row.surface === "ADMIN") {
      bucket.adminViews = views;
      bucket.adminVisitors = visitors;
    } else if (row.surface === "MANAGE") {
      bucket.manageViews = views;
      bucket.manageVisitors = visitors;
    }
  }

  return [...byDay.entries()].map(([date, v]) => ({
    date,
    label: dayLabel(date),
    ...v,
  }));
}

function currentHourInTimezone(): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: BOOKING_TIMEZONE,
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  return Number(hour);
}

function buildHourlySeries(
  rows: { hour: number; surface: AnalyticsSurface; views: bigint }[],
): AnalyticsHourlyPoint[] {
  const maxHour = currentHourInTimezone();
  const buckets = new Map<
    number,
    { marketingViews: number; adminViews: number; manageViews: number }
  >();

  for (let h = 0; h <= maxHour; h++) {
    buckets.set(h, { marketingViews: 0, adminViews: 0, manageViews: 0 });
  }

  for (const row of rows) {
    const hour = Number(row.hour);
    const bucket = buckets.get(hour);
    if (!bucket) continue;
    const views = Number(row.views);
    if (row.surface === "MARKETING") bucket.marketingViews += views;
    else if (row.surface === "ADMIN") bucket.adminViews += views;
    else if (row.surface === "MANAGE") bucket.manageViews += views;
  }

  return [...buckets.entries()].map(([hour, views]) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    ...views,
  }));
}

const COUNTRY_CHART_LIMIT = 6;

function mergeCountryStats(
  rows: { countryCode: string; views: number; visitors: number }[],
): AnalyticsCountryStat[] {
  const map = new Map<string, { views: number; visitors: number }>();
  for (const row of rows) {
    const code = row.countryCode.toUpperCase();
    const prev = map.get(code) ?? { views: 0, visitors: 0 };
    map.set(code, {
      views: prev.views + row.views,
      visitors: prev.visitors + row.visitors,
    });
  }
  return [...map.entries()]
    .map(([countryCode, stats]) => ({
      countryCode,
      countryName: countryNameFromCode(countryCode),
      ...stats,
    }))
    .sort((a, b) => b.visitors - a.visitors || b.views - a.views);
}

function buildCountryDailySeries(
  days: number,
  topCountries: { countryCode: string; countryName: string }[],
  rows: { day: string; countryCode: string; visitors: bigint }[],
): AnalyticsCountryDailySeries[] {
  if (topCountries.length === 0) return [];

  const dateKeys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = startOfPeriod(days);
    d.setDate(d.getDate() + i);
    dateKeys.push(dayKey(d));
  }

  const topSet = new Set(topCountries.map((c) => c.countryCode.toUpperCase()));
  const lookup = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (!topSet.has(row.countryCode)) continue;
    const day =
      typeof row.day === "string" ? row.day.slice(0, 10) : dayKey(new Date(row.day));
    const code = row.countryCode.toUpperCase();
    if (!lookup.has(code)) lookup.set(code, new Map());
    const bucket = lookup.get(code)!;
    bucket.set(day, (bucket.get(day) ?? 0) + Number(row.visitors));
  }

  return topCountries.map(({ countryCode, countryName }) => ({
    countryCode,
    countryName: countryNameFromCode(countryCode),
    daily: dateKeys.map((date) => ({
      date,
      label: dayLabel(date),
      visitors: lookup.get(countryCode)?.get(date) ?? 0,
    })),
  }));
}

export async function getVisitorAnalyticsReport(
  periodDays: number,
): Promise<VisitorAnalyticsReport> {
  const since = startOfPeriod(periodDays);

  const [
    surfaceCounts,
    uniqueMarketing,
    uniqueAdmin,
    uniqueManage,
    uniqueAll,
    registeredVisitors,
    dailyRows,
    topPageRows,
    topCountryRows,
    dailyCountryRows,
  ] = await Promise.all([
    prisma.sitePageView.groupBy({
      by: ["surface"],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.sitePageView.findMany({
      where: { createdAt: { gte: since }, surface: "MARKETING" },
      distinct: ["visitorId"],
      select: { visitorId: true },
    }),
    prisma.sitePageView.findMany({
      where: { createdAt: { gte: since }, surface: "ADMIN" },
      distinct: ["visitorId"],
      select: { visitorId: true },
    }),
    prisma.sitePageView.findMany({
      where: { createdAt: { gte: since }, surface: "MANAGE" },
      distinct: ["visitorId"],
      select: { visitorId: true },
    }),
    prisma.sitePageView.findMany({
      where: { createdAt: { gte: since } },
      distinct: ["visitorId"],
      select: { visitorId: true },
    }),
    prisma.sitePageView.findMany({
      where: { createdAt: { gte: since }, playerId: { not: null } },
      distinct: ["visitorId"],
      select: { visitorId: true },
    }),
    prisma.$queryRaw<
      { day: string; surface: AnalyticsSurface; views: bigint; visitors: bigint }[]
    >`
      SELECT DATE(created_at) AS day, surface,
        COUNT(*) AS views,
        COUNT(DISTINCT visitor_id) AS visitors
      FROM site_page_views
      WHERE created_at >= ${since}
      GROUP BY day, surface
      ORDER BY day ASC
    `,
    prisma.$queryRaw<
      { path: string; surface: AnalyticsSurface; views: bigint; visitors: bigint }[]
    >`
      SELECT path, surface,
        COUNT(*) AS views,
        COUNT(DISTINCT visitor_id) AS visitors
      FROM site_page_views
      WHERE created_at >= ${since}
      GROUP BY path, surface
      ORDER BY views DESC
      LIMIT 36
    `,
    prisma.$queryRaw<
      {
        countryCode: string;
        views: bigint;
        visitors: bigint;
      }[]
    >`
      SELECT country_code AS countryCode,
        COUNT(*) AS views,
        COUNT(DISTINCT visitor_id) AS visitors
      FROM site_page_views
      WHERE created_at >= ${since}
        AND country_code IS NOT NULL
      GROUP BY country_code
      ORDER BY visitors DESC
      LIMIT 12
    `,
    prisma.$queryRaw<
      { day: string; countryCode: string; visitors: bigint }[]
    >`
      SELECT DATE(created_at) AS day,
        country_code AS countryCode,
        COUNT(DISTINCT visitor_id) AS visitors
      FROM site_page_views
      WHERE created_at >= ${since}
        AND country_code IS NOT NULL
      GROUP BY day, country_code
      ORDER BY day ASC
    `,
  ]);

  const pageViewsMarketing =
    surfaceCounts.find((r) => r.surface === "MARKETING")?._count.id ?? 0;
  const pageViewsAdmin =
    surfaceCounts.find((r) => r.surface === "ADMIN")?._count.id ?? 0;
  const pageViewsManage =
    surfaceCounts.find((r) => r.surface === "MANAGE")?._count.id ?? 0;
  const uniqueVisitorsMarketing = uniqueMarketing.length;
  const uniqueVisitorsAdmin = uniqueAdmin.length;
  const uniqueVisitorsManage = uniqueManage.length;
  const uniqueVisitorsAll = uniqueAll.length;
  const registeredCount = registeredVisitors.length;
  const anonymousVisitors = Math.max(0, uniqueVisitorsAll - registeredCount);
  const registeredSharePct =
    uniqueVisitorsAll > 0
      ? Math.round((registeredCount / uniqueVisitorsAll) * 1000) / 10
      : 0;

  const hourlyRows =
    periodDays === 1
      ? await prisma.$queryRaw<
          { hour: number; surface: AnalyticsSurface; views: bigint }[]
        >`
          SELECT HOUR(created_at) AS hour, surface, COUNT(*) AS views
          FROM site_page_views
          WHERE created_at >= ${since}
          GROUP BY hour, surface
          ORDER BY hour ASC
        `
      : [];

  const topCountries = mergeCountryStats(
    topCountryRows.map((row) => ({
      countryCode: row.countryCode,
      views: Number(row.views),
      visitors: Number(row.visitors),
    })),
  );

  return {
    periodDays,
    retentionDays: ANALYTICS_RETENTION_DAYS,
    retentionLabel: ANALYTICS_RETENTION_LABEL,
    generatedAt: new Date().toISOString(),
    totals: {
      pageViewsMarketing,
      pageViewsAdmin,
      pageViewsManage,
      pageViewsAll: pageViewsMarketing + pageViewsAdmin + pageViewsManage,
      uniqueVisitorsMarketing,
      uniqueVisitorsAdmin,
      uniqueVisitorsManage,
      uniqueVisitorsAll,
      registeredVisitors: registeredCount,
      anonymousVisitors,
      registeredSharePct,
    },
    daily: buildDailySeries(
      periodDays,
      dailyRows.map((r) => ({
        day: typeof r.day === "string" ? r.day.slice(0, 10) : dayKey(new Date(r.day)),
        surface: r.surface,
        views: r.views,
        visitors: r.visitors,
      })),
    ),
    hourly:
      periodDays === 1
        ? buildHourlySeries(
            hourlyRows.map((r) => ({
              hour: Number(r.hour),
              surface: r.surface,
              views: r.views,
            })),
          )
        : null,
    topPages: topPageRows.map((row) => ({
      path: row.path,
      surface: row.surface as AnalyticsSurfaceId,
      surfaceLabel:
        ANALYTICS_SURFACE_LABELS[row.surface as AnalyticsSurfaceId] ?? row.surface,
      views: Number(row.views),
      visitors: Number(row.visitors),
    })),
    topCountries,
    countryDaily:
      periodDays === 1
        ? []
        : buildCountryDailySeries(
            periodDays,
            topCountries.slice(0, COUNTRY_CHART_LIMIT).map((row) => ({
              countryCode: row.countryCode,
              countryName: row.countryName,
            })),
            dailyCountryRows.map((r) => ({
              day: typeof r.day === "string" ? r.day.slice(0, 10) : dayKey(new Date(r.day)),
              countryCode: r.countryCode,
              visitors: r.visitors,
            })),
          ),
  };
}

export async function purgeOldPageViews(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ANALYTICS_RETENTION_DAYS);
  const result = await prisma.sitePageView.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
