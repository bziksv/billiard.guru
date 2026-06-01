import {
  floorItemLabel,
  floorPlanToJson,
  parseFloorPlan,
  type ClubFloorPlan,
  type FloorPlanItem,
} from "@/lib/club-floor-plan";
import { parseClubGalleryUrls } from "@/lib/club-photos";
import {
  formatDayRange,
  formatHoursSlot,
  parsePriceTiers,
  parseWeeklyHours,
  priceTierDaysLabel,
  priceTiersToJson,
  weeklyHoursToJson,
  type PriceTier,
  type WeeklyHoursSlot,
} from "@/lib/club-schedule";
import { formatE164Display } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import {
  clubTableCountsEntries,
  parseClubTableCounts,
  tableCountsToJson,
} from "@/lib/club-table-formats";

const CLUB_FIELD_LABELS: Record<string, string> = {
  name: "Название",
  cityId: "Город",
  email: "Email",
  description: "Описание",
  address: "Адрес",
  workingHours: "График (текст)",
  displayPhone: "Телефон на сайте",
  gamePrice: "Цена игры",
  bookingEnabled: "Онлайн-брони",
  bookingSlotMinutes: "Слот (мин)",
  bookingAdvanceDays: "Горизонт брони",
  galleryUrls: "Фото",
  photoUrl: "Фото",
  tableCounts: "Столы",
  weeklyHours: "График по дням",
  priceTiers: "Тарифы",
  floorPlan: "План зала",
};

export const LABEL_TO_KEY = Object.fromEntries(
  Object.entries(CLUB_FIELD_LABELS).map(([k, v]) => [v, k]),
) as Record<string, string>;

function stableJson(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableJson(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(obj[k])}`).join(",")}}`;
}

function formatWeeklyHoursHuman(value: unknown): string {
  const slots = parseWeeklyHours(value);
  if (slots.length === 0) return "не задан";
  return slots
    .map((slot) => {
      const range = formatDayRange(slot.days);
      const hours = formatHoursSlot(slot);
      const night = slot.closesAfterMidnight ? " (закрытие после полуночи)" : "";
      return `${range}: ${hours}${night}`;
    })
    .join("; ");
}

function formatPriceTiersHuman(value: unknown): string {
  const tiers = parsePriceTiers(value);
  if (tiers.length === 0) return "не заданы";
  return tiers.map(formatOnePriceTier).join("; ");
}

export function formatOnePriceTier(tier: PriceTier): string {
  let line = `${tier.label} — ${tier.price}`;
  const days = priceTierDaysLabel(tier.days);
  if (days !== "ежедневно") line += ` (${days})`;
  if (tier.timeFrom || tier.timeTo) {
    line += `, ${tier.timeFrom ?? "00:00"}–${tier.timeTo ?? "24:00"}`;
  }
  if (tier.note) line += `, ${tier.note}`;
  return line;
}

export type AuditChangePart = { text: string; changed?: boolean };

export type AuditChangeEntry = {
  from: string;
  to: string;
  diff?: string[];
  fromParts?: AuditChangePart[];
  toParts?: AuditChangePart[];
  rawFrom?: unknown;
  rawTo?: unknown;
};

function tierSnap(tier: PriceTier): string {
  return stableJson({
    label: tier.label,
    days: tier.days ?? "all",
    timeFrom: tier.timeFrom ?? null,
    timeTo: tier.timeTo ?? null,
    closesAfterMidnight: Boolean(tier.closesAfterMidnight),
    price: tier.price,
    note: tier.note ?? null,
  });
}

function weeklySlotSnap(slot: WeeklyHoursSlot): string {
  return stableJson({
    days: [...slot.days].sort(),
    open: slot.open,
    close: slot.close,
    closesAfterMidnight: Boolean(slot.closesAfterMidnight),
  });
}

function weeklySlotKey(slot: WeeklyHoursSlot): string {
  return `${[...slot.days].sort().join(",")}|${slot.open}|${slot.close}`;
}

function splitAuditLines(text: string): string[] {
  return text
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== "—" && s !== "без изменений");
}

function tierLabelFromLine(line: string): string {
  const idx = line.indexOf(" — ");
  return idx >= 0 ? line.slice(0, idx).trim() : line.trim();
}

/** Сравнение уже отформатированных строк (старые записи журнала). */
export function diffPriceTiersFromDisplay(
  fromText: string,
  toText: string,
): Pick<AuditChangeEntry, "from" | "to" | "diff" | "fromParts" | "toParts"> | null {
  if (!fromText.includes(" — ") && !toText.includes(" — ")) return null;

  const fromLines =
    fromText === "не заданы" || fromText === "—" ? [] : splitAuditLines(fromText);
  const toLines = toText === "не заданы" || toText === "—" ? [] : splitAuditLines(toText);
  const fromMap = new Map(fromLines.map((line) => [tierLabelFromLine(line), line]));
  const toMap = new Map(toLines.map((line) => [tierLabelFromLine(line), line]));

  const diff: string[] = [];
  const fromParts: AuditChangePart[] = [];
  const toParts: AuditChangePart[] = [];

  for (const [label, line] of toMap) {
    const prev = fromMap.get(label);
    if (!prev) {
      diff.push(`добавлен: ${line}`);
      toParts.push({ text: line, changed: true });
    } else if (prev !== line) {
      diff.push(`${label}: ${prev} → ${line}`);
      fromParts.push({ text: prev });
      toParts.push({ text: line, changed: true });
    }
  }

  for (const [label, line] of fromMap) {
    if (!toMap.has(label)) {
      diff.push(`удалён: ${line}`);
      fromParts.push({ text: line });
    }
  }

  if (diff.length === 0) return null;

  return {
    from: fromParts.map((p) => p.text).join("; ") || fromText,
    to: toParts.map((p) => p.text).join("; "),
    diff,
    fromParts: fromParts.length > 0 ? fromParts : undefined,
    toParts,
  };
}

export function diffPriceTiersAudit(
  fromRaw: unknown,
  toRaw: unknown,
): Pick<AuditChangeEntry, "from" | "to" | "diff" | "fromParts" | "toParts"> {
  const fromTiers = parsePriceTiers(fromRaw);
  const toTiers = parsePriceTiers(toRaw);
  const fromMap = new Map(fromTiers.map((t) => [t.label, t]));
  const toMap = new Map(toTiers.map((t) => [t.label, t]));

  const diff: string[] = [];
  const fromParts: AuditChangePart[] = [];
  const toParts: AuditChangePart[] = [];

  for (const tier of toTiers) {
    const prev = fromMap.get(tier.label);
    const line = formatOnePriceTier(tier);
    if (!prev) {
      diff.push(`добавлен: ${line}`);
      toParts.push({ text: line, changed: true });
      continue;
    }
    if (tierSnap(prev) !== tierSnap(tier)) {
      const prevLine = formatOnePriceTier(prev);
      diff.push(`${tier.label}: ${prevLine} → ${line}`);
      fromParts.push({ text: prevLine });
      toParts.push({ text: line, changed: true });
    }
  }

  for (const tier of fromTiers) {
    if (!toMap.has(tier.label)) {
      const line = formatOnePriceTier(tier);
      diff.push(`удалён: ${line}`);
      fromParts.push({ text: line });
    }
  }

  return {
    from: fromParts.map((p) => p.text).join("; ") || (fromTiers.length === 0 ? "не заданы" : "без изменений"),
    to: toParts.map((p) => p.text).join("; ") || (toTiers.length === 0 ? "не заданы" : "без изменений"),
    diff: diff.length > 0 ? diff : undefined,
    fromParts: fromParts.length > 0 ? fromParts : undefined,
    toParts: toParts.length > 0 ? toParts : undefined,
  };
}

export function diffWeeklyHoursAudit(
  fromRaw: unknown,
  toRaw: unknown,
): Pick<AuditChangeEntry, "from" | "to" | "diff" | "fromParts" | "toParts"> {
  const fromSlots = parseWeeklyHours(fromRaw);
  const toSlots = parseWeeklyHours(toRaw);
  const fromMap = new Map(fromSlots.map((s) => [weeklySlotKey(s), s]));
  const toMap = new Map(toSlots.map((s) => [weeklySlotKey(s), s]));

  const diff: string[] = [];
  const fromParts: AuditChangePart[] = [];
  const toParts: AuditChangePart[] = [];

  const formatSlot = (slot: WeeklyHoursSlot) => {
    const range = formatDayRange(slot.days);
    const hours = formatHoursSlot(slot);
    const night = slot.closesAfterMidnight ? " (до утра)" : "";
    return `${range}: ${hours}${night}`;
  };

  for (const slot of toSlots) {
    const key = weeklySlotKey(slot);
    const prev = fromMap.get(key);
    const line = formatSlot(slot);
    if (!prev) {
      diff.push(`добавлено: ${line}`);
      toParts.push({ text: line, changed: true });
      continue;
    }
    if (weeklySlotSnap(prev) !== weeklySlotSnap(slot)) {
      const prevLine = formatSlot(prev);
      diff.push(`${formatDayRange(slot.days)}: ${prevLine} → ${line}`);
      fromParts.push({ text: prevLine });
      toParts.push({ text: line, changed: true });
    }
  }

  for (const slot of fromSlots) {
    if (!toMap.has(weeklySlotKey(slot))) {
      const line = formatSlot(slot);
      diff.push(`удалено: ${line}`);
      fromParts.push({ text: line });
    }
  }

  return {
    from: fromParts.map((p) => p.text).join("; ") || (fromSlots.length === 0 ? "не задан" : "без изменений"),
    to: toParts.map((p) => p.text).join("; ") || (toSlots.length === 0 ? "не задан" : "без изменений"),
    diff: diff.length > 0 ? diff : undefined,
    fromParts: fromParts.length > 0 ? fromParts : undefined,
    toParts: toParts.length > 0 ? toParts : undefined,
  };
}

/** Подсветка в UI: только изменённые фрагменты, не полный список полей. */
export function augmentAuditChangeEntry(
  fieldKey: string,
  fromRaw: unknown,
  toRaw: unknown,
  base: AuditChangeEntry,
): AuditChangeEntry {
  if (fieldKey === "priceTiers") {
    const fromTiers = parsePriceTiers(fromRaw);
    const toTiers = parsePriceTiers(toRaw);
    const detailed =
      fromTiers.length > 0 || toTiers.length > 0
        ? diffPriceTiersAudit(fromRaw, toRaw)
        : diffPriceTiersFromDisplay(base.from, base.to);
    if (detailed) return { ...base, ...detailed, rawFrom: fromRaw, rawTo: toRaw };
    return { ...base, rawFrom: fromRaw, rawTo: toRaw };
  }
  if (fieldKey === "weeklyHours") {
    const detailed = diffWeeklyHoursAudit(fromRaw, toRaw);
    return { ...base, ...detailed, rawFrom: fromRaw, rawTo: toRaw };
  }
  if (fieldKey === "floorPlan") {
    const diff = base.diff ?? diffFloorPlanAuditLines(fromRaw, toRaw);
    return { ...base, diff: diff.length > 0 ? diff : undefined, rawFrom: fromRaw, rawTo: toRaw };
  }
  if (base.from !== base.to) {
    return {
      ...base,
      fromParts: [{ text: base.from }],
      toParts: [{ text: base.to, changed: true }],
      rawFrom: fromRaw,
      rawTo: toRaw,
    };
  }
  return base;
}

function formatTableCountsHuman(value: unknown): string {
  const entries = clubTableCountsEntries(parseClubTableCounts(value));
  if (entries.length === 0) return "не заданы";
  return entries.map((e) => `${e.label} — ${e.count}`).join(", ");
}

function formatGalleryHuman(value: unknown): string {
  const n = parseClubGalleryUrls(value).length;
  return n === 0 ? "нет фото" : `${n} ${photoWord(n)}`;
}

function photoWord(_n: number): string {
  return "фото";
}

/** Парсит план из БД, API и старых записей журнала (без version). */
export function parseFloorPlanForAudit(raw: unknown): ClubFloorPlan | null {
  const direct = parseFloorPlan(raw);
  if (direct) return direct;

  if (typeof raw === "string") {
    const trimmed = raw.trim().replace(/…$/, "");
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return parseFloorPlanForAudit(JSON.parse(trimmed) as unknown);
      } catch {
        return null;
      }
    }
    return null;
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const data = raw as { version?: unknown; items?: unknown };
    if (Array.isArray(data.items)) {
      return parseFloorPlan({ version: 1, items: data.items });
    }
  }

  return null;
}

function summarizeFloorPlan(value: unknown): string {
  const plan = parseFloorPlanForAudit(value);
  if (!plan?.items.length) return "пустой план";

  const tables = plan.items.filter((i) => i.kind === "table");
  const zones = plan.items.filter((i) => i.kind !== "table");
  const parts: string[] = [];

  if (tables.length > 0) {
    parts.push(`столы (${tables.length}): ${tables.map((t) => floorItemLabel(t)).join(", ")}`);
  }
  if (zones.length > 0) {
    parts.push(`зоны (${zones.length}): ${zones.map((z) => floorItemLabel(z)).join(", ")}`);
  }

  return parts.join("; ");
}

type FloorPlanItemSnap = {
  label: string;
  x: number;
  y: number;
  tiers: string;
};

function floorPlanItemSnap(item: FloorPlanItem): FloorPlanItemSnap {
  const tiers =
    item.kind === "table"
      ? (item.priceTierLabels?.join(", ") ?? item.priceTierLabel ?? "")
      : "";
  return {
    label: floorItemLabel(item),
    x: Math.round(item.x * 10) / 10,
    y: Math.round(item.y * 10) / 10,
    tiers,
  };
}

/** Конкретные изменения плана (добавление, удаление, перемещение). */
export function diffFloorPlanAuditLines(from: unknown, to: unknown): string[] {
  const fromPlan = parseFloorPlanForAudit(from);
  const toPlan = parseFloorPlanForAudit(to);
  if (!fromPlan && !toPlan) return [];

  const fromMap = new Map(
    (fromPlan?.items ?? []).map((item) => [item.id, floorPlanItemSnap(item)]),
  );
  const toMap = new Map((toPlan?.items ?? []).map((item) => [item.id, floorPlanItemSnap(item)]));
  const lines: string[] = [];

  for (const [id, next] of toMap) {
    const prev = fromMap.get(id);
    if (!prev) {
      lines.push(`добавлено: ${next.label}`);
      continue;
    }
    if (prev.x !== next.x || prev.y !== next.y) {
      lines.push(`перемещено: ${next.label}`);
    }
    if (prev.tiers !== next.tiers) {
      lines.push(
        next.tiers
          ? `тарифы у «${next.label}»: ${prev.tiers || "не заданы"} → ${next.tiers}`
          : `тарифы у «${next.label}»: сброшены`,
      );
    }
    if (prev.label !== next.label) {
      lines.push(`переименовано: ${prev.label} → ${next.label}`);
    }
  }

  for (const [id, prev] of fromMap) {
    if (!toMap.has(id)) lines.push(`удалено: ${prev.label}`);
  }

  if (lines.length === 0 && fromPlan && toPlan) {
    lines.push("состав плана без изменений (обновлены служебные данные)");
  }

  return lines;
}

function formatFloorPlanHuman(value: unknown): string {
  return summarizeFloorPlan(value);
}

/** Каноническое значение для сравнения «изменилось / нет». */
export function normalizeClubFieldValue(key: string, value: unknown): string {
  switch (key) {
    case "weeklyHours":
      return stableJson(weeklyHoursToJson(parseWeeklyHours(value)) ?? null);
    case "priceTiers":
      return stableJson(priceTiersToJson(parsePriceTiers(value)) ?? null);
    case "tableCounts":
      return stableJson(tableCountsToJson(parseClubTableCounts(value)) ?? null);
    case "galleryUrls":
      return stableJson(
        parseClubGalleryUrls(value).length > 0 ? parseClubGalleryUrls(value) : null,
      );
    case "floorPlan":
      return stableJson(floorPlanToJson(parseFloorPlanForAudit(value)) ?? null);
    case "bookingEnabled":
      return value ? "1" : "0";
    case "displayPhone":
      return typeof value === "string" ? value.trim() : "";
    default:
      if (value === null || value === undefined) return "";
      if (typeof value === "boolean") return value ? "1" : "0";
      if (typeof value === "object") return stableJson(value);
      return String(value).trim();
  }
}

export function displayClubFieldValue(key: string, value: unknown): string {
  switch (key) {
    case "weeklyHours":
      return formatWeeklyHoursHuman(value);
    case "priceTiers":
      return formatPriceTiersHuman(value);
    case "tableCounts":
      return formatTableCountsHuman(value);
    case "galleryUrls":
      return formatGalleryHuman(value);
    case "floorPlan":
      return formatFloorPlanHuman(value);
    case "bookingEnabled":
      return value ? "включены" : "выключены";
    case "displayPhone":
      if (typeof value !== "string" || value.length < 10) return "не указан";
      return formatE164Display(value);
    default:
      if (value === null || value === undefined) return "—";
      if (typeof value === "boolean") return value ? "да" : "нет";
      if (typeof value === "number") return String(value);
      const s = String(value).trim();
      return s || "—";
  }
}

/** Переформатирует старые записи в журнале (сырой JSON в payload). */
export function displayStoredAuditChange(label: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—") return "—";
  if (trimmed === "[]" || trimmed === "{}") {
    const key = LABEL_TO_KEY[label];
    if (key === "weeklyHours" || key === "priceTiers" || key === "tableCounts") {
      return displayClubFieldValue(key, key === "weeklyHours" ? [] : []);
    }
    if (key === "floorPlan") return "пустой план";
  }
  const key = LABEL_TO_KEY[label];
  if (!key) return trimmed;
  if (key === "floorPlan" && (trimmed.startsWith("{") || trimmed.includes('"items"'))) {
    const parsed = parseFloorPlanForAudit(trimmed);
    if (parsed) return summarizeFloorPlan(parsed);
  }
  if (
    (key === "weeklyHours" || key === "priceTiers" || key === "tableCounts" || key === "floorPlan") &&
    (trimmed.startsWith("[") || trimmed.startsWith("{"))
  ) {
    try {
      const parsed = JSON.parse(trimmed.replace(/…$/, "")) as unknown;
      return displayClubFieldValue(key, parsed);
    } catch {
      if (key === "floorPlan") {
        const parsed = parseFloorPlanForAudit(trimmed);
        if (parsed) return summarizeFloorPlan(parsed);
      }
      return trimmed;
    }
  }
  return trimmed;
}

export function formatAuditChanges(
  changes: Record<string, { from: string; to: string }>,
): string {
  return Object.entries(changes)
    .map(([label, v]) => `${label}: было «${v.from}», стало «${v.to}»`)
    .join("; ");
}

export function buildClubUpdateSummary(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
): { summary: string; changes: Record<string, AuditChangeEntry> } {
  const changes: Record<string, AuditChangeEntry> = {};

  for (const key of Object.keys(patch)) {
    if (patch[key] === undefined) continue;
    const fromRaw = existing[key];
    const toRaw = patch[key];

    if (normalizeClubFieldValue(key, fromRaw) === normalizeClubFieldValue(key, toRaw)) {
      continue;
    }

    const label = CLUB_FIELD_LABELS[key] ?? key;
    let entry: AuditChangeEntry = {
      from: displayClubFieldValue(key, fromRaw),
      to: displayClubFieldValue(key, toRaw),
    };
    if (key === "floorPlan") {
      const diff = diffFloorPlanAuditLines(fromRaw, toRaw);
      if (diff.length > 0) entry.diff = diff;
    }
    entry = augmentAuditChangeEntry(key, fromRaw, toRaw, entry);
    changes[label] = entry;
  }

  const parts = Object.keys(changes);
  const summary =
    parts.length === 0
      ? "Изменения в профиле"
      : parts.length <= 3
        ? `Изменено: ${parts.join(", ")}`
        : `Изменено полей: ${parts.length}`;

  return { summary, changes };
}

/** Подставляет названия городов вместо id в diff. */
export async function enrichClubAuditChanges(
  changes: Record<string, AuditChangeEntry>,
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
): Promise<Record<string, AuditChangeEntry>> {
  const label = CLUB_FIELD_LABELS.cityId;
  if (!changes[label]) return changes;

  const ids = [existing.cityId, patch.cityId].filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  if (ids.length === 0) return changes;

  const cities = await prisma.city.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, nameRu: true },
  });
  const byId = new Map(cities.map((c) => [c.id, c.nameRu]));

  return {
    ...changes,
    [label]: {
      from: byId.get(String(existing.cityId)) ?? changes[label].from,
      to: byId.get(String(patch.cityId)) ?? changes[label].to,
    },
  };
}
