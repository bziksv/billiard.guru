import { prisma } from "@/lib/prisma";
import {
  BRACKET_FORMAT_CATALOG,
  type BracketFormatCode,
  isBracketFormatCode,
} from "@/lib/bracket-formats/catalog";

export type BracketFormatAdminSettings = {
  enabled: boolean;
  maintenanceMode: boolean;
};

const DEFAULT_SETTINGS: BracketFormatAdminSettings = {
  enabled: true,
  maintenanceMode: false,
};

function rowToSettings(row: {
  enabled: boolean;
  maintenanceMode: boolean;
}): BracketFormatAdminSettings {
  return {
    enabled: row.enabled,
    maintenanceMode: row.maintenanceMode,
  };
}

/** Доступен при создании/смене формата турнира */
export function isBracketFormatSelectable(settings: BracketFormatAdminSettings): boolean {
  return settings.enabled && !settings.maintenanceMode;
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
  };
  const row = await prisma.bracketFormatConfig.upsert({
    where: { formatCode },
    create: {
      formatCode,
      enabled: next.enabled,
      maintenanceMode: next.maintenanceMode,
    },
    update: {
      enabled: next.enabled,
      maintenanceMode: next.maintenanceMode,
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

/** Только форматы, доступные для создания/смены (без техобслуживания и выключенных) */
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
