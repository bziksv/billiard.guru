/** Популярные форматы столов в бильярдных клубах (до 5). */
export const CLUB_TABLE_FORMATS = [
  { id: "PYRAMID", label: "Пирамида" },
  { id: "POOL", label: "Пул" },
  { id: "SNOOKER", label: "Снукер" },
  { id: "CHINESE_POOL", label: "Китайский пул" },
  { id: "CAROM", label: "Карамболь" },
] as const;

export type ClubTableFormatId = (typeof CLUB_TABLE_FORMATS)[number]["id"];

export type ClubTableCounts = Partial<Record<ClubTableFormatId, number>>;

const FORMAT_IDS = new Set<string>(CLUB_TABLE_FORMATS.map((f) => f.id));

export function clubTableFormatLabel(id: ClubTableFormatId): string {
  return CLUB_TABLE_FORMATS.find((f) => f.id === id)?.label ?? id;
}

export function parseClubTableCounts(raw: unknown): ClubTableCounts {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: ClubTableCounts = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!FORMAT_IDS.has(key)) continue;
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) continue;
    result[key as ClubTableFormatId] = Math.min(500, Math.floor(n));
  }
  return result;
}

export function clubTableCountsTotal(counts: ClubTableCounts): number {
  return Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
}

export function clubTableCountsEntries(counts: ClubTableCounts) {
  return CLUB_TABLE_FORMATS.filter((f) => (counts[f.id] ?? 0) > 0).map((f) => ({
    id: f.id,
    label: f.label,
    count: counts[f.id]!,
  }));
}

export function parseTableCountsForm(formData: FormData): ClubTableCounts {
  const counts: ClubTableCounts = {};
  for (const format of CLUB_TABLE_FORMATS) {
    const raw = formData.get(`tableCount_${format.id}`);
    if (raw == null || raw === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) counts[format.id] = Math.min(500, Math.floor(n));
  }
  return counts;
}

export function tableCountsToJson(counts: ClubTableCounts): Record<string, number> | null {
  const entries = clubTableCountsEntries(counts);
  if (entries.length === 0) return null;
  return Object.fromEntries(entries.map((e) => [e.id, e.count]));
}
