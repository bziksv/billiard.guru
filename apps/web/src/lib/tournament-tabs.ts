import type { TournamentStatus } from "@/generated/prisma/client";

export type TournamentTab = "upcoming" | "active" | "finished";

export const TOURNAMENT_TAB_CONFIG: {
  id: TournamentTab;
  status: TournamentStatus;
}[] = [
  { id: "upcoming", status: "OPEN" },
  { id: "active", status: "ACTIVE" },
  { id: "finished", status: "FINISHED" },
];

export function parseTournamentTab(raw: string | undefined): TournamentTab {
  if (raw === "active" || raw === "finished") return raw;
  return "upcoming";
}

export function tournamentTabStatus(tab: TournamentTab): TournamentStatus {
  return TOURNAMENT_TAB_CONFIG.find((item) => item.id === tab)!.status;
}

export function tournamentTabConfig(tab: TournamentTab) {
  return TOURNAMENT_TAB_CONFIG.find((item) => item.id === tab)!;
}

type TournamentListItem = {
  status: string;
  startsAt: Date | null;
  createdAt?: Date;
};

export function countTournamentsByTab(
  tournaments: { status: string }[],
): Record<TournamentTab, number> {
  const counts: Record<TournamentTab, number> = {
    upcoming: 0,
    active: 0,
    finished: 0,
  };
  for (const tournament of tournaments) {
    if (tournament.status === "OPEN") counts.upcoming += 1;
    else if (tournament.status === "ACTIVE") counts.active += 1;
    else if (tournament.status === "FINISHED") counts.finished += 1;
  }
  return counts;
}

export function filterTournamentsByTab<T extends { status: string }>(
  tournaments: T[],
  tab: TournamentTab,
): T[] {
  const status = tournamentTabStatus(tab);
  return tournaments.filter((t) => t.status === status);
}

export function sortTournamentsForTab<T extends TournamentListItem>(
  tournaments: T[],
  tab: TournamentTab,
): T[] {
  const sorted = [...tournaments];
  sorted.sort((a, b) => compareStartsAtForTab(a, b, tab));
  return sorted;
}

const HOME_STATUS_PRIORITY: Record<string, number> = {
  OPEN: 0,
  ACTIVE: 1,
  FINISHED: 2,
};

function compareStartsAtForTab(
  a: TournamentListItem,
  b: TournamentListItem,
  tab: TournamentTab,
): number {
  const aTime = a.startsAt?.getTime() ?? null;
  const bTime = b.startsAt?.getTime() ?? null;
  if (aTime != null && bTime != null && aTime !== bTime) {
    return tab === "finished" ? bTime - aTime : aTime - bTime;
  }
  if (aTime != null && bTime == null) return -1;
  if (aTime == null && bTime != null) return 1;
  const aCreated = a.createdAt?.getTime() ?? 0;
  const bCreated = b.createdAt?.getTime() ?? 0;
  return tab === "finished" ? bCreated - aCreated : bCreated - aCreated;
}

/** Турниры для главной: OPEN → ACTIVE → FINISHED, с датой раньше без даты. */
export function pickHomeTournaments<T extends TournamentListItem & { id: string }>(
  tournaments: T[],
  take = 4,
): T[] {
  const seen = new Set<string>();
  const unique = tournaments.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  const sorted = [...unique].sort((a, b) => {
    const pa = HOME_STATUS_PRIORITY[a.status] ?? 9;
    const pb = HOME_STATUS_PRIORITY[b.status] ?? 9;
    if (pa !== pb) return pa - pb;
    const tab: TournamentTab = a.status === "FINISHED" ? "finished" : "upcoming";
    return compareStartsAtForTab(a, b, tab);
  });

  return sorted.slice(0, take);
}
