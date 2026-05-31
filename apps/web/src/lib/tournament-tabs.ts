import type { TournamentStatus } from "@/generated/prisma/client";

export type TournamentTab = "upcoming" | "active" | "finished";

export const TOURNAMENT_TAB_CONFIG: {
  id: TournamentTab;
  label: string;
  emptyTitle: string;
  emptyDescription: string;
  status: TournamentStatus;
}[] = [
  {
    id: "upcoming",
    label: "Предстоящие",
    emptyTitle: "Нет предстоящих турниров",
    emptyDescription: "В выбранном регионе пока нет турниров с открытой регистрацией.",
    status: "OPEN",
  },
  {
    id: "active",
    label: "Текущие",
    emptyTitle: "Нет текущих турниров",
    emptyDescription: "Сейчас в регионе никто не играет — загляните в предстоящие.",
    status: "ACTIVE",
  },
  {
    id: "finished",
    label: "Завершённые",
    emptyTitle: "Нет завершённых турниров",
    emptyDescription: "Архив турниров в этом регионе пока пуст.",
    status: "FINISHED",
  },
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
  sorted.sort((a, b) => {
    const aTime = a.startsAt?.getTime() ?? 0;
    const bTime = b.startsAt?.getTime() ?? 0;
    if (aTime !== bTime) {
      return tab === "finished" ? bTime - aTime : aTime - bTime;
    }
    const aCreated = a.createdAt?.getTime() ?? 0;
    const bCreated = b.createdAt?.getTime() ?? 0;
    return tab === "finished" ? bCreated - aCreated : aCreated - bCreated;
  });
  return sorted;
}
