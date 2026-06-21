import { prisma } from "@/lib/prisma";
import {
  resolveBracketParticipantRules,
  type BracketParticipantOverrides,
  type BracketParticipantRules,
} from "@/lib/bracket-participant-rules";
import {
  BRACKET_FORMAT_CATALOG,
  type BracketFormatCode,
  isBracketFormatCode,
} from "@/lib/bracket-formats/catalog";
import { BRACKET_ADMIN_LABEL_EN } from "@/lib/bracket-formats/en/display-labels";
import {
  getBracketFormatCatalogLabel,
  resolveBracketFormatAdminLabel,
  resolveBracketFormatLabelsMap,
} from "@/lib/bracket-formats/resolve-label";
import type { AppLocale } from "@/i18n/routing";

export type BracketFormatAdminSettings = {
  /** null — подпись из каталога */
  adminLabel: string | null;
  enabled: boolean;
  maintenanceMode: boolean;
  hiddenInAdmin: boolean;
  participantMin: number | null;
  participantMax: number | null;
  participantExact: number | null;
  /** null — значение из каталога (isReference в catalog.ts) */
  isReference: boolean | null;
};

export const DEFAULT_BRACKET_FORMAT_SETTINGS: BracketFormatAdminSettings = {
  adminLabel: null,
  enabled: true,
  maintenanceMode: false,
  hiddenInAdmin: false,
  participantMin: null,
  participantMax: null,
  participantExact: null,
  isReference: null,
};

function rowToSettings(row: {
  adminLabel: string | null;
  enabled: boolean;
  maintenanceMode: boolean;
  hiddenInAdmin: boolean;
  participantMin: number | null;
  participantMax: number | null;
  participantExact: number | null;
  isReference: boolean | null;
}): BracketFormatAdminSettings {
  return {
    adminLabel: row.adminLabel,
    enabled: row.enabled,
    maintenanceMode: row.maintenanceMode,
    hiddenInAdmin: row.hiddenInAdmin,
    participantMin: row.participantMin,
    participantMax: row.participantMax,
    participantExact: row.participantExact,
    isReference: row.isReference,
  };
}

export { getBracketFormatCatalogLabel, resolveBracketFormatAdminLabel };

/** Эталон: переопределение в БД или isReference из каталога */
export function resolveBracketFormatIsReference(
  code: string,
  settings: BracketFormatAdminSettings,
): boolean {
  if (settings.isReference !== null) return settings.isReference;
  const fromCatalog = BRACKET_FORMAT_CATALOG.find((f) => f.code === code)?.isReference;
  return fromCatalog ?? false;
}

function participantOverridesFromSettings(
  settings: BracketFormatAdminSettings,
): BracketParticipantOverrides {
  return {
    participantMin: settings.participantMin,
    participantMax: settings.participantMax,
    participantExact: settings.participantExact,
  };
}

/** Доступен при создании/смене формата турнира */
export function isBracketFormatSelectable(settings: BracketFormatAdminSettings): boolean {
  return settings.enabled && !settings.maintenanceMode;
}

export async function getResolvedParticipantRules(
  format: string,
): Promise<BracketParticipantRules> {
  const settings = await getBracketFormatSettings(format);
  return resolveBracketParticipantRules(format, participantOverridesFromSettings(settings));
}

export async function getBracketFormatLabel(code: string): Promise<string> {
  if (!isBracketFormatCode(code)) return getBracketFormatCatalogLabel(code);
  const settings = await getBracketFormatSettings(code);
  return resolveBracketFormatAdminLabel(code, settings);
}

export async function getAllBracketFormatLabels(): Promise<Record<string, string>> {
  const settingsMap = await getAllBracketFormatSettings();
  return resolveBracketFormatLabelsMap(
    settingsMap,
    DEFAULT_BRACKET_FORMAT_SETTINGS,
  );
}

export async function getLocalizedBracketFormatLabels(
  locale: AppLocale,
): Promise<Record<string, string>> {
  const ruLabels = await getAllBracketFormatLabels();
  if (locale !== "en") return ruLabels;

  const out: Record<string, string> = { ...ruLabels };
  for (const f of BRACKET_FORMAT_CATALOG) {
    const enLabel = BRACKET_ADMIN_LABEL_EN[f.code];
    if (enLabel) out[f.code] = enLabel;
  }
  return out;
}

export async function withTournamentFormatLabel<T extends { format: string }>(
  tournament: T,
): Promise<T & { formatLabel: string }> {
  return {
    ...tournament,
    formatLabel: await getBracketFormatLabel(tournament.format),
  };
}

export async function withTournamentFormatLabels<T extends { format: string }>(
  tournaments: T[],
): Promise<(T & { formatLabel: string })[]> {
  const labels = await getAllBracketFormatLabels();
  return tournaments.map((t) => ({
    ...t,
    formatLabel: labels[t.format] ?? t.format,
  }));
}

export async function getBracketFormatSettings(
  code: string,
): Promise<BracketFormatAdminSettings> {
  if (!isBracketFormatCode(code)) return DEFAULT_BRACKET_FORMAT_SETTINGS;
  const row = await prisma.bracketFormatConfig.findUnique({
    where: { formatCode: code },
  });
  return row ? rowToSettings(row) : DEFAULT_BRACKET_FORMAT_SETTINGS;
}

export async function getAllBracketFormatSettings(): Promise<
  Record<string, BracketFormatAdminSettings>
> {
  const rows = await prisma.bracketFormatConfig.findMany();
  const map: Record<string, BracketFormatAdminSettings> = {};
  for (const f of BRACKET_FORMAT_CATALOG) {
    map[f.code] = { ...DEFAULT_BRACKET_FORMAT_SETTINGS };
  }
  for (const row of rows) {
    map[row.formatCode] = rowToSettings(row);
  }
  return map;
}

export async function saveBracketFormatSettings(
  formatCode: BracketFormatCode,
  patch: Partial<BracketFormatAdminSettings>,
): Promise<BracketFormatAdminSettings> {
  const current = await getBracketFormatSettings(formatCode);
  const next: BracketFormatAdminSettings = {
    adminLabel:
      patch.adminLabel !== undefined ? patch.adminLabel : current.adminLabel,
    enabled: patch.enabled ?? current.enabled,
    maintenanceMode: patch.maintenanceMode ?? current.maintenanceMode,
    hiddenInAdmin: patch.hiddenInAdmin ?? current.hiddenInAdmin,
    participantMin:
      patch.participantMin !== undefined
        ? patch.participantMin
        : current.participantMin,
    participantMax:
      patch.participantMax !== undefined
        ? patch.participantMax
        : current.participantMax,
    participantExact:
      patch.participantExact !== undefined
        ? patch.participantExact
        : current.participantExact,
    isReference:
      patch.isReference !== undefined ? patch.isReference : current.isReference,
  };
  const row = await prisma.bracketFormatConfig.upsert({
    where: { formatCode },
    create: {
      formatCode,
      adminLabel: next.adminLabel,
      enabled: next.enabled,
      maintenanceMode: next.maintenanceMode,
      hiddenInAdmin: next.hiddenInAdmin,
      participantMin: next.participantMin,
      participantMax: next.participantMax,
      participantExact: next.participantExact,
      isReference: next.isReference,
    },
    update: {
      adminLabel: next.adminLabel,
      enabled: next.enabled,
      maintenanceMode: next.maintenanceMode,
      hiddenInAdmin: next.hiddenInAdmin,
      participantMin: next.participantMin,
      participantMax: next.participantMax,
      participantExact: next.participantExact,
      isReference: next.isReference,
    },
  });
  return rowToSettings(row);
}

/** Удалить строку настроек — формат остаётся в коде, применяются дефолты из каталога. */
export async function deleteBracketFormatSettings(
  formatCode: BracketFormatCode,
): Promise<void> {
  await prisma.bracketFormatConfig.deleteMany({
    where: { formatCode },
  });
}

/** @deprecated alias — проверка «можно выбрать в турнире» */
export async function isBracketFormatEnabled(code: string): Promise<boolean> {
  const s = await getBracketFormatSettings(code);
  return isBracketFormatSelectable(s);
}

export type BracketFormatUiOption = {
  value: string;
  label: string;
  /** Нельзя выбрать (техобслуживание), но видно в списке */
  disabled: boolean;
};

/** Только форматы, доступные для создания/смене (без техобслуживания и выключенных) */
export async function getBracketFormatOptionsForForms(): Promise<BracketFormatUiOption[]> {
  const settingsMap = await getAllBracketFormatSettings();
  return BRACKET_FORMAT_CATALOG.filter((f) => {
    const s = settingsMap[f.code] ?? DEFAULT_BRACKET_FORMAT_SETTINGS;
    return isBracketFormatSelectable(s);
  }).map((f) => ({
    value: f.code,
    label: resolveBracketFormatAdminLabel(
      f.code,
      settingsMap[f.code] ?? DEFAULT_BRACKET_FORMAT_SETTINGS,
    ),
    disabled: false,
  }));
}

/** Только доступные для создания турнира */
export async function getEnabledBracketFormatOptions(): Promise<
  { value: string; label: string }[]
> {
  const all = await getBracketFormatOptionsForForms();
  return all.filter((o) => !o.disabled).map(({ value, label }) => ({ value, label }));
}
