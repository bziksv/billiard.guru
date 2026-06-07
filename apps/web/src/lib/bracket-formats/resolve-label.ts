import {
  BRACKET_FORMAT_CATALOG,
  type BracketFormatCode,
  isBracketFormatCode,
} from "@/lib/bracket-formats/catalog";
import { TOURNAMENT_FORMAT_LABELS } from "@/lib/validators";

export type BracketFormatLabelSettings = {
  adminLabel: string | null;
};

/** Подпись из каталога (без переопределения в БД). */
export function getBracketFormatCatalogLabel(code: string): string {
  const fromCatalog = BRACKET_FORMAT_CATALOG.find((f) => f.code === code)?.adminLabel;
  if (fromCatalog) return fromCatalog;
  return TOURNAMENT_FORMAT_LABELS[code] ?? code;
}

/** Итоговая подпись: БД → каталог → validators. */
export function resolveBracketFormatAdminLabel(
  code: string,
  settings: BracketFormatLabelSettings,
): string {
  const override = settings.adminLabel?.trim();
  if (override) return override;
  return getBracketFormatCatalogLabel(code);
}

export function resolveBracketFormatLabelsMap(
  settingsMap: Record<string, BracketFormatLabelSettings>,
  defaultSettings: BracketFormatLabelSettings,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of BRACKET_FORMAT_CATALOG) {
    out[f.code] = resolveBracketFormatAdminLabel(
      f.code,
      settingsMap[f.code] ?? defaultSettings,
    );
  }
  return out;
}

export function isBracketFormatCodeValue(code: string): code is BracketFormatCode {
  return isBracketFormatCode(code);
}
