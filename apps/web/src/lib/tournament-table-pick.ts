import {
  floorItemLabel,
  parseFloorPlan,
  type ClubFloorPlan,
} from "@/lib/club-floor-plan";
import {
  CLUB_TABLE_FORMATS,
  clubTableFormatLabel,
  parseClubTableCounts,
  type ClubTableFormatId,
} from "@/lib/club-table-formats";
import { clubBookingFormatEntries } from "@/lib/table-booking";

export type TournamentTableOption = {
  id: string;
  label: string;
  tableFormat: ClubTableFormatId;
};

export type TournamentTableGroup = {
  format: ClubTableFormatId;
  label: string;
  tables: TournamentTableOption[];
};

export function buildTournamentTableGroups(
  floorPlanRaw: unknown,
  tableCountsRaw: unknown,
): TournamentTableGroup[] {
  const plan = parseFloorPlan(floorPlanRaw);
  const tablesOnPlan =
    plan?.items.filter((item) => item.kind === "table" && item.tableFormat) ?? [];

  const byFormat = new Map<ClubTableFormatId, TournamentTableOption[]>();

  if (tablesOnPlan.length > 0) {
    for (const item of tablesOnPlan) {
      const format = item.tableFormat!;
      const list = byFormat.get(format) ?? [];
      list.push({
        id: item.id,
        label: floorItemLabel(item),
        tableFormat: format,
      });
      byFormat.set(format, list);
    }
  } else {
    for (const entry of clubBookingFormatEntries(tableCountsRaw, plan)) {
      const options: TournamentTableOption[] = [];
      for (let index = 1; index <= entry.count; index += 1) {
        options.push({
          id: virtualTournamentTableId(entry.id, index),
          label: entry.count > 1 ? `${entry.label} ${index}` : entry.label,
          tableFormat: entry.id,
        });
      }
      byFormat.set(entry.id, options);
    }
  }

  return CLUB_TABLE_FORMATS.filter((format) => byFormat.has(format.id)).map((format) => ({
    format: format.id,
    label: format.label,
    tables: byFormat.get(format.id)!,
  }));
}

export function virtualTournamentTableId(
  format: ClubTableFormatId,
  index: number,
): string {
  return `virtual:${format}:${index}`;
}

export function allTournamentTableIds(groups: TournamentTableGroup[]): string[] {
  return groups.flatMap((group) => group.tables.map((table) => table.id));
}

export function validateTournamentTableIds(
  ids: string[],
  floorPlanRaw: unknown,
  tableCountsRaw: unknown,
): string | null {
  if (ids.length === 0) return "Выберите хотя бы один стол";
  const allowed = new Set(allTournamentTableIds(buildTournamentTableGroups(floorPlanRaw, tableCountsRaw)));
  if (allowed.size === 0) {
    return "В клубе нет столов — настройте схему зала или количество столов";
  }
  for (const id of ids) {
    if (!allowed.has(id)) return "Некорректный стол для этого клуба";
  }
  return null;
}

export function tournamentTableLabels(
  ids: string[],
  floorPlanRaw: unknown,
  tableCountsRaw: unknown,
): string[] {
  const plan = parseFloorPlan(floorPlanRaw);
  const groups = buildTournamentTableGroups(floorPlanRaw, tableCountsRaw);
  const labelById = new Map(groups.flatMap((g) => g.tables.map((t) => [t.id, t.label] as const)));

  return ids.map((id) => {
    if (labelById.has(id)) return labelById.get(id)!;
    if (id.startsWith("virtual:")) {
      const [, format, index] = id.split(":");
      if (format && index) {
        return `${clubTableFormatLabel(format as ClubTableFormatId)} ${index}`;
      }
    }
    if (plan) {
      const item = plan.items.find((row) => row.id === id);
      if (item) return floorItemLabel(item);
    }
    return id;
  });
}

export function parseTournamentTableIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === "string" && value.length > 0);
}
