import {
  floorItemLabel,
  parseFloorPlan,
  type ClubFloorPlan,
  type FloorPlanItem,
} from "@/lib/club-floor-plan";
import type { ClubTableFormatId } from "@/lib/club-table-formats";
import { parseClubTableCounts } from "@/lib/club-table-formats";
import { bookingOverlaps, type ExistingBooking } from "@/lib/table-booking";

const ACTIVE_BOOKING = ["PENDING", "CONFIRMED"] as const;

export type FloorTableStatus = "free" | "pending" | "confirmed";

export type FloorTableAvailability = {
  id: string;
  label: string;
  tableFormat: ClubTableFormatId;
  tableIndex?: number;
  status: FloorTableStatus;
};

export function floorTablesForFormat(
  plan: ClubFloorPlan | null,
  tableFormat: ClubTableFormatId,
): FloorPlanItem[] {
  if (!plan) return [];
  return plan.items.filter(
    (item) => item.kind === "table" && item.tableFormat === tableFormat,
  );
}

export function findFloorTableItem(
  plan: ClubFloorPlan | null,
  floorItemId: string,
): FloorPlanItem | null {
  if (!plan) return null;
  const item = plan.items.find((i) => i.id === floorItemId);
  if (!item || item.kind !== "table" || !item.tableFormat) return null;
  return item;
}

export function floorTableLabel(
  plan: ClubFloorPlan | null,
  floorItemId: string | null | undefined,
): string | null {
  if (!floorItemId || !plan) return null;
  const item = findFloorTableItem(plan, floorItemId);
  return item ? floorItemLabel(item) : null;
}

export function floorTableAvailability(
  plan: ClubFloorPlan | null,
  tableFormat: ClubTableFormatId,
  startsAt: Date,
  endsAt: Date,
  existing: ExistingBooking[],
): FloorTableAvailability[] {
  const tables = floorTablesForFormat(plan, tableFormat);
  const rows = tables.map((item) => {
    const booking = existing.find(
      (b) =>
        b.floorItemId === item.id &&
        bookingOverlaps(b.startsAt, b.endsAt, startsAt, endsAt),
    );
    let status: FloorTableStatus = "free";
    if (booking) {
      status = booking.status === "CONFIRMED" ? "confirmed" : "pending";
    }
    return {
      id: item.id,
      label: floorItemLabel(item),
      tableFormat: item.tableFormat!,
      tableIndex: item.tableIndex,
      status,
    };
  });

  const unassigned = existing.filter(
    (b) =>
      b.tableFormat === tableFormat &&
      !b.floorItemId &&
      ACTIVE_BOOKING.includes(b.status as (typeof ACTIVE_BOOKING)[number]) &&
      bookingOverlaps(b.startsAt, b.endsAt, startsAt, endsAt),
  );

  for (const booking of unassigned) {
    const freeRow = rows.find((r) => r.status === "free");
    if (!freeRow) break;
    freeRow.status = booking.status === "CONFIRMED" ? "confirmed" : "pending";
  }

  return rows;
}

/** Свободные столы на слот: по схеме минус «безымянные» брони без floorItemId. */
export function countFreeFloorTables(
  plan: ClubFloorPlan | null,
  tableFormat: ClubTableFormatId,
  startsAt: Date,
  endsAt: Date,
  existing: ExistingBooking[],
): number {
  const availability = floorTableAvailability(plan, tableFormat, startsAt, endsAt, existing);
  if (availability.length === 0) return 0;

  let free = availability.filter((t) => t.status === "free").length;
  const unassigned = existing.filter(
    (b) =>
      b.tableFormat === tableFormat &&
      !b.floorItemId &&
      ACTIVE_BOOKING.includes(b.status as (typeof ACTIVE_BOOKING)[number]) &&
      bookingOverlaps(b.startsAt, b.endsAt, startsAt, endsAt),
  ).length;

  return Math.max(0, free - unassigned);
}

export function bookingCapacityForFormat(
  tableCounts: unknown,
  floorPlan: ClubFloorPlan | null,
  tableFormat: ClubTableFormatId,
): number {
  const onPlan = floorTablesForFormat(floorPlan, tableFormat).length;
  if (onPlan > 0) return onPlan;
  const counts = parseClubTableCounts(tableCounts);
  return counts[tableFormat] ?? 0;
}

export function validateFloorItemBooking(
  plan: ClubFloorPlan | null,
  floorItemId: string,
  tableFormat: ClubTableFormatId,
  startsAt: Date,
  endsAt: Date,
  existing: ExistingBooking[],
): string | null {
  const item = findFloorTableItem(plan, floorItemId);
  if (!item) return "Стол не найден на схеме зала";
  if (item.tableFormat !== tableFormat) return "Формат стола не совпадает с выбранным";

  const taken = existing.some(
    (b) =>
      b.floorItemId === floorItemId &&
      bookingOverlaps(b.startsAt, b.endsAt, startsAt, endsAt),
  );
  if (taken) return "Этот стол уже занят в выбранное время";

  return null;
}

export function parseFloorPlanFromClub(floorPlan: unknown): ClubFloorPlan | null {
  return parseFloorPlan(floorPlan);
}
