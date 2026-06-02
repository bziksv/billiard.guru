import type { BracketMatchView } from "@/lib/bracket-view";
import { fixedSwissMatchNo } from "@/lib/fixed-swiss-grid";
import { isFixedSwissFormat, teamLabel } from "@/lib/pair-tournament";

export function isMatchFinished(match: BracketMatchView): boolean {
  return (
    match.status === "FINISHED" ||
    match.status === "WALKOVER" ||
    !!match.winnerTeamId
  );
}

export function isMatchPlayable(match: BracketMatchView): boolean {
  return !!(match.team1 && match.team2);
}

/** Встреча начата, но результат ещё не зафиксирован. */
export function isCurrentMatch(match: BracketMatchView): boolean {
  if (isMatchFinished(match)) return false;
  return !!match.startedAt;
}

/** Обе стороны известны, встреча ещё не начата. */
export function isUpcomingMatch(match: BracketMatchView): boolean {
  if (isMatchFinished(match)) return false;
  if (match.startedAt) return false;
  return isMatchPlayable(match);
}

export function formatMatchDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildBracketMatchNumbers(
  matches: BracketMatchView[],
  format: string,
): Map<string, number> {
  const maxRound = matches.reduce((max, m) => Math.max(max, m.round), 0);
  const matchCount = matches.length;
  const fixedSwiss = isFixedSwissFormat(format);

  if (fixedSwiss && matchCount > 0) {
    try {
      return new Map(
        matches.map((m) => [
          m.id,
          fixedSwissMatchNo(m.round, m.slot, matchCount, maxRound),
        ]),
      );
    } catch {
      // fallback below
    }
  }

  const sorted = [...matches].sort(
    (a, b) => a.round - b.round || a.slot - b.slot,
  );
  return new Map(sorted.map((m, i) => [m.id, i + 1]));
}

export function matchParticipantsLabel(match: BracketMatchView): string {
  const left = match.team1 ? teamLabel(match.team1) : "—";
  const right = match.team2 ? teamLabel(match.team2) : "—";
  return `${left} — ${right}`;
}

export function sortCurrentMatches(matches: BracketMatchView[]): BracketMatchView[] {
  return [...matches].sort((a, b) => {
    const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return tb - ta;
  });
}

export function sortUpcomingMatches(
  matches: BracketMatchView[],
  format: string,
  allMatches?: BracketMatchView[],
): BracketMatchView[] {
  const numbers = buildBracketMatchNumbers(allMatches ?? matches, format);
  return [...matches].sort((a, b) => {
    const na = numbers.get(a.id) ?? 0;
    const nb = numbers.get(b.id) ?? 0;
    if (na !== nb) return na - nb;
    return a.round - b.round || a.slot - b.slot;
  });
}

export function filterCurrentMatches(matches: BracketMatchView[]): BracketMatchView[] {
  return sortCurrentMatches(matches.filter(isCurrentMatch));
}

export function filterUpcomingMatches(
  matches: BracketMatchView[],
  format: string,
): BracketMatchView[] {
  return sortUpcomingMatches(
    matches.filter(isUpcomingMatch),
    format,
    matches,
  );
}

export function sortCompletedMatches(
  matches: BracketMatchView[],
  format: string,
  allMatches?: BracketMatchView[],
): BracketMatchView[] {
  const numbers = buildBracketMatchNumbers(allMatches ?? matches, format);
  return [...matches].sort((a, b) => {
    const fa = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
    const fb = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
    if (fa !== fb) return fb - fa;
    const na = numbers.get(a.id) ?? 0;
    const nb = numbers.get(b.id) ?? 0;
    if (na !== nb) return na - nb;
    return a.round - b.round || a.slot - b.slot;
  });
}

export function filterCompletedMatches(
  matches: BracketMatchView[],
  format: string,
): BracketMatchView[] {
  return sortCompletedMatches(
    matches.filter(isMatchFinished),
    format,
    matches,
  );
}

export function matchScoreLabel(match: BracketMatchView): string {
  if (match.team1Score != null && match.team2Score != null) {
    return `${match.team1Score}:${match.team2Score}`;
  }
  if (match.winnerTeamId) {
    const team1Wins = match.winnerTeamId === match.team1?.id;
    if (match.team1 && match.team2) {
      return team1Wins ? "1:0" : "0:1";
    }
    return "1:0";
  }
  return "—";
}
