import { parseFloorPlan } from "@/lib/club-floor-plan";
import {
  addDaysToKey,
  bookingDayKey,
  buildCalendarTableRows,
  buildDayKeys,
  ensureUnassignedRows,
  formatBookingTimeRange,
  formatCalendarDayHeader,
  todayDayKey,
} from "@/lib/club-bookings-calendar";
import { mapManageBookingRow } from "@/lib/club-bookings-manage";
import { isClubOpenOnDay } from "@/lib/club-bookings-open-hours";

export type CalendarImageBooking = {
  id: string;
  tableRowId: string;
  dayKey: string;
  startsAt: string;
  endsAt: string;
  status: string;
  kind: string;
  displayName: string;
};

export type CalendarImageTable = {
  id: string;
  label: string;
};

export type CalendarImageOptions = {
  weekLabel: string;
  days: string[];
  closedDays: string[];
  tables: CalendarImageTable[];
  bookings: CalendarImageBooking[];
  highlightBookingId: string;
  width?: number;
};

const WIDTH = 900;
const ROW_LABEL_W = 118;
const HEADER_H = 52;
const CHIP_H = 36;
const CHIP_GAP = 3;
const CELL_PAD = 4;
const ROW_MIN_H = 44;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/** Начало 7-дневного окна: как в админке, если бронь попадает в «эту неделю», иначе — с дня брони. */
export function weekFromDayForBooking(bookingDayKey: string): string {
  const today = todayDayKey();
  for (let i = 0; i < 7; i++) {
    if (addDaysToKey(today, i) === bookingDayKey) return today;
  }
  return bookingDayKey;
}

function chipStyle(booking: CalendarImageBooking): {
  fill: string;
  stroke: string;
  text: string;
} {
  if (booking.kind === "BLOCK") {
    return { fill: "#3f3f468c", stroke: "#71717a", text: "#e4e4e7" };
  }
  if (booking.status === "PENDING") {
    return { fill: "#78350f80", stroke: "#f59e0b", text: "#fef3c7" };
  }
  return { fill: "#064e3b8c", stroke: "#10b981", text: "#d1fae5" };
}

function buildBookingsByCell(
  bookings: CalendarImageBooking[],
): Map<string, CalendarImageBooking[]> {
  const map = new Map<string, CalendarImageBooking[]>();
  for (const b of bookings) {
    const key = `${b.tableRowId}|${b.dayKey}`;
    const list = map.get(key) ?? [];
    list.push(b);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  return map;
}

function cellHeight(chipCount: number): number {
  if (chipCount === 0) return ROW_MIN_H;
  return CELL_PAD * 2 + chipCount * CHIP_H + (chipCount - 1) * CHIP_GAP;
}

export function buildWeekCalendarSvg(options: CalendarImageOptions): string {
  const width = options.width ?? WIDTH;
  const dayCount = options.days.length;
  const dayColW = (width - ROW_LABEL_W) / Math.max(dayCount, 1);
  const today = todayDayKey();
  const byCell = buildBookingsByCell(options.bookings);

  const rowHeights = options.tables.map((table) => {
    let max = ROW_MIN_H;
    for (const day of options.days) {
      const count = byCell.get(`${table.id}|${day}`)?.length ?? 0;
      max = Math.max(max, cellHeight(count));
    }
    return max;
  });

  const gridTop = HEADER_H + 36;
  let y = gridTop;
  const parts: string[] = [];

  parts.push(`
    <text x="16" y="26" font-family="system-ui,sans-serif" font-size="17" font-weight="700" fill="#fafafa">
      ${escapeXml("Брони столов")}
    </text>
    <text x="16" y="46" font-family="system-ui,sans-serif" font-size="12" fill="#a1a1aa">
      ${escapeXml(options.weekLabel)} · 🟡 ожидает · 🟢 подтверждена · ★ новая заявка
    </text>`);

  // Column headers
  parts.push(
    `<rect x="0" y="${gridTop - 28}" width="${width}" height="28" fill="#18181b"/>`,
  );
  parts.push(`
    <text x="12" y="${gridTop - 10}" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="#a1a1aa">
      Стол
    </text>`);

  for (let di = 0; di < options.days.length; di++) {
    const day = options.days[di]!;
    const closed = options.closedDays.includes(day);
    const isToday = day === today && !closed;
    const x = ROW_LABEL_W + di * dayColW;
    const headerFill = closed ? "#1c1917" : isToday ? "#064e3b55" : "#18181b";
    parts.push(
      `<rect x="${x}" y="${gridTop - 28}" width="${dayColW}" height="28" fill="${headerFill}"/>`,
    );
    const label = formatCalendarDayHeader(day);
    parts.push(`
      <text x="${x + dayColW / 2}" y="${closed ? gridTop - 18 : gridTop - 10}" text-anchor="middle"
        font-family="system-ui,sans-serif" font-size="10" font-weight="600" fill="${closed ? "#71717a" : "#e4e4e7"}">
        ${escapeXml(label)}
      </text>`);
    if (closed) {
      parts.push(`
        <text x="${x + dayColW / 2}" y="${gridTop - 6}" text-anchor="middle"
          font-family="system-ui,sans-serif" font-size="9" fill="#52525b">закрыто</text>`);
    }
  }

  for (let ti = 0; ti < options.tables.length; ti++) {
    const table = options.tables[ti]!;
    const rowH = rowHeights[ti]!;
    const rowBg = ti % 2 === 0 ? "#0f0f12" : "#09090b";

    parts.push(`<rect x="0" y="${y}" width="${width}" height="${rowH}" fill="${rowBg}"/>`);
    parts.push(
      `<line x1="0" y1="${y + rowH}" x2="${width}" y2="${y + rowH}" stroke="#27272a" stroke-width="1"/>`,
    );
    parts.push(`
      <text x="12" y="${y + rowH / 2 + 4}" font-family="system-ui,sans-serif" font-size="11" font-weight="500" fill="#fafafa">
        ${escapeXml(truncate(table.label, 16))}
      </text>`);
    parts.push(
      `<line x1="${ROW_LABEL_W}" y1="${y}" x2="${ROW_LABEL_W}" y2="${y + rowH}" stroke="#27272a" stroke-width="1"/>`,
    );

    for (let di = 0; di < options.days.length; di++) {
      const day = options.days[di]!;
      const closed = options.closedDays.includes(day);
      const isToday = day === today && !closed;
      const x = ROW_LABEL_W + di * dayColW;
      const cellFill = closed ? "#1a1a1e" : isToday ? "#064e3b22" : "transparent";
      parts.push(`<rect x="${x}" y="${y}" width="${dayColW}" height="${rowH}" fill="${cellFill}"/>`);

      const cellBookings = byCell.get(`${table.id}|${day}`) ?? [];
      if (cellBookings.length === 0) {
        parts.push(`
          <text x="${x + dayColW / 2}" y="${y + rowH / 2 + 4}" text-anchor="middle"
            font-family="system-ui,sans-serif" font-size="11" fill="#3f3f46">—</text>`);
      } else {
        let cy = y + CELL_PAD;
        for (const b of cellBookings) {
          const style = chipStyle(b);
          const isNew = b.id === options.highlightBookingId;
          const chipW = dayColW - CELL_PAD * 2;
          const chipX = x + CELL_PAD;
          if (isNew) {
            parts.push(`
              <rect x="${chipX - 2}" y="${cy - 2}" width="${chipW + 4}" height="${CHIP_H + 4}" rx="6"
                fill="none" stroke="#fcd34d" stroke-width="2" stroke-dasharray="4 2"/>`);
          }
          parts.push(`
            <rect x="${chipX}" y="${cy}" width="${chipW}" height="${CHIP_H}" rx="5"
              fill="${style.fill}" stroke="${style.stroke}" stroke-width="1"/>`);
          parts.push(`
            <text x="${chipX + 5}" y="${cy + 14}" font-family="system-ui,sans-serif" font-size="10" font-weight="600" fill="${style.text}">
              ${escapeXml(formatBookingTimeRange(b.startsAt, b.endsAt))}${isNew ? " ★" : ""}
            </text>`);
          parts.push(`
            <text x="${chipX + 5}" y="${cy + 28}" font-family="system-ui,sans-serif" font-size="9" fill="${style.text}" opacity="0.92">
              ${escapeXml(truncate(b.displayName, 14))}
            </text>`);
          cy += CHIP_H + CHIP_GAP;
        }
      }

      if (di < options.days.length - 1) {
        parts.push(
          `<line x1="${x + dayColW}" y1="${y}" x2="${x + dayColW}" y2="${y + rowH}" stroke="#27272a" stroke-width="1"/>`,
        );
      }
    }

    y += rowH;
  }

  const totalHeight = y + 8;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">
  <rect width="100%" height="100%" fill="#09090b"/>
  ${parts.join("\n")}
</svg>`;
}

export async function renderWeekCalendarPng(options: CalendarImageOptions): Promise<Buffer | null> {
  const svg = buildWeekCalendarSvg(options);
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(Buffer.from(svg)).png({ compressionLevel: 8 }).toBuffer();
  } catch {
    return null;
  }
}

export async function buildCalendarImageOptionsForBooking(
  clubId: string,
  club: {
    floorPlan: unknown;
    tableCounts: unknown;
    weeklyHours: unknown;
    workingHours: string | null;
  },
  bookingId: string,
  bookingStartsAt: Date,
): Promise<CalendarImageOptions | null> {
  const floorPlan = parseFloorPlan(club.floorPlan);
  const bookingDay = bookingDayKey(bookingStartsAt);
  const fromDay = weekFromDayForBooking(bookingDay);
  const days = buildDayKeys(fromDay, 7);
  const rangeStart = new Date(`${fromDay}T00:00:00+03:00`);
  const lastDay = days[days.length - 1]!;
  const rangeEnd = new Date(`${lastDay}T23:59:59.999+03:00`);

  const { prisma } = await import("@/lib/prisma");
  const bookings = await prisma.tableBooking.findMany({
    where: {
      clubId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { lte: rangeEnd },
      endsAt: { gte: rangeStart },
    },
    include: {
      player: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const mapped = bookings.map((b) =>
    mapManageBookingRow(
      {
        ...b,
        playerNote: b.playerNote,
        clubNote: b.clubNote,
        guestName: b.guestName,
        guestPhone: b.guestPhone,
        kind: b.kind,
      },
      floorPlan,
      bookingDayKey,
    ),
  );

  const tableRows = ensureUnassignedRows(
    buildCalendarTableRows(club.floorPlan, club.tableCounts),
    bookings,
    floorPlan,
  );

  const closedDays = days.filter(
    (d) => !isClubOpenOnDay(club.weeklyHours, club.workingHours, d),
  );

  const weekLabel = `${formatCalendarDayHeader(days[0]!)} — ${formatCalendarDayHeader(days[days.length - 1]!)}`;

  return {
    weekLabel,
    days,
    closedDays,
    tables: tableRows,
    bookings: mapped,
    highlightBookingId: bookingId,
  };
}
