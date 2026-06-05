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
import type { ClubTableFormatId } from "@/lib/club-table-formats";
import type { FloorTableStatus } from "@/lib/floor-plan-booking";

export type FloorPlanImageOptions = {
  bookingTableFormat: ClubTableFormatId;
  tableStates?: Record<string, FloorTableStatus>;
  width?: number;
};

type TableVisual = "free" | "pending" | "occupied" | "context" | "disabled";

const TABLE_W = 56;
const TABLE_H = 28;
const AMENITY_R = 18;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tableVisual(
  item: FloorPlanItem,
  options: FloorPlanImageOptions,
): TableVisual {
  if (item.kind !== "table" || !item.tableFormat) return "context";
  if (item.tableFormat !== options.bookingTableFormat) return "context";
  const status = options.tableStates?.[item.id];
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

/** SVG планировки для бронирования (как на сайте). */
export function buildFloorPlanSvg(
  plan: ClubFloorPlan,
  options: FloorPlanImageOptions,
): string {
  const width = options.width ?? 900;
  const bounds = floorPlanContentBounds(plan.items, 5);
  const height = Math.max(320, Math.round(width * (bounds.spanY / bounds.spanX)));
  const pad = 24;

  const gridLines: string[] = [];
  const step = 24;
  for (let x = 0; x <= width; x += step) {
    gridLines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#27272a" stroke-width="1"/>`,
    );
  }
  for (let y = 0; y <= height; y += step) {
    gridLines.push(
      `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#27272a" stroke-width="1"/>`,
    );
  }

  const shapes: string[] = [];

  for (const item of plan.items) {
    const pos = floorPlanItemPosition(item, bounds);
    const cx = pad + ((width - pad * 2) * pos.left) / 100;
    const cy = pad + ((height - pad * 2) * pos.top) / 100;
    const label = floorItemLabel(item);

    if (item.kind === "table" && item.tableFormat) {
      const visual = tableVisual(item, options);
      const style = tableStyle(visual, item.tableFormat);
      const x = cx - TABLE_W / 2;
      const y = cy - TABLE_H / 2;
      shapes.push(`
        <g opacity="${style.opacity}">
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

  const legend = `
    <g font-family="system-ui,sans-serif" font-size="12" fill="#d4d4d8">
      <rect x="16" y="${height - 28}" width="12" height="12" rx="2" fill="#10b98159" stroke="#34d399"/>
      <text x="34" y="${height - 17}">свободен</text>
      <rect x="110" y="${height - 28}" width="12" height="12" rx="2" fill="#f59e0b4d" stroke="#f59e0b"/>
      <text x="128" y="${height - 17}">ожидает</text>
      <rect x="210" y="${height - 28}" width="12" height="12" rx="2" fill="#ef444440" stroke="#ef4444"/>
      <text x="228" y="${height - 17}">занят</text>
    </g>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#09090b"/>
  ${gridLines.join("\n")}
  ${shapes.join("\n")}
  ${legend}
</svg>`;
}

export async function renderFloorPlanPng(
  floorPlanRaw: unknown,
  options: FloorPlanImageOptions,
): Promise<Buffer | null> {
  const plan = parseFloorPlan(floorPlanRaw);
  if (!plan) return null;

  const svg = buildFloorPlanSvg(plan, options);
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(Buffer.from(svg)).png({ compressionLevel: 8 }).toBuffer();
  } catch {
    return null;
  }
}

export async function renderFloorPlanPngForBooking(
  floorPlanRaw: unknown,
  tableFormat: ClubTableFormatId,
  tables: { id: string; status: FloorTableStatus }[],
): Promise<Buffer | null> {
  const tableStates = Object.fromEntries(tables.map((t) => [t.id, t.status]));
  return renderFloorPlanPng(floorPlanRaw, {
    bookingTableFormat: tableFormat,
    tableStates,
  });
}
