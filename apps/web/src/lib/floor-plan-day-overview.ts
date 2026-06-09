import {
  floorAmenityLabel,
  floorItemLabel,
  floorPlanContentBounds,
  floorPlanItemPosition,
  floorTableColor,
  parseFloorPlan,
  type ClubFloorPlan,
  type FloorPlanItem,
} from "@/lib/club-floor-plan";
import { clubTableFormatLabel, type ClubTableFormatId } from "@/lib/club-table-formats";
import type { FloorTableStatus } from "@/lib/floor-plan-booking";
import { BOOKING_TIMEZONE } from "@/lib/table-booking";

export type DayOverviewBookingRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  tableFormat: string;
  floorItemId: string | null;
  floorTableLabel: string | null;
  guestLabel: string;
  status: "PENDING" | "CONFIRMED";
  isNew: boolean;
};

export type DayOverviewImageOptions = {
  dayLabel: string;
  slotLabel: string;
  bookings: DayOverviewBookingRow[];
  tableStates: Record<string, FloorTableStatus>;
  highlightTableId?: string | null;
  width?: number;
};

type TableVisual = "free" | "pending" | "occupied" | "context" | "disabled";

const TABLE_W = 56;
const TABLE_H = 28;
const AMENITY_R = 18;
const WIDTH = 900;
const ROW_H = 26;
const SCHEDULE_PAD = 20;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTimeRange(startsAt: Date, endsAt: Date, timeZone = BOOKING_TIMEZONE): string {
  const fmt = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  return `${fmt.format(startsAt)}–${fmt.format(endsAt)}`;
}

function tableVisual(item: FloorPlanItem, tableStates: Record<string, FloorTableStatus>): TableVisual {
  if (item.kind !== "table" || !item.tableFormat) return "context";
  const status = tableStates[item.id];
  if (status === "pending") return "pending";
  if (status === "confirmed") return "occupied";
  if (status === "free" || !status) return "free";
  return "disabled";
}

function tableStyle(visual: TableVisual, format: ClubTableFormatId) {
  const base = floorTableColor(format);
  switch (visual) {
    case "free":
      return { stroke: "#34d399", fill: `${base}59`, opacity: 1 };
    case "pending":
      return { stroke: "#f59e0b", fill: "#f59e0b4d", opacity: 0.95 };
    case "occupied":
      return { stroke: "#ef4444", fill: "#ef444440", opacity: 0.85 };
    case "context":
      return { stroke: "#52525b", fill: "#27272a", opacity: 0.75 };
    default:
      return { stroke: "#3f3f46", fill: "#18181b", opacity: 0.55 };
  }
}

function bookingRowLabel(row: DayOverviewBookingRow): string {
  const table =
    row.floorTableLabel?.trim() ||
    clubTableFormatLabel(row.tableFormat as ClubTableFormatId);
  const status = row.isNew ? "★ новая" : row.status === "CONFIRMED" ? "✓" : "⏳";
  const guest =
    row.guestLabel.length > 22 ? `${row.guestLabel.slice(0, 20)}…` : row.guestLabel;
  return `${formatTimeRange(row.startsAt, row.endsAt)}  ${table}  ${guest}  ${status}`;
}

function buildScheduleSection(options: DayOverviewImageOptions): { svg: string; height: number } {
  const width = options.width ?? WIDTH;
  const sorted = [...options.bookings].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.id.localeCompare(b.id),
  );
  const maxRows = 14;
  const visible = sorted.slice(0, maxRows);
  const hidden = sorted.length - visible.length;

  const headerH = 72;
  const rowsH = visible.length * ROW_H + (hidden > 0 ? ROW_H : 0);
  const height = headerH + rowsH + 16;

  const rows: string[] = [];
  for (let i = 0; i < visible.length; i++) {
    const row = visible[i]!;
    const y = headerH + i * ROW_H;
    const bg = row.isNew ? "#f59e0b22" : i % 2 === 0 ? "#18181b" : "#0f0f12";
    const textColor = row.isNew ? "#fcd34d" : "#e4e4e7";
    rows.push(`
      <rect x="12" y="${y}" width="${width - 24}" height="${ROW_H - 2}" rx="4" fill="${bg}"/>
      <text x="20" y="${y + 17}" font-family="system-ui,sans-serif" font-size="13" fill="${textColor}">
        ${escapeXml(bookingRowLabel(row))}
      </text>`);
  }

  if (hidden > 0) {
    const y = headerH + visible.length * ROW_H;
    rows.push(`
      <text x="20" y="${y + 17}" font-family="system-ui,sans-serif" font-size="12" fill="#71717a">
        … ещё ${hidden} ${hidden === 1 ? "бронь" : hidden < 5 ? "брони" : "броней"}
      </text>`);
  }

  const svg = `
    <g>
      <text x="20" y="28" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#fafafa">
        ${escapeXml(`Брони на ${options.dayLabel}`)}
      </text>
      <text x="20" y="50" font-family="system-ui,sans-serif" font-size="12" fill="#a1a1aa">
        ${escapeXml(`Схема зала — на ${options.slotLabel} (новая заявка)`)} · 🟢 свободен · 🟠 ожидает · 🔴 занят
      </text>
      ${rows.join("\n")}
    </g>`;

  return { svg, height };
}

function buildFloorSection(
  plan: ClubFloorPlan,
  options: DayOverviewImageOptions,
  offsetY: number,
): { svg: string; height: number } {
  const width = options.width ?? WIDTH;
  const bounds = floorPlanContentBounds(plan.items, 5);
  const floorHeight = Math.max(280, Math.round(width * (bounds.spanY / bounds.spanX)));
  const pad = 24;

  const gridLines: string[] = [];
  const step = 24;
  for (let x = 0; x <= width; x += step) {
    gridLines.push(
      `<line x1="${x}" y1="${offsetY}" x2="${x}" y2="${offsetY + floorHeight}" stroke="#27272a" stroke-width="1"/>`,
    );
  }
  for (let y = 0; y <= floorHeight; y += step) {
    gridLines.push(
      `<line x1="0" y1="${offsetY + y}" x2="${width}" y2="${offsetY + y}" stroke="#27272a" stroke-width="1"/>`,
    );
  }

  const shapes: string[] = [];
  for (const item of plan.items) {
    const pos = floorPlanItemPosition(item, bounds);
    const cx = pad + ((width - pad * 2) * pos.left) / 100;
    const cy = offsetY + pad + ((floorHeight - pad * 2) * pos.top) / 100;
    const label = floorItemLabel(item);

    if (item.kind === "table" && item.tableFormat) {
      const visual = tableVisual(item, options.tableStates);
      const style = tableStyle(visual, item.tableFormat);
      const x = cx - TABLE_W / 2;
      const y = cy - TABLE_H / 2;
      const highlight =
        options.highlightTableId && item.id === options.highlightTableId
          ? `<rect x="${x - 3}" y="${y - 3}" width="${TABLE_W + 6}" height="${TABLE_H + 6}" rx="8"
              fill="none" stroke="#fcd34d" stroke-width="2.5" stroke-dasharray="4 2"/>`
          : "";
      shapes.push(`
        <g opacity="${style.opacity}">
          ${highlight}
          <rect x="${x}" y="${y}" width="${TABLE_W}" height="${TABLE_H}" rx="6"
            fill="${style.fill}" stroke="${style.stroke}" stroke-width="2.5"/>
          <text x="${cx}" y="${cy + 4}" text-anchor="middle"
            font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="#fafafa">
            ${escapeXml(label.length > 14 ? `${label.slice(0, 12)}…` : label)}
          </text>
        </g>`);
      continue;
    }

    const amenityLabel = floorAmenityLabel(item.kind as never, item.label);
    shapes.push(`
      <g opacity="0.9">
        <circle cx="${cx}" cy="${cy}" r="${AMENITY_R}" fill="#18181b" stroke="#52525b" stroke-width="1.5"/>
        <text x="${cx}" y="${cy + 4}" text-anchor="middle"
          font-family="system-ui,sans-serif" font-size="10" fill="#a1a1aa">
          ${escapeXml(amenityLabel.length > 10 ? `${amenityLabel.slice(0, 8)}…` : amenityLabel)}
        </text>
      </g>`);
  }

  return {
    svg: `${gridLines.join("\n")}\n${shapes.join("\n")}`,
    height: floorHeight,
  };
}

export function buildDayOverviewSvg(
  plan: ClubFloorPlan,
  options: DayOverviewImageOptions,
): string {
  const width = options.width ?? WIDTH;
  const schedule = buildScheduleSection(options);
  const floor = buildFloorSection(plan, options, schedule.height + SCHEDULE_PAD);
  const totalHeight = schedule.height + SCHEDULE_PAD + floor.height + 12;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">
  <rect width="100%" height="100%" fill="#09090b"/>
  ${schedule.svg}
  ${floor.svg}
</svg>`;
}

export async function renderDayOverviewPng(
  floorPlanRaw: unknown,
  options: DayOverviewImageOptions,
): Promise<Buffer | null> {
  const plan = parseFloorPlan(floorPlanRaw);
  if (!plan) return null;

  const svg = buildDayOverviewSvg(plan, options);
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(Buffer.from(svg)).png({ compressionLevel: 8 }).toBuffer();
  } catch {
    return null;
  }
}

export function formatDayOverviewLabel(date: Date, timeZone = BOOKING_TIMEZONE): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(date);
}

export function bookingCalendarDayKey(date: Date, timeZone = BOOKING_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date);
}

export function dayBookingsQueryWindow(anchor: Date): { queryStart: Date; queryEnd: Date; dayKey: string } {
  const dayKey = bookingCalendarDayKey(anchor);
  const queryStart = new Date(anchor.getTime() - 18 * 60 * 60_000);
  const queryEnd = new Date(anchor.getTime() + 30 * 60 * 60_000);
  return { queryStart, queryEnd, dayKey };
}

export { formatTimeRange as formatDayOverviewTimeRange };
