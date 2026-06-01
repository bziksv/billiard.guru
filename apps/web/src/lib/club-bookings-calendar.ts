import {
  floorItemLabel,
  parseFloorPlan,
  type ClubFloorPlan,
} from "@/lib/club-floor-plan";
import { clubBookingFormatEntries, BOOKING_TIMEZONE } from "@/lib/table-booking";

export type CalendarTableRow = {
  id: string;
  label: string;
  tableFormat: string;
};

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOOKING_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function bookingDayKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return dayKeyFmt.format(d);
}

export function todayDayKey(): string {
  return bookingDayKey(new Date());
}

/** YYYY-MM-DD + N days (calendar date, not TZ-shifted wall clock). */
export function addDaysToKey(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + delta);
  const next = new Date(utc);
  const y2 = next.getUTCFullYear();
  const m2 = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d2 = String(next.getUTCDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

export function buildDayKeys(fromDayKey: string, count: number): string[] {
  const n = Math.max(1, Math.min(count, 31));
  return Array.from({ length: n }, (_, i) => addDaysToKey(fromDayKey, i));
}

export function formatCalendarDayHeader(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    timeZone: BOOKING_TIMEZONE,
  }).format(date);
  const dayMonth = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: BOOKING_TIMEZONE,
  }).format(date);
  return `${weekday}, ${dayMonth}`;
}

export function formatBookingTimeRange(startsAt: string, endsAt: string): string {
  const timeFmt = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BOOKING_TIMEZONE,
  });
  return `${timeFmt.format(new Date(startsAt))}–${timeFmt.format(new Date(endsAt))}`;
}

export function buildCalendarTableRows(
  floorPlanRaw: unknown,
  tableCounts: unknown,
): CalendarTableRow[] {
  const plan = parseFloorPlan(floorPlanRaw);
  const tablesOnPlan =
    plan?.items.filter((item) => item.kind === "table" && item.tableFormat) ?? [];

  if (tablesOnPlan.length > 0) {
    return tablesOnPlan.map((item) => ({
      id: item.id,
      label: floorItemLabel(item),
      tableFormat: item.tableFormat!,
    }));
  }

  return clubBookingFormatEntries(tableCounts, plan).map((entry) => ({
    id: `format:${entry.id}`,
    label: entry.count > 1 ? `${entry.label} (${entry.count} ст.)` : entry.label,
    tableFormat: entry.id,
  }));
}

export function bookingTableRowId(
  floorItemId: string | null | undefined,
  tableFormat: string,
  plan: ClubFloorPlan | null,
): string {
  if (floorItemId && plan?.items.some((i) => i.id === floorItemId)) {
    return floorItemId;
  }
  if (plan && plan.items.some((i) => i.kind === "table")) {
    return `unassigned:${tableFormat}`;
  }
  return `format:${tableFormat}`;
}

export function ensureUnassignedRows(
  rows: CalendarTableRow[],
  bookings: { floorItemId: string | null; tableFormat: string }[],
  plan: ClubFloorPlan | null,
): CalendarTableRow[] {
  if (!plan?.items.some((i) => i.kind === "table")) return rows;

  const formats = new Set<string>();
  for (const b of bookings) {
    if (bookingTableRowId(b.floorItemId, b.tableFormat, plan).startsWith("unassigned:")) {
      formats.add(b.tableFormat);
    }
  }

  const extra: CalendarTableRow[] = [];
  for (const format of formats) {
    const id = `unassigned:${format}`;
    if (rows.some((r) => r.id === id)) continue;
    const label =
      clubBookingFormatEntries(null, plan).find((e) => e.id === format)?.label ?? format;
    extra.push({ id, label: `${label} (стол не выбран)`, tableFormat: format });
  }
  return [...rows, ...extra];
}
