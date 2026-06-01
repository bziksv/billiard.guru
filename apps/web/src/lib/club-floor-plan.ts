import {
  clubTableCountsEntries,
  clubTableCountsTotal,
  clubTableFormatLabel,
  parseClubTableCounts,
  type ClubTableCounts,
  type ClubTableFormatId,
} from "@/lib/club-table-formats";
import {
  findActivePriceTierAt,
  isTimedPriceTier,
  priceTierDaysLabel,
  type PriceTier,
} from "@/lib/club-schedule";

export const FLOOR_AMENITY_KINDS = [
  "entrance",
  "bar",
  "toilet",
  "wardrobe",
  "lounge",
  "reception",
  "kitchen",
  "custom",
] as const;

export type FloorAmenityKind = (typeof FLOOR_AMENITY_KINDS)[number];

export type FloorPlanItemKind = "table" | FloorAmenityKind;

export type FloorPlanItem = {
  id: string;
  kind: FloorPlanItemKind;
  x: number;
  y: number;
  tableFormat?: ClubTableFormatId;
  tableIndex?: number;
  /** Пользовательское название стола или подпись зоны */
  label?: string;
  /** @deprecated используйте priceTierLabels */
  priceTierLabel?: string;
  /** Тарифы из priceTiers клуба; пусто — все почасовые тарифы клуба */
  priceTierLabels?: string[];
};

export type ClubFloorPlan = {
  version: 1;
  items: FloorPlanItem[];
};

export const FLOOR_AMENITIES: {
  kind: FloorAmenityKind;
  label: string;
  icon: string;
}[] = [
  { kind: "entrance", label: "Вход", icon: "🚪" },
  { kind: "bar", label: "Бар", icon: "🍺" },
  { kind: "toilet", label: "Туалет", icon: "🚻" },
  { kind: "wardrobe", label: "Гардероб", icon: "🧥" },
  { kind: "lounge", label: "Зона отдыха", icon: "🛋️" },
  { kind: "reception", label: "Ресепшен", icon: "💁" },
  { kind: "kitchen", label: "Кухня", icon: "🍽️" },
  { kind: "custom", label: "Подпись", icon: "📍" },
];

const TABLE_COLORS: Record<ClubTableFormatId, string> = {
  PYRAMID: "#10b981",
  POOL: "#3b82f6",
  SNOOKER: "#8b5cf6",
  CHINESE_POOL: "#f59e0b",
  CAROM: "#ef4444",
};

function clampPercent(value: number) {
  return Math.min(95, Math.max(5, value));
}

export function floorAmenityLabel(kind: FloorAmenityKind, customLabel?: string) {
  if (kind === "custom") return customLabel?.trim() || "Подпись";
  return FLOOR_AMENITIES.find((a) => a.kind === kind)?.label ?? kind;
}

export function floorAmenityIcon(kind: FloorAmenityKind) {
  return FLOOR_AMENITIES.find((a) => a.kind === kind)?.icon ?? "📍";
}

export function floorTableColor(format: ClubTableFormatId) {
  return TABLE_COLORS[format] ?? "#10b981";
}

export function floorTableAssignedTierLabels(item: FloorPlanItem): string[] | null {
  if (item.kind !== "table") return null;
  if (item.priceTierLabels?.length) return item.priceTierLabels;
  if (item.priceTierLabel) return [item.priceTierLabel];
  return null;
}

export function floorTableUsesAllHourlyTiers(item: FloorPlanItem): boolean {
  return item.kind === "table" && !floorTableAssignedTierLabels(item);
}

export function floorTableApplicableTiers(item: FloorPlanItem, tiers: PriceTier[]): PriceTier[] {
  if (item.kind !== "table") return [];
  const labels = floorTableAssignedTierLabels(item);
  if (!labels) return tiers.filter(isTimedPriceTier);
  return tiers.filter((t) => labels.includes(t.label));
}

function tierScheduleHint(tier: PriceTier): string {
  const parts: string[] = [priceTierDaysLabel(tier.days)];
  if (tier.timeFrom && tier.timeTo) parts.push(`${tier.timeFrom}–${tier.timeTo}`);
  else if (tier.timeFrom) parts.push(`с ${tier.timeFrom}`);
  else if (tier.timeTo) parts.push(`до ${tier.timeTo}`);
  return parts.join(" · ");
}

export function floorTableTierSummary(item: FloorPlanItem, tiers: PriceTier[]): string {
  const applicable = floorTableApplicableTiers(item, tiers);
  if (applicable.length === 0) return "Тарифы не назначены";
  return applicable.map((t) => `${t.label}: ${t.price} (${tierScheduleHint(t)})`).join("; ");
}

export function floorTableDisplayPrice(
  item: FloorPlanItem,
  tiers: PriceTier[],
  now = new Date(),
  timeZone = "Europe/Moscow",
): string | null {
  if (item.kind !== "table") return null;
  const applicable = floorTableApplicableTiers(item, tiers);
  if (applicable.length === 0) return null;

  const active = findActivePriceTierAt(applicable, now, timeZone);
  if (active) return active.price;

  const hourly = applicable.filter(isTimedPriceTier);
  if (hourly.length === 0) {
    const fixed = applicable[0];
    return fixed?.price ?? null;
  }
  if (hourly.length === 1) return hourly[0]!.price;
  return `от ${hourly[0]!.price}`;
}

export function floorItemLabel(item: FloorPlanItem) {
  if (item.kind === "table" && item.tableFormat) {
    if (item.label?.trim()) return item.label.trim();
    const formatLabel = clubTableFormatLabel(item.tableFormat);
    return item.tableIndex ? `${formatLabel} ${item.tableIndex}` : formatLabel;
  }
  return floorAmenityLabel(item.kind as FloorAmenityKind, item.label);
}

/** @deprecated используйте floorTableDisplayPrice */
export function floorTablePriceHint(
  item: FloorPlanItem,
  tiers: PriceTier[],
  now = new Date(),
  timeZone = "Europe/Moscow",
): string | null {
  return floorTableDisplayPrice(item, tiers, now, timeZone);
}

export function normalizeTableTierLabels(item: FloorPlanItem): Partial<FloorPlanItem> {
  const labels = floorTableAssignedTierLabels(item);
  if (!labels?.length) {
    return { priceTierLabels: undefined, priceTierLabel: undefined };
  }
  return { priceTierLabels: labels, priceTierLabel: undefined };
}

export function parseFloorPlan(raw: unknown): ClubFloorPlan | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const data = raw as { version?: unknown; items?: unknown };
  if (data.version !== 1 || !Array.isArray(data.items)) return null;

  const items: FloorPlanItem[] = [];
  for (const entry of data.items) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const kind = row.kind;
    const x = typeof row.x === "number" ? row.x : Number(row.x);
    const y = typeof row.y === "number" ? row.y : Number(row.y);
    if (!id || typeof kind !== "string" || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (kind !== "table" && !FLOOR_AMENITY_KINDS.includes(kind as FloorAmenityKind)) continue;

    const item: FloorPlanItem = {
      id,
      kind: kind as FloorPlanItemKind,
      x: clampPercent(x),
      y: clampPercent(y),
    };

    if (kind === "table") {
      const tableFormat = row.tableFormat;
      if (typeof tableFormat !== "string") continue;
      item.tableFormat = tableFormat as ClubTableFormatId;
      const tableIndex = typeof row.tableIndex === "number" ? row.tableIndex : Number(row.tableIndex);
      if (Number.isFinite(tableIndex) && tableIndex > 0) {
        item.tableIndex = Math.floor(tableIndex);
      }
      if (typeof row.label === "string" && row.label.trim()) {
        item.label = row.label.trim().slice(0, 40);
      }
      if (Array.isArray(row.priceTierLabels)) {
        item.priceTierLabels = row.priceTierLabels
          .filter((l): l is string => typeof l === "string" && l.trim().length > 0)
          .map((l) => l.trim().slice(0, 80));
      }
      if (typeof row.priceTierLabel === "string" && row.priceTierLabel.trim()) {
        item.priceTierLabel = row.priceTierLabel.trim().slice(0, 80);
      }
    } else if (typeof row.label === "string" && row.label.trim()) {
      item.label = row.label.trim().slice(0, 40);
    }

    items.push(item);
  }

  return items.length > 0 ? { version: 1, items } : null;
}

export function floorPlanToJson(plan: ClubFloorPlan | null): Record<string, unknown> | null {
  if (!plan || plan.items.length === 0) return null;
  return {
    version: 1,
    items: plan.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      x: Math.round(item.x * 10) / 10,
      y: Math.round(item.y * 10) / 10,
      ...(item.tableFormat && { tableFormat: item.tableFormat }),
      ...(item.tableIndex && { tableIndex: item.tableIndex }),
      ...(item.label && { label: item.label }),
      ...(item.priceTierLabels?.length && { priceTierLabels: item.priceTierLabels }),
    })),
  };
}

export function floorPlanHasItems(raw: unknown) {
  return (parseFloorPlan(raw)?.items.length ?? 0) > 0;
}

export type FloorPlanContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  spanX: number;
  spanY: number;
};

export function floorPlanContentBounds(
  items: FloorPlanItem[],
  padding = 7,
): FloorPlanContentBounds {
  if (items.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, spanX: 100, spanY: 100 };
  }
  const xs = items.map((i) => i.x);
  const ys = items.map((i) => i.y);
  const minX = Math.max(0, Math.min(...xs) - padding);
  const minY = Math.max(0, Math.min(...ys) - padding);
  const maxX = Math.min(100, Math.max(...xs) + padding);
  const maxY = Math.min(100, Math.max(...ys) + padding);
  const spanX = Math.max(20, maxX - minX);
  const spanY = Math.max(20, maxY - minY);
  return { minX, minY, maxX, maxY, spanX, spanY };
}

export function floorPlanItemPosition(
  item: FloorPlanItem,
  bounds: FloorPlanContentBounds,
): { left: number; top: number } {
  return {
    left: ((item.x - bounds.minX) / bounds.spanX) * 100,
    top: ((item.y - bounds.minY) / bounds.spanY) * 100,
  };
}

export function createFloorPlanItem(
  kind: FloorPlanItemKind,
  x: number,
  y: number,
  extra?: Partial<
    Pick<FloorPlanItem, "tableFormat" | "tableIndex" | "label" | "priceTierLabel" | "priceTierLabels">
  >,
): FloorPlanItem {
  return {
    id: crypto.randomUUID(),
    kind,
    x: clampPercent(x),
    y: clampPercent(y),
    ...extra,
  };
}

export function autoLayoutTablesFromCounts(tableCountsRaw: unknown): FloorPlanItem[] {
  const counts = parseClubTableCounts(tableCountsRaw);
  const total = clubTableCountsTotal(counts);
  if (total === 0) return [];

  const cols = Math.max(2, Math.ceil(Math.sqrt(total)));
  const rows = Math.ceil(total / cols);
  const items: FloorPlanItem[] = [];
  let index = 0;

  for (const { id, count } of clubTableCountsEntries(counts)) {
    for (let n = 1; n <= count; n++) {
      const col = index % cols;
      const row = Math.floor(index / cols);
      items.push(
        createFloorPlanItem("table", 12 + ((col + 0.5) * 76) / cols, 15 + ((row + 0.5) * 70) / rows, {
          tableFormat: id,
          tableIndex: n,
        }),
      );
      index += 1;
    }
  }

  return items;
}

export function mergeAutoTables(
  existing: FloorPlanItem[],
  tableCountsRaw: unknown,
): FloorPlanItem[] {
  const amenities = existing.filter((item) => item.kind !== "table");
  return [...amenities, ...autoLayoutTablesFromCounts(tableCountsRaw)];
}
