import type { AppLocale } from "@/i18n/routing";
import {
  BRACKETS_CHOOSE_ROWS,
  BRACKETS_FORMAT_GROUPS,
  BRACKETS_INDEX_INTRO,
  BRACKET_INDEX_TEASER,
  type BracketsFormatGroup,
} from "@/lib/bracket-formats/index-content";
import {
  BRACKETS_CHOOSE_ROWS_EN,
  BRACKETS_FORMAT_GROUPS_EN,
  BRACKETS_INDEX_INTRO_EN,
  BRACKET_FORMAT_CARD_TITLE_EN,
  BRACKET_INDEX_TEASER_EN,
  BRACKET_PLATFORM_FEATURES_EN,
} from "@/lib/bracket-formats/en/index-content";
import { BRACKET_PLATFORM_FEATURES } from "@/lib/bracket-formats/seo";
import type { PublicBracketFormat } from "@/lib/bracket-formats/public-formats";

export type BracketsIndexContent = {
  indexIntro: string;
  formatGroups: BracketsFormatGroup[];
  chooseRows: readonly { format: string; forWhom: string; size: string }[];
  platformFeatures: readonly { title: string; text: string }[];
};

export function getBracketsIndexContent(locale: AppLocale): BracketsIndexContent {
  if (locale === "en") {
    return {
      indexIntro: BRACKETS_INDEX_INTRO_EN,
      formatGroups: BRACKETS_FORMAT_GROUPS_EN,
      chooseRows: BRACKETS_CHOOSE_ROWS_EN,
      platformFeatures: BRACKET_PLATFORM_FEATURES_EN,
    };
  }
  return {
    indexIntro: BRACKETS_INDEX_INTRO,
    formatGroups: BRACKETS_FORMAT_GROUPS,
    chooseRows: BRACKETS_CHOOSE_ROWS,
    platformFeatures: BRACKET_PLATFORM_FEATURES,
  };
}

function localizeParticipantBadge(badge: string, locale: AppLocale): string {
  if (locale !== "en") return badge;
  return badge
    .replace(/человека/g, "players")
    .replace(/человек/g, "players")
    .replace(/команд/g, "teams")
    .replace(/команду/g, "teams")
    .replace(/пар/g, "pairs");
}

export function bracketFormatCardTitle(
  locale: AppLocale,
  format: PublicBracketFormat,
): string {
  if (locale === "en") {
    return (
      BRACKET_FORMAT_CARD_TITLE_EN[format.definition.code] ??
      "Tournament bracket"
    );
  }
  return format.seo.pageTitle;
}

export function bracketIndexTeaser(
  locale: AppLocale,
  format: PublicBracketFormat,
): string {
  if (locale === "en") {
    const fromMap = BRACKET_INDEX_TEASER_EN[format.definition.code];
    if (fromMap) return fromMap;
    return "Interactive bracket demo and one-click tournament creation.";
  }
  const fromMap = BRACKET_INDEX_TEASER[format.definition.code];
  if (fromMap) return fromMap;
  const first = format.seo.lead.split(/[.—]/)[0]?.trim();
  if (first) return `${first}.`;
  return format.seo.lead;
}

export function bracketFormatParticipantBadge(
  locale: AppLocale,
  format: PublicBracketFormat,
): string {
  return localizeParticipantBadge(format.seo.participantBadge, locale);
}
