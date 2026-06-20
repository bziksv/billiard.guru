import { floorTableColor } from "@/lib/club-floor-plan";
import type { ClubTableFormatId } from "@/lib/club-table-formats";
import {
  BILLIARD_TABLE_TYPES,
  type BilliardGame,
  type BilliardTableType,
} from "@/lib/billiard-rules/content";

export {
  BILLIARD_GENERAL_SECTIONS,
  BILLIARD_TABLE_TYPES,
  RULES_INDEX_INTRO,
} from "@/lib/billiard-rules/content";
export type {
  BilliardGame,
  BilliardTableChecklist,
  BilliardTableEquipment,
  BilliardTableSpec,
  BilliardTableType,
} from "@/lib/billiard-rules/content";

export function getBilliardTableBySlug(slug: string): BilliardTableType | undefined {
  return BILLIARD_TABLE_TYPES.find((t) => t.slug === slug);
}

export function getBilliardGame(
  tableSlug: string,
  gameSlug: string,
): { table: BilliardTableType; game: BilliardGame } | undefined {
  const table = getBilliardTableBySlug(tableSlug);
  if (!table) return undefined;
  const game = table.games.find((g) => g.slug === gameSlug);
  if (!game) return undefined;
  return { table, game };
}

export function getAllBilliardTableSlugs(): string[] {
  return BILLIARD_TABLE_TYPES.map((t) => t.slug);
}

export function getAllBilliardGameParams(): { tableSlug: string; gameSlug: string }[] {
  return BILLIARD_TABLE_TYPES.flatMap((table) =>
    table.games.map((game) => ({ tableSlug: table.slug, gameSlug: game.slug })),
  );
}

export function rulesTableAccentColor(id: ClubTableFormatId): string {
  return floorTableColor(id);
}

export function rulesTableGameCount(table: BilliardTableType): number {
  return table.games.length;
}
