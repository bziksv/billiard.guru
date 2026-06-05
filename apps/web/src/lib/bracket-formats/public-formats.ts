import {
  BRACKET_FORMAT_CATALOG,
  getBracketFormat,
  type BracketFormatCode,
  type BracketFormatDefinition,
} from "@/lib/bracket-formats/catalog";
import {
  getAllBracketFormatSettings,
  getResolvedParticipantRules,
  isBracketFormatSelectable,
  type BracketFormatAdminSettings,
} from "@/lib/bracket-formats/settings-server";
import {
  getBracketFormatSeo,
  getBracketFormatSeoBySlug,
  type BracketFormatSeoEntry,
} from "@/lib/bracket-formats/seo";
import type { BracketParticipantRules } from "@/lib/bracket-participant-rules";
import { TOURNAMENT_BRACKETS_SECTIONS } from "@/lib/tournament-brackets-guide";
import type { GuideSection } from "@/lib/guide-content";

export type PublicBracketFormat = {
  definition: BracketFormatDefinition;
  seo: BracketFormatSeoEntry;
  settings: BracketFormatAdminSettings;
  participantRules: BracketParticipantRules;
  guideSection: GuideSection | null;
};

async function loadPublicFormat(code: BracketFormatCode): Promise<PublicBracketFormat | null> {
  const definition = getBracketFormat(code);
  if (!definition) return null;

  const settingsMap = await getAllBracketFormatSettings();
  const settings = settingsMap[code];
  if (!settings || !isBracketFormatSelectable(settings)) return null;

  const participantRules = await getResolvedParticipantRules(code);
  const guideSection =
    definition.guideSectionId != null
      ? TOURNAMENT_BRACKETS_SECTIONS.find((s) => s.id === definition.guideSectionId) ?? null
      : null;

  return {
    definition,
    seo: getBracketFormatSeo(code),
    settings,
    participantRules,
    guideSection,
  };
}

/** Форматы, доступные на сайте (enabled, без техобслуживания) */
export async function getPublicEnabledBracketFormats(): Promise<PublicBracketFormat[]> {
  const settingsMap = await getAllBracketFormatSettings();
  const enabledCodes = BRACKET_FORMAT_CATALOG.filter((f) => {
    const s = settingsMap[f.code];
    return s && isBracketFormatSelectable(s);
  }).map((f) => f.code);

  const formats = await Promise.all(enabledCodes.map((code) => loadPublicFormat(code)));
  return formats.filter((f): f is PublicBracketFormat => f != null);
}

export async function getPublicBracketFormatBySlug(
  slug: string,
): Promise<PublicBracketFormat | null> {
  const seo = getBracketFormatSeoBySlug(slug);
  if (!seo) return null;
  return loadPublicFormat(seo.code);
}
