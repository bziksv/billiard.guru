import type { AppLocale } from "@/i18n/routing";
import type { BilliardTableType } from "@/lib/billiard-rules/content";
import type { GuideSection } from "@/lib/guide-content";
import {
  BILLIARD_GENERAL_SECTIONS,
  BILLIARD_TABLE_TYPES,
  RULES_INDEX_INTRO,
} from "@/lib/billiard-rules/content";
import {
  BILLIARD_GENERAL_SECTIONS_EN,
  RULES_INDEX_INTRO_EN,
} from "@/lib/billiard-rules/en/general";
import { BILLIARD_TABLE_TYPES_EN } from "@/lib/billiard-rules/en/tables";

export type RulesContentBundle = {
  tableTypes: BilliardTableType[];
  generalSections: GuideSection[];
  indexIntro: string;
};

export function getRulesContent(locale: AppLocale): RulesContentBundle {
  if (locale === "en") {
    return {
      tableTypes: BILLIARD_TABLE_TYPES_EN,
      generalSections: BILLIARD_GENERAL_SECTIONS_EN,
      indexIntro: RULES_INDEX_INTRO_EN,
    };
  }
  return {
    tableTypes: BILLIARD_TABLE_TYPES,
    generalSections: BILLIARD_GENERAL_SECTIONS,
    indexIntro: RULES_INDEX_INTRO,
  };
}

export function getBilliardTableBySlug(
  locale: AppLocale,
  slug: string,
): BilliardTableType | undefined {
  return getRulesContent(locale).tableTypes.find((t) => t.slug === slug);
}

export function getBilliardGame(
  locale: AppLocale,
  tableSlug: string,
  gameSlug: string,
): { table: BilliardTableType; game: BilliardTableType["games"][number] } | undefined {
  const table = getBilliardTableBySlug(locale, tableSlug);
  if (!table) return undefined;
  const game = table.games.find((g) => g.slug === gameSlug);
  if (!game) return undefined;
  return { table, game };
}

export function getAllBilliardTableSlugs(locale: AppLocale): string[] {
  return getRulesContent(locale).tableTypes.map((t) => t.slug);
}

export function getAllBilliardGameParams(
  locale: AppLocale,
): { tableSlug: string; gameSlug: string }[] {
  return getRulesContent(locale).tableTypes.flatMap((table) =>
    table.games.map((game) => ({ tableSlug: table.slug, gameSlug: game.slug })),
  );
}
