import type { AppLocale } from "@/i18n/routing";
import { latinizeNamePart, hasCyrillic } from "@/lib/transliterate";
import { playerName } from "@/lib/public-display";

export type PlayerLatinFields = {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  firstNameLatin?: string | null;
  lastNameLatin?: string | null;
  middleNameLatin?: string | null;
};

export function buildPlayerLatinFields(p: {
  firstName: string;
  lastName: string;
  middleName?: string | null;
}) {
  const firstNameLatin = latinizeNamePart(p.firstName) || null;
  const lastNameLatin = latinizeNamePart(p.lastName) || null;
  const middleNameLatin = p.middleName?.trim()
    ? latinizeNamePart(p.middleName) || null
    : null;
  return { firstNameLatin, lastNameLatin, middleNameLatin };
}

export function buildClubLatinFields(name: string) {
  const trimmed = name.trim();
  return { nameLatin: trimmed ? latinizeNamePart(trimmed) || null : null };
}

/** Имя игрока: на EN — латиница из БД или транслит на лету. */
export function localizedPlayerName(locale: AppLocale, p: PlayerLatinFields): string {
  if (locale !== "en") return playerName(p);

  const lastName = p.lastNameLatin?.trim() || latinizeNamePart(p.lastName);
  const firstName = p.firstNameLatin?.trim() || latinizeNamePart(p.firstName);
  const middle = p.middleName?.trim()
    ? p.middleNameLatin?.trim() || latinizeNamePart(p.middleName)
    : "";
  return `${lastName} ${firstName}${middle ? ` ${middle}` : ""}`;
}

export function localizedClubName(
  locale: AppLocale,
  name: string,
  nameLatin?: string | null,
): string {
  if (locale !== "en") return name;
  const stored = nameLatin?.trim();
  if (stored) return stored;
  return latinizeNamePart(name) || name;
}

export function localizedTeamLabel(
  locale: AppLocale,
  team: {
    name?: string | null;
    player1: PlayerLatinFields;
    player2?: PlayerLatinFields | null;
  },
): string {
  if (team.name?.trim()) {
    const custom = team.name.trim();
    if (locale === "en" && hasCyrillic(custom)) {
      return latinizeNamePart(custom);
    }
    return custom;
  }
  if (!team.player2) {
    return localizedPlayerName(locale, team.player1);
  }
  return `${localizedPlayerName(locale, team.player1)} / ${localizedPlayerName(locale, team.player2)}`;
}
