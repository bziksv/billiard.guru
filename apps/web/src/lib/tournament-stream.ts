import { parseFloorPlan } from "@/lib/club-floor-plan";
import {
  buildTournamentTableGroups,
  parseTournamentTableIds,
  tournamentTableLabels,
} from "@/lib/tournament-table-pick";
import type { PrismaClient } from "@/generated/prisma/client";

export type TournamentTableStreams = Record<string, string>;

export function normalizeStreamUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const href = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export function parseTournamentTableStreams(raw: unknown): TournamentTableStreams {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: TournamentTableStreams = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key !== "string" || !key.trim()) continue;
    if (typeof value !== "string") continue;
    const normalized = normalizeStreamUrl(value);
    if (normalized) result[key] = normalized;
  }
  return result;
}

export function sanitizeTournamentTableStreams(
  tableIds: string[],
  raw: unknown,
): TournamentTableStreams {
  const allowed = new Set(tableIds);
  const parsed = parseTournamentTableStreams(raw);
  const result: TournamentTableStreams = {};
  for (const [id, url] of Object.entries(parsed)) {
    if (allowed.has(id)) result[id] = url;
  }
  return result;
}

export function validateTournamentTableStreams(
  tableIds: string[],
  raw: unknown,
): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "string" || !value.trim()) continue;
    if (!tableIds.includes(key)) {
      return "Ссылка на трансляцию указана для не выбранного стола";
    }
    if (!normalizeStreamUrl(value)) {
      return "Некорректная ссылка на трансляцию";
    }
  }
  return null;
}

export function resolveTableStreamUrl(
  tableId: string | null | undefined,
  tableStreamsRaw: unknown,
  floorPlanRaw?: unknown,
): string | null {
  if (!tableId) return null;
  const streams = parseTournamentTableStreams(tableStreamsRaw);
  if (streams[tableId]) return streams[tableId];
  const plan = parseFloorPlan(floorPlanRaw);
  const item = plan?.items.find((row) => row.id === tableId);
  if (item?.streamUrl) {
    return normalizeStreamUrl(item.streamUrl);
  }
  return null;
}

export function resolveMatchStreamUrl(
  match: { tableId?: string | null },
  tournament: { tableStreams?: unknown; tableIds?: unknown },
  floorPlanRaw?: unknown,
): string | null {
  return resolveTableStreamUrl(match.tableId, tournament.tableStreams, floorPlanRaw);
}

export function tournamentTableOptions(
  tableIdsRaw: unknown,
  floorPlanRaw: unknown,
  tableCountsRaw: unknown,
): { id: string; label: string }[] {
  const ids = parseTournamentTableIds(tableIdsRaw);
  const labels = tournamentTableLabels(ids, floorPlanRaw, tableCountsRaw);
  return ids.map((id, index) => ({ id, label: labels[index] ?? id }));
}

type Db = Pick<PrismaClient, "tournament" | "tournamentMatch">;

/** Первый свободный стол турнира (встреча начата, ещё не завершена). */
export async function pickFreeTournamentTableId(
  db: Db,
  tournamentId: string,
  excludeMatchId: string,
): Promise<string | null> {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { tableIds: true },
  });
  const tableIds = parseTournamentTableIds(tournament?.tableIds);
  if (tableIds.length === 0) return null;

  const busy = await db.tournamentMatch.findMany({
    where: {
      tournamentId,
      id: { not: excludeMatchId },
      tableId: { not: null },
      startedAt: { not: null },
      finishedAt: null,
      status: { not: "FINISHED" },
    },
    select: { tableId: true },
  });
  const busyIds = new Set(busy.map((row) => row.tableId).filter(Boolean) as string[]);
  for (const id of tableIds) {
    if (!busyIds.has(id)) return id;
  }
  return tableIds[0] ?? null;
}

export function tableStreamsToJson(
  streams: TournamentTableStreams,
): Record<string, string> | undefined {
  const entries = Object.entries(streams);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}
