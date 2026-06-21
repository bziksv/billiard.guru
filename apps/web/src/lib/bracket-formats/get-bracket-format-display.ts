import type { AppLocale } from "@/i18n/routing";
import type { BracketFormatCode } from "@/lib/bracket-formats/catalog";
import { BRACKET_SHORT_DESCRIPTION_EN } from "@/lib/bracket-formats/en/catalog";
import { BRACKET_ADMIN_LABEL_EN } from "@/lib/bracket-formats/en/display-labels";
import { BRACKET_GUIDE_SECTIONS_EN } from "@/lib/bracket-formats/en/guide-sections";
import { BRACKET_FORMAT_SEO_EN } from "@/lib/bracket-formats/en/seo";
import type { BracketFormatSeoEntry } from "@/lib/bracket-formats/seo";
import { getBracketFormatSeo } from "@/lib/bracket-formats/seo";
import type { BracketParticipantRules } from "@/lib/bracket-participant-rules";
import type { GuideSection } from "@/lib/guide-content";
import { TOURNAMENT_BRACKETS_SECTIONS } from "@/lib/tournament-brackets-guide";

export function getLocalizedBracketSeo(
  locale: AppLocale,
  code: BracketFormatCode,
): BracketFormatSeoEntry {
  if (locale === "en") {
    return BRACKET_FORMAT_SEO_EN[code];
  }
  return getBracketFormatSeo(code);
}

export function getLocalizedBracketGuideSection(
  locale: AppLocale,
  guideSectionId: string | undefined,
): GuideSection | null {
  if (!guideSectionId) return null;
  if (locale === "en") {
    return BRACKET_GUIDE_SECTIONS_EN[guideSectionId] ?? null;
  }
  return TOURNAMENT_BRACKETS_SECTIONS.find((s) => s.id === guideSectionId) ?? null;
}

export function getLocalizedBracketShortDescription(
  locale: AppLocale,
  code: BracketFormatCode,
  ruFallback: string,
): string {
  if (locale === "en") {
    return BRACKET_SHORT_DESCRIPTION_EN[code] ?? ruFallback;
  }
  return ruFallback;
}

export function getLocalizedBracketAdminLabel(
  locale: AppLocale,
  code: BracketFormatCode,
  ruFallback: string,
): string {
  if (locale === "en") {
    return BRACKET_ADMIN_LABEL_EN[code] ?? ruFallback;
  }
  return ruFallback;
}

function localizeParticipantBadge(badge: string, locale: AppLocale): string {
  if (locale !== "en") return badge;
  return badge
    .replace(/человека/g, "players")
    .replace(/человек/g, "players")
    .replace(/команд/g, "teams")
    .replace(/команду/g, "teams")
    .replace(/пар/g, "pairs")
    .replace(/^ровно /, "exactly ")
    .replace(/^от /, "from ")
    .replace(/^до /, "up to ");
}

export function localizeParticipantRules(
  locale: AppLocale,
  rules: BracketParticipantRules,
): BracketParticipantRules {
  if (locale !== "en") return rules;

  const label = localizeParticipantBadge(rules.label, locale);
  const hint = rules.hint
    .replace(/участник/gi, "player")
    .replace(/участников/gi, "players")
    .replace(/команд/gi, "teams")
    .replace(/встреч/gi, "matches")
    .replace(/Сетка/g, "Bracket")
    .replace(/Добавьте/g, "Add")
    .replace(/смените формат/g, "change the format");

  return { ...rules, label, hint };
}

export function localizedBracketSeoEntry(
  locale: AppLocale,
  seo: BracketFormatSeoEntry,
): BracketFormatSeoEntry {
  if (locale === "en") {
    const en = BRACKET_FORMAT_SEO_EN[seo.code];
    if (en) return en;
  }
  return {
    ...seo,
    participantBadge: localizeParticipantBadge(seo.participantBadge, locale),
  };
}
