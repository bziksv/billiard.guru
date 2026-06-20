"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ANALYTICS_COUNTRY_UNKNOWN,
  ANALYTICS_PERIOD_OPTIONS,
  ANALYTICS_SURFACE_LABELS,
  ANALYTICS_SURFACE_SHORT_LABELS,
  type AnalyticsSurfaceId,
} from "@/lib/analytics/constants";
import type {
  AnalyticsCountryDailySeries,
  AnalyticsDailyPoint,
  AnalyticsHourlyPoint,
  RecentVisitsPage,
  VisitorAnalyticsReport,
} from "@/lib/analytics/stats-server";
import { countryFlagEmoji, countryNameFromCode } from "@/lib/analytics/geo";
import { adminTabClass } from "@/lib/admin-ui";
import {
  AdminFilterSelect,
  AdminTableSearchField,
  AdminTableToolbar,
} from "@/components/admin/admin-table-toolbar";
import { cn } from "@/lib/cn";

function formatInt(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

/** Целочисленные деления оси Y для графиков посетителей. */
function chartYScale(maxData: number): { ticks: number[]; scaleMax: number } {
  const safeMax = Math.max(1, maxData);
  const step = Math.max(1, Math.ceil(safeMax / 4));
  const scaleMax = Math.ceil(safeMax / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= scaleMax; v += step) ticks.push(v);
  return { ticks, scaleMax };
}

function ChartYAxis({
  ticks,
  scaleMax,
  pad,
  innerH,
  width,
  padRight,
}: {
  ticks: number[];
  scaleMax: number;
  pad: { top: number; left: number };
  innerH: number;
  width: number;
  padRight: number;
}) {
  const toY = (v: number) => pad.top + innerH - (v / scaleMax) * innerH;

  return (
    <>
      {ticks.map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line
              x1={pad.left}
              y1={y}
              x2={width - padRight}
              y2={y}
              stroke="currentColor"
              strokeOpacity={v === 0 ? 0.15 : 0.08}
            />
            <text
              x={pad.left - 6}
              y={y + 3.5}
              textAnchor="end"
              className="fill-[var(--admin-text-muted)] text-[10px] tabular-nums"
            >
              {formatInt(v)}
            </text>
          </g>
        );
      })}
    </>
  );
}

const CHART_PAD = { top: 12, right: 8, bottom: 28, left: 40 } as const;

const COUNTRY_CHART_COLORS = [
  "rgb(167 139 250)",
  "rgb(251 191 36)",
  "rgb(34 211 238)",
  "rgb(251 146 60)",
  "rgb(163 230 53)",
  "rgb(232 121 249)",
];

function KpiCard({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: string;
  hint: string;
  accent: "emerald" | "sky" | "violet" | "amber" | "rose";
}) {
  const accentClass = {
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/25 text-emerald-400",
    sky: "from-sky-500/20 to-sky-600/5 border-sky-500/25 text-sky-400",
    violet: "from-violet-500/20 to-violet-600/5 border-violet-500/25 text-violet-400",
    amber: "from-amber-500/20 to-amber-600/5 border-amber-500/25 text-amber-400",
    rose: "from-rose-500/20 to-rose-600/5 border-rose-500/25 text-rose-400",
  }[accent];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br p-5",
        accentClass,
      )}
    >
      <p className="text-sm font-medium text-[var(--admin-text-secondary)]">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      <p className="admin-muted mt-2 text-xs leading-relaxed">{hint}</p>
    </div>
  );
}

function VisitorsChart({ daily }: { daily: AnalyticsDailyPoint[] }) {
  const width = 640;
  const height = 200;
  const pad = CHART_PAD;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const rawMax = useMemo(() => {
    let m = 0;
    for (const d of daily) {
      m = Math.max(m, d.marketingVisitors, d.adminVisitors, d.manageVisitors);
    }
    return m;
  }, [daily]);

  const { ticks, scaleMax } = useMemo(() => chartYScale(rawMax), [rawMax]);

  const points = useMemo(() => {
    const n = Math.max(daily.length - 1, 1);
    const toX = (i: number) => pad.left + (i / n) * innerW;
    const toY = (v: number) => pad.top + innerH - (v / scaleMax) * innerH;

    const marketing = daily
      .map((d, i) => `${toX(i)},${toY(d.marketingVisitors)}`)
      .join(" ");
    const admin = daily
      .map((d, i) => `${toX(i)},${toY(d.adminVisitors)}`)
      .join(" ");
    const manage = daily
      .map((d, i) => `${toX(i)},${toY(d.manageVisitors)}`)
      .join(" ");

    const marketingArea = [
      `${pad.left},${pad.top + innerH}`,
      ...daily.map((d, i) => `${toX(i)},${toY(d.marketingVisitors)}`),
      `${pad.left + innerW},${pad.top + innerH}`,
    ].join(" ");

    const toPoint = (i: number, v: number) => ({ x: toX(i), y: toY(v) });

    return { marketing, admin, manage, marketingArea, toPoint };
  }, [daily, innerH, innerW, scaleMax, pad.left, pad.top]);

  const labelStep = daily.length <= 10 ? 1 : daily.length <= 20 ? 2 : Math.ceil(daily.length / 8);
  const showDots = daily.length <= 31;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[320px] w-full"
        role="img"
        aria-label="График уникальных посетителей по дням"
      >
        <defs>
          <linearGradient id="marketingFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(52 211 153)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(52 211 153)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <ChartYAxis
          ticks={ticks}
          scaleMax={scaleMax}
          pad={pad}
          innerH={innerH}
          width={width}
          padRight={pad.right}
        />
        <polygon points={points.marketingArea} fill="url(#marketingFill)" />
        <polyline
          points={points.marketing}
          fill="none"
          stroke="rgb(52 211 153)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={points.admin}
          fill="none"
          stroke="rgb(56 189 248)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="6 4"
        />
        <polyline
          points={points.manage}
          fill="none"
          stroke="rgb(251 113 133)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {showDots &&
          daily.map((d, i) => {
            const m = points.toPoint(i, d.marketingVisitors);
            const a = points.toPoint(i, d.adminVisitors);
            const g = points.toPoint(i, d.manageVisitors);
            return (
              <g key={d.date}>
                {d.marketingVisitors > 0 && (
                  <circle cx={m.x} cy={m.y} r={3.5} fill="rgb(52 211 153)" stroke="#18181b" strokeWidth="1">
                    <title>
                      {d.label}: маркетинг — {formatInt(d.marketingVisitors)} уник.
                    </title>
                  </circle>
                )}
                {d.adminVisitors > 0 && (
                  <circle cx={a.x} cy={a.y} r={3} fill="rgb(56 189 248)" stroke="#18181b" strokeWidth="1">
                    <title>
                      {d.label}: админка — {formatInt(d.adminVisitors)} уник.
                    </title>
                  </circle>
                )}
                {d.manageVisitors > 0 && (
                  <circle cx={g.x} cy={g.y} r={3} fill="rgb(251 113 133)" stroke="#18181b" strokeWidth="1">
                    <title>
                      {d.label}: клуб — {formatInt(d.manageVisitors)} уник.
                    </title>
                  </circle>
                )}
              </g>
            );
          })}
        {daily.map((d, i) =>
          i % labelStep === 0 || i === daily.length - 1 ? (
            <text
              key={d.date}
              x={pad.left + (i / Math.max(daily.length - 1, 1)) * innerW}
              y={height - 6}
              textAnchor="middle"
              className="fill-[var(--admin-text-secondary)] text-[10px]"
            >
              {d.label}
            </text>
          ) : null,
        )}
      </svg>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 rounded bg-emerald-400" />
          Маркетинг — уникальные
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 rounded border-b-2 border-dashed border-sky-400" />
          Админка — уникальные
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 rounded bg-rose-400" />
          Управление клубом — уникальные
        </span>
        {showDots && (
          <span className="admin-muted">Наведите на точку — точное число за день</span>
        )}
      </div>
    </div>
  );
}

function TodayHourlyChart({ hourly }: { hourly: AnalyticsHourlyPoint[] }) {
  const hasData = hourly.some(
    (h) => h.marketingViews + h.adminViews + h.manageViews > 0,
  );
  const maxTotal = Math.max(
    1,
    ...hourly.map((h) => h.marketingViews + h.adminViews + h.manageViews),
  );

  if (!hasData) {
    return <p className="admin-muted text-sm">Пока нет просмотров за сегодня.</p>;
  }

  return (
    <div>
      <div className="flex h-44 items-end gap-1 border-b border-[var(--admin-border)] pb-1">
        {hourly.map((h) => {
          const total = h.marketingViews + h.adminViews + h.manageViews;
          const heightPct = total > 0 ? Math.max(10, (total / maxTotal) * 100) : 0;
          return (
            <div
              key={h.hour}
              className="flex min-w-0 flex-1 flex-col items-center justify-end self-stretch"
              title={`${h.label} — ${formatInt(total)} просм.`}
            >
              <div
                className="flex w-full max-w-5 flex-col justify-end overflow-hidden rounded-t-sm"
                style={{ height: `${heightPct}%` }}
              >
                {h.manageViews > 0 && (
                  <div
                    className="w-full bg-rose-400"
                    style={{ height: `${(h.manageViews / total) * 100}%` }}
                  />
                )}
                {h.adminViews > 0 && (
                  <div
                    className="w-full bg-sky-400"
                    style={{ height: `${(h.adminViews / total) * 100}%` }}
                  />
                )}
                {h.marketingViews > 0 && (
                  <div
                    className="w-full bg-emerald-400"
                    style={{ height: `${(h.marketingViews / total) * 100}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1">
        {hourly.map((h, i) => (
          <span
            key={h.hour}
            className="min-w-0 flex-1 truncate text-center text-[9px] tabular-nums text-[var(--admin-text-muted)]"
          >
            {i % 2 === 0 || i === hourly.length - 1 ? h.label.slice(0, 2) : ""}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-emerald-400" />
          Сайт
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-sky-400" />
          Админка
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm bg-rose-400" />
          Клуб
        </span>
      </div>
    </div>
  );
}

function TodayCountriesChart({
  countries,
}: {
  countries: VisitorAnalyticsReport["topCountries"];
}) {
  if (countries.length === 0) {
    return (
      <p className="admin-muted text-sm">
        Нет данных по странам за сегодня — появится после визитов с геолокацией.
      </p>
    );
  }

  const maxVisitors = countries[0]?.visitors ?? 1;

  return (
    <ol className="space-y-3">
      {countries.slice(0, 8).map((row) => (
        <li key={row.countryCode}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span aria-hidden>{countryFlagEmoji(row.countryCode)}</span>
              <span className="truncate font-medium">{row.countryName}</span>
            </span>
            <span className="admin-muted shrink-0 text-xs tabular-nums">
              {formatInt(row.visitors)} уник.
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-border)]">
            <div
              className="h-full rounded-full bg-violet-500/80"
              style={{
                width: `${Math.max(6, Math.round((row.visitors / maxVisitors) * 100))}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function CountriesChart({ series }: { series: AnalyticsCountryDailySeries[] }) {
  const width = 640;
  const height = 220;
  const pad = CHART_PAD;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const days = series[0]?.daily ?? [];

  const rawMax = useMemo(() => {
    let m = 0;
    for (const s of series) {
      for (const d of s.daily) {
        m = Math.max(m, d.visitors);
      }
    }
    return m;
  }, [series]);

  const { ticks, scaleMax } = useMemo(() => chartYScale(rawMax), [rawMax]);

  const lineData = useMemo(() => {
    const n = Math.max(days.length - 1, 1);
    const toX = (i: number) => pad.left + (i / n) * innerW;
    const toY = (v: number) => pad.top + innerH - (v / scaleMax) * innerH;

    return series.map((s) => ({
      countryCode: s.countryCode,
      countryName: s.countryName,
      points: s.daily.map((d, i) => `${toX(i)},${toY(d.visitors)}`).join(" "),
      dots: s.daily.map((d, i) => ({
        x: toX(i),
        y: toY(d.visitors),
        label: d.label,
        visitors: d.visitors,
      })),
    }));
  }, [days.length, innerH, innerW, scaleMax, pad.left, pad.top, series]);

  const labelStep =
    days.length <= 10 ? 1 : days.length <= 20 ? 2 : Math.ceil(days.length / 8);
  const showDots = days.length <= 31;

  if (series.length === 0) {
    return (
      <p className="admin-muted text-sm">
        Нет данных по странам — появится после визитов с определённой геолокацией.
      </p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[320px] w-full"
        role="img"
        aria-label="График уникальных посетителей по странам"
      >
        <ChartYAxis
          ticks={ticks}
          scaleMax={scaleMax}
          pad={pad}
          innerH={innerH}
          width={width}
          padRight={pad.right}
        />
        {lineData.map((line, idx) => (
          <polyline
            key={line.countryCode}
            points={line.points}
            fill="none"
            stroke={COUNTRY_CHART_COLORS[idx % COUNTRY_CHART_COLORS.length]}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={idx % 2 === 1 ? "5 4" : undefined}
          />
        ))}
        {showDots &&
          lineData.map((line, idx) =>
            line.dots.map((dot, i) =>
              dot.visitors > 0 ? (
                <circle
                  key={`${line.countryCode}-${i}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={3}
                  fill={COUNTRY_CHART_COLORS[idx % COUNTRY_CHART_COLORS.length]}
                  stroke="#18181b"
                  strokeWidth="1"
                >
                  <title>
                    {dot.label}: {line.countryName} — {formatInt(dot.visitors)} уник.
                  </title>
                </circle>
              ) : null,
            ),
          )}
        {days.map((d, i) =>
          i % labelStep === 0 || i === days.length - 1 ? (
            <text
              key={d.date}
              x={pad.left + (i / Math.max(days.length - 1, 1)) * innerW}
              y={height - 6}
              textAnchor="middle"
              className="fill-[var(--admin-text-secondary)] text-[10px]"
            >
              {d.label}
            </text>
          ) : null,
        )}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {series.map((s, idx) => (
          <span key={s.countryCode} className="inline-flex items-center gap-2">
            <span
              className="h-0.5 w-5 rounded"
              style={{ backgroundColor: COUNTRY_CHART_COLORS[idx % COUNTRY_CHART_COLORS.length] }}
            />
            <span aria-hidden>{countryFlagEmoji(s.countryCode)}</span>
            {s.countryName}
          </span>
        ))}
        {showDots && (
          <span className="admin-muted w-full sm:w-auto">Наведите на точку — число за день</span>
        )}
      </div>
    </div>
  );
}

function SurfaceBadge({ surface }: { surface: AnalyticsSurfaceId }) {
  const styles: Record<AnalyticsSurfaceId, string> = {
    MARKETING: "bg-emerald-500/15 text-emerald-400",
    ADMIN: "bg-sky-500/15 text-sky-400",
    MANAGE: "bg-rose-500/15 text-rose-400",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
        styles[surface] ?? "bg-zinc-500/15 text-zinc-400",
      )}
    >
      {ANALYTICS_SURFACE_SHORT_LABELS[surface] ?? surface}
    </span>
  );
}

export function VisitorAnalyticsPanel() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<VisitorAnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/analytics?days=${days}`);
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Ошибка загрузки");
      return;
    }
    setReport(json as VisitorAnalyticsReport);
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const marketingTop = useMemo(
    () => report?.topPages.filter((p) => p.surface === "MARKETING").slice(0, 8) ?? [],
    [report],
  );
  const adminTop = useMemo(
    () => report?.topPages.filter((p) => p.surface === "ADMIN").slice(0, 8) ?? [],
    [report],
  );
  const manageTop = useMemo(
    () => report?.topPages.filter((p) => p.surface === "MANAGE").slice(0, 8) ?? [],
    [report],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="admin-page-title">Статистика посетителей</h1>
          <p className="admin-page-lead mt-1 max-w-2xl">
            Собственная аналитика: маркетинговый сайт, админ-панель и управление клубом
            (/manage). Уникальные посетители и доля авторизованных. Сайт — после согласия
            на cookie, админка и кабинет клуба — всегда.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--admin-border)] p-1">
          {ANALYTICS_PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={adminTabClass(days === opt.value)}
              onClick={() => setDays(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && !report && (
        <p className="admin-muted text-sm">Загрузка статистики…</p>
      )}

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              title="Маркетинговый сайт"
              value={formatInt(report.totals.uniqueVisitorsMarketing)}
              hint={`${formatInt(report.totals.pageViewsMarketing)} просмотров за период`}
              accent="emerald"
            />
            <KpiCard
              title="Админ-панель"
              value={formatInt(report.totals.uniqueVisitorsAdmin)}
              hint={`${formatInt(report.totals.pageViewsAdmin)} просмотров за период`}
              accent="sky"
            />
            <KpiCard
              title="Управление клубом"
              value={formatInt(report.totals.uniqueVisitorsManage)}
              hint={`${formatInt(report.totals.pageViewsManage)} просмотров за период · /manage`}
              accent="rose"
            />
            <KpiCard
              title="Всего уникальных"
              value={formatInt(report.totals.uniqueVisitorsAll)}
              hint="Один человек = один visitor ID (cookie), без дублей между разделами"
              accent="violet"
            />
            <KpiCard
              title="Зарегистрированные"
              value={formatInt(report.totals.registeredVisitors)}
              hint={`${report.totals.registeredSharePct}% от уникальных · ${formatInt(report.totals.anonymousVisitors)} без входа`}
              accent="amber"
            />
          </div>

          <div className="admin-card rounded-xl border border-[var(--admin-border)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">
                  {days === 1 ? "Активность по часам" : "Динамика по дням"}
                </h2>
                <p className="admin-muted text-sm">
                  {days === 1
                    ? "Просмотры страниц с 00:00 до текущего часа"
                    : "Уникальные посетители в сутки"}
                </p>
              </div>
              {loading && <span className="admin-muted text-xs">Обновление…</span>}
            </div>
            {days === 1 && report.hourly ? (
              <TodayHourlyChart hourly={report.hourly} />
            ) : (
              <VisitorsChart daily={report.daily} />
            )}
          </div>

          <div className="admin-card rounded-xl border border-[var(--admin-border)] p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold">
                {days === 1 ? "Страны за сегодня" : "Динамика по странам"}
              </h2>
              <p className="admin-muted text-sm">
                {days === 1
                  ? "Уникальные посетители по стране"
                  : "Уникальные посетители в сутки · топ-6 стран за период"}
              </p>
            </div>
            {days === 1 ? (
              <TodayCountriesChart countries={report.topCountries} />
            ) : (
              <CountriesChart series={report.countryDaily} />
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <TopPagesTable title="Популярные страницы — сайт" pages={marketingTop} barClass="bg-emerald-500/70" />
            <TopPagesTable title="Популярные страницы — админка" pages={adminTop} barClass="bg-sky-500/70" />
            <TopPagesTable title="Популярные страницы — клуб" pages={manageTop} barClass="bg-rose-500/70" />
          </div>

          {report.topCountries.length > 0 && days !== 1 && (
            <TopCountriesBlock countries={report.topCountries} />
          )}

          <RecentVisitsTable
            days={days}
            retentionLabel={report.retentionLabel}
            generatedAt={report.generatedAt}
            topCountries={report.topCountries}
          />
        </>
      )}
    </div>
  );
}

function CountryCell({
  countryCode,
  countryName,
}: {
  countryCode: string | null;
  countryName: string | null;
}) {
  if (!countryCode) {
    return <span className="admin-muted text-xs">—</span>;
  }
  const label = countryNameFromCode(countryCode) || countryName || countryCode;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden>{countryFlagEmoji(countryCode)}</span>
      <span>{label}</span>
    </span>
  );
}

function TopCountriesBlock({
  countries,
}: {
  countries: VisitorAnalyticsReport["topCountries"];
}) {
  const maxVisitors = countries[0]?.visitors ?? 1;

  return (
    <div className="admin-card rounded-xl border border-[var(--admin-border)] p-5">
      <h2 className="mb-1 text-base font-semibold">Страны посетителей</h2>
      <p className="admin-muted mb-4 text-sm">Уникальные посетители по стране за период</p>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {countries.map((row, i) => (
          <li
            key={row.countryCode}
            className="flex items-center gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-inset-bg)] px-3 py-2.5"
          >
            <span className="admin-muted w-4 shrink-0 text-xs tabular-nums">{i + 1}</span>
            <span className="text-lg leading-none" aria-hidden>
              {countryFlagEmoji(row.countryCode)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.countryName}</p>
              <p className="admin-muted text-xs">
                {formatInt(row.visitors)} уник. · {formatInt(row.views)} просм.
              </p>
            </div>
            <div className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--admin-border)]">
              <div
                className="h-full rounded-full bg-violet-500/70"
                style={{
                  width: `${Math.max(10, Math.round((row.visitors / maxVisitors) * 100))}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RecentVisitsTable({
  days,
  retentionLabel,
  generatedAt,
  topCountries,
}: {
  days: number;
  retentionLabel: string;
  generatedAt: string;
  topCountries: VisitorAnalyticsReport["topCountries"];
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RecentVisitsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [surfaceFilter, setSurfaceFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [registeredFilter, setRegisteredFilter] = useState("");
  const [pathSearch, setPathSearch] = useState("");
  const [pathDebounced, setPathDebounced] = useState("");
  const pageSize = 20;

  useEffect(() => {
    const timer = setTimeout(() => setPathDebounced(pathSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [pathSearch]);

  const hasActiveFilters = Boolean(
    surfaceFilter || countryFilter || registeredFilter || pathDebounced,
  );

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      days: String(days),
      page: String(page),
      pageSize: String(pageSize),
    });
    if (surfaceFilter) qs.set("surface", surfaceFilter);
    if (countryFilter) qs.set("country", countryFilter);
    if (registeredFilter) qs.set("registered", registeredFilter);
    if (pathDebounced) qs.set("path", pathDebounced);

    const res = await fetch(`/api/admin/analytics/recent?${qs}`);
    const json = await res.json();
    setLoading(false);
    if (res.ok) {
      setData(json as RecentVisitsPage);
    }
  }, [countryFilter, days, page, pathDebounced, registeredFilter, surfaceFilter]);

  useEffect(() => {
    setPage(1);
  }, [days, surfaceFilter, countryFilter, registeredFilter, pathDebounced]);

  useEffect(() => {
    void load();
  }, [load]);

  const surfaceOptions = useMemo(
    () => [
      { value: "", label: "Все разделы" },
      ...(
        Object.entries(ANALYTICS_SURFACE_LABELS) as [AnalyticsSurfaceId, string][]
      ).map(([value, label]) => ({ value, label })),
    ],
    [],
  );

  const countryOptions = useMemo(
    () => [
      { value: "", label: "Все страны" },
      { value: ANALYTICS_COUNTRY_UNKNOWN, label: "Не определена" },
      ...topCountries.map((c) => ({
        value: c.countryCode,
        label: `${countryFlagEmoji(c.countryCode)} ${c.countryName}`.trim(),
      })),
    ],
    [topCountries],
  );

  const registeredOptions = useMemo(
    () => [
      { value: "", label: "Все посетители" },
      { value: "yes", label: "Зарегистрированные" },
      { value: "no", label: "Анонимные" },
    ],
    [],
  );

  const rangeLabel = useMemo(() => {
    if (!data || data.total === 0) return "0 записей";
    const from = (data.page - 1) * data.pageSize + 1;
    const to = Math.min(data.page * data.pageSize, data.total);
    return `${from}–${to} из ${formatInt(data.total)}`;
  }, [data]);

  const emptyMessage = hasActiveFilters
    ? "Нет визитов по выбранным фильтрам."
    : "Пока нет данных — откройте сайт с принятыми cookie или подождите первые визиты.";

  return (
    <div className="admin-card overflow-hidden rounded-xl border border-[var(--admin-border)]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">Последние визиты</h2>
          <p className="admin-muted text-sm">
            Хранение {retentionLabel} · обновлено{" "}
            {new Intl.DateTimeFormat("ru-RU", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date(generatedAt))}
          </p>
        </div>
        {data && data.total > 0 && (
          <p className="admin-muted text-sm tabular-nums">{rangeLabel}</p>
        )}
      </div>

      <AdminTableToolbar>
        <AdminFilterSelect
          label="Раздел"
          options={surfaceOptions}
          value={surfaceFilter}
          onChange={setSurfaceFilter}
          placeholder="Все разделы"
        />
        <AdminFilterSelect
          label="Страна"
          options={countryOptions}
          value={countryFilter}
          onChange={setCountryFilter}
          placeholder="Все страны"
          searchPlaceholder="Страна…"
        />
        <AdminFilterSelect
          label="Посетитель"
          options={registeredOptions}
          value={registeredFilter}
          onChange={setRegisteredFilter}
          placeholder="Все"
        />
        <AdminTableSearchField
          value={pathSearch}
          onChange={setPathSearch}
          placeholder="/tournaments, /admin…"
        />
        {hasActiveFilters && (
          <button
            type="button"
            className="admin-btn-secondary self-end"
            onClick={() => {
              setSurfaceFilter("");
              setCountryFilter("");
              setRegisteredFilter("");
              setPathSearch("");
            }}
          >
            Сбросить
          </button>
        )}
      </AdminTableToolbar>

      <div className="admin-table-wrap admin-table-wrap--scroll rounded-none border-0 border-t border-[var(--admin-border)]">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="admin-thead">
            <tr>
              <th className="w-[130px] px-4 py-3 font-medium">Когда</th>
              <th className="w-[88px] px-4 py-3 font-medium">Раздел</th>
              <th className="min-w-[200px] px-4 py-3 font-medium">Страница</th>
              <th className="w-[160px] px-4 py-3 font-medium">Страна</th>
              <th className="min-w-[160px] px-4 py-3 font-medium">Посетитель</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={5} className="admin-muted px-4 py-8 text-center">
                  Загрузка…
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-muted px-4 py-8 text-center">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr key={row.id} className="admin-table-row align-middle">
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{row.atLabel}</td>
                  <td className="px-4 py-3">
                    <SurfaceBadge surface={row.surface} />
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <span className="block truncate font-mono text-xs" title={row.path}>
                      {row.path}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CountryCell countryCode={row.countryCode} countryName={row.countryName} />
                  </td>
                  <td className="px-4 py-3">
                    {row.isRegistered ? (
                      <span className="text-emerald-400">{row.playerLabel}</span>
                    ) : (
                      <span className="admin-muted font-mono text-xs">#{row.visitorId}…</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] px-5 py-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="admin-btn-secondary disabled:opacity-40"
          >
            ← Назад
          </button>
          <span className="admin-muted text-sm tabular-nums">
            Страница {data.page} из {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="admin-btn-secondary disabled:opacity-40"
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}

function TopPagesTable({
  title,
  pages,
  barClass = "bg-emerald-500/70",
}: {
  title: string;
  pages: VisitorAnalyticsReport["topPages"];
  barClass?: string;
}) {
  return (
    <div className="admin-card rounded-xl border border-[var(--admin-border)] p-5">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {pages.length === 0 ? (
        <p className="admin-muted text-sm">Нет просмотров за выбранный период.</p>
      ) : (
        <ol className="space-y-3">
          {pages.map((page, i) => (
            <li key={`${page.path}-${page.surface}`} className="flex items-start gap-3">
              <span className="admin-muted mt-0.5 w-5 shrink-0 text-xs tabular-nums">
                {i + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs">{page.path}</p>
                <p className="admin-muted mt-0.5 text-xs">
                  {formatInt(page.views)} просм. · {formatInt(page.visitors)} уник.
                </p>
              </div>
              <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--admin-border)]">
                <div
                  className={cn("h-full rounded-full", barClass)}
                  style={{
                    width: `${Math.max(8, Math.round((page.views / (pages[0]?.views || 1)) * 100))}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
