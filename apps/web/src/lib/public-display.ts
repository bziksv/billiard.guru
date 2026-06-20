export const PUBLIC_TOURNAMENT_STATUSES = ["OPEN", "ACTIVE", "FINISHED"] as const;

/** Участники и заявки, видимые на публичной странице турнира. */
export const PUBLIC_PARTICIPANT_STATUSES = ["CONFIRMED", "PENDING"] as const;

export function formatStartsAt(date: Date | null) {
  if (!date) return "Дата уточняется";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function isPairFormat(format: string) {
  return format.startsWith("PAIR_");
}

export function playerName(p: {
  lastName: string;
  firstName: string;
  middleName?: string | null;
}) {
  return `${p.lastName} ${p.firstName}${p.middleName ? ` ${p.middleName}` : ""}`;
}

export function teamLabel(team: {
  name?: string | null;
  player1: { lastName: string; firstName: string };
  player2?: { lastName: string; firstName: string } | null;
}) {
  if (team.name?.trim()) return team.name.trim();
  if (!team.player2) {
    return `${team.player1.lastName} ${team.player1.firstName}`;
  }
  return `${team.player1.lastName} / ${team.player2.lastName}`;
}
