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

export type BracketFormatAdminSettings = {
  enabled: boolean;
  maintenanceMode: boolean;
  hiddenInAdmin: boolean;
  participantMin: number | null;
  participantMax: number | null;
  participantExact: number | null;
};

const DEFAULT_SETTINGS: BracketFormatAdminSettings = {
  enabled: true,
  maintenanceMode: false,
  hiddenInAdmin: false,
  participantMin: null,
  participantMax: null,
  participantExact: null,
};

function rowToSettings(row: {
  enabled: boolean;
  maintenanceMode: boolean;
  hiddenInAdmin: boolean;
  participantMin: number | null;
  participantMax: number | null;
  participantExact: number | null;
}): BracketFormatAdminSettings {
  return {
    enabled: row.enabled,
    maintenanceMode: row.maintenanceMode,
    hiddenInAdmin: row.hiddenInAdmin,
    participantMin: row.participantMin,
    participantMax: row.participantMax,
    participantExact: row.participantExact,
  };
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

export async function getBracketFormatSettings(
  code: string,
): Promise<BracketFormatAdminSettings> {
  if (!isBracketFormatCode(code)) return DEFAULT_SETTINGS;
  const row = await prisma.bracketFormatConfig.findUnique({
    where: { formatCode: code },
  });
  return row ? rowToSettings(row) : DEFAULT_SETTINGS;
}

export async function getAllBracketFormatSettings(): Promise<
  Record<string, BracketFormatAdminSettings>
> {
  const rows = await prisma.bracketFormatConfig.findMany();
  const map: Record<string, BracketFormatAdminSettings> = {};
  for (const f of BRACKET_FORMAT_CATALOG) {
    map[f.code] = { ...DEFAULT_SETTINGS };
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
  };
  const row = await prisma.bracketFormatConfig.upsert({
    where: { formatCode },
    create: {
      formatCode,
      enabled: next.enabled,
      maintenanceMode: next.maintenanceMode,
      hiddenInAdmin: next.hiddenInAdmin,
      participantMin: next.participantMin,
      participantMax: next.participantMax,
      participantExact: next.participantExact,
    },
    update: {
      enabled: next.enabled,
      maintenanceMode: next.maintenanceMode,
      hiddenInAdmin: next.hiddenInAdmin,
      participantMin: next.participantMin,
      participantMax: next.participantMax,
      participantExact: next.participantExact,
    },
  });
  return rowToSettings(row);
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
    const s = settingsMap[f.code] ?? DEFAULT_SETTINGS;
    return isBracketFormatSelectable(s);
  }).map((f) => ({
    value: f.code,
    label: f.adminLabel,
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
