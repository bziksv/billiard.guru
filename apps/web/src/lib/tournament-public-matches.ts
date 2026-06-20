import type { BracketMatchView } from "@/lib/bracket-view";
import {
  buildBracketMatchNumbers,
  isCurrentMatch,
  isMatchFinished,
  isUpcomingMatch,
  matchParticipantsLabel,
  matchScoreLabel,
  matchStageLabel,
} from "@/lib/tournament-match-schedule";

export type PublicMatchStatus = "completed" | "current" | "upcoming" | "waiting";

export type PublicMatchRow = {
  id: string;
  matchNo: number;
  stage: string;
  participants: string;
  score: string;
  status: PublicMatchStatus;
  startedAt: string | null;
  finishedAt: string | null;
};

const STATUS_LABELS: Record<PublicMatchStatus, string> = {
  completed: "Завершена",
  current: "Идёт",
  upcoming: "Готова",
  waiting: "Ожидание",
};

export function publicMatchStatusLabel(status: PublicMatchStatus): string {
  return STATUS_LABELS[status];
}

function publicMatchStatus(match: BracketMatchView): PublicMatchStatus {
  if (isMatchFinished(match)) return "completed";
  if (isCurrentMatch(match)) return "current";
  if (isUpcomingMatch(match)) return "upcoming";
  return "waiting";
}

export function buildPublicMatchRows(
  matches: BracketMatchView[],
  format: string,
): PublicMatchRow[] {
  const numbers = buildBracketMatchNumbers(matches, format);
  return [...matches]
    .sort((a, b) => (numbers.get(a.id) ?? 0) - (numbers.get(b.id) ?? 0))
    .map((match) => ({
      id: match.id,
      matchNo: numbers.get(match.id) ?? 0,
      stage: matchStageLabel(match, format, matches, numbers.get(match.id)),
      participants: matchParticipantsLabel(match),
      score: matchScoreLabel(match),
      status: publicMatchStatus(match),
      startedAt: match.startedAt ?? null,
      finishedAt: match.finishedAt ?? null,
    }));
}
