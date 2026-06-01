import type { CalendarTableRow } from "@/lib/club-bookings-calendar";
import { BOOKING_TIMEZONE } from "@/lib/table-booking";

type BookingSlice = {
  startsAt: string;
  endsAt: string;
  status: string;
  kind?: string;
  tableRowId: string;
};

export function computeBookingAnalytics(
  bookings: BookingSlice[],
  tables: CalendarTableRow[],
  rangeDayKeys: string[],
  slotMinutes: number,
): {
  utilizationPercent: number;
  peakHourLabel: string;
  bookedMinutes: number;
  capacityMinutes: number;
} {
  const active = bookings.filter(
    (b) => b.status === "CONFIRMED" || b.status === "PENDING" || b.kind === "BLOCK",
  );
  let bookedMinutes = 0;
  const hourCounts = new Map<number, number>();

  for (const b of active) {
    const start = new Date(b.startsAt);
    const end = new Date(b.endsAt);
    const mins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
    bookedMinutes += mins;
    const hourFmt = new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: BOOKING_TIMEZONE,
    });
    const hour = Number(hourFmt.format(start).slice(0, 2));
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + mins);
  }

  const days = Math.max(1, rangeDayKeys.length);
  const tableCount = Math.max(1, tables.length);
  const capacityMinutes = days * tableCount * (24 * 60) * 0.4;
  const utilizationPercent = Math.min(
    100,
    Math.round((bookedMinutes / Math.max(capacityMinutes, 1)) * 100),
  );

  let peakHour = 0;
  let peakMins = 0;
  for (const [h, m] of hourCounts) {
    if (m > peakMins) {
      peakMins = m;
      peakHour = h;
    }
  }

  const peakHourLabel =
    peakMins > 0 ? `${String(peakHour).padStart(2, "0")}:00` : "—";

  return {
    utilizationPercent,
    peakHourLabel,
    bookedMinutes,
    capacityMinutes,
  };
}

export function exportBookingsCsv(
  rows: {
    guest: string;
    phone: string;
    table: string;
    date: string;
    time: string;
    status: string;
    kind: string;
    note: string;
  }[],
): string {
  const header = ["Гость", "Телефон", "Стол", "Дата", "Время", "Статус", "Тип", "Комментарий"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    header.map(escape).join(";"),
    ...rows.map((r) =>
      [r.guest, r.phone, r.table, r.date, r.time, r.status, r.kind, r.note].map(escape).join(";"),
    ),
  ];
  return "\uFEFF" + lines.join("\n");
}

export function exportBookingsPrintHtml(
  title: string,
  rows: {
    guest: string;
    phone: string;
    table: string;
    date: string;
    time: string;
    status: string;
    kind: string;
    note: string;
  }[],
): string {
  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const trs = rows
    .map(
      (r) =>
        `<tr><td>${esc(r.guest)}</td><td>${esc(r.phone)}</td><td>${esc(r.table)}</td><td>${esc(r.date)}</td><td>${esc(r.time)}</td><td>${esc(r.status)}</td><td>${esc(r.kind)}</td><td>${esc(r.note)}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px}h1{font-size:18px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f4f4f5}</style></head>
<body><h1>${esc(title)}</h1><table><thead><tr><th>Гость</th><th>Телефон</th><th>Стол</th><th>Дата</th><th>Время</th><th>Статус</th><th>Тип</th><th>Комментарий</th></tr></thead><tbody>${trs}</tbody></table></body></html>`;
}
