import type { BracketMatchView } from "@/lib/bracket-view";
import { describeHandicap, describeHandicapShort } from "@/lib/handicap";
import { formatRating } from "@/lib/rating";
import {
  fixedSwissMatchNo,
  inferFixedSwissGridSize,
  isFixedSwissTs32BronzeMatchCount,
  isFixedSwissTs32MatchCount,
  isFixedSwissTs64BronzeMatchCount,
  isFixedSwissTs64MatchCount,
} from "@/lib/fixed-swiss-grid";
import {
  fixedSwissColumnLabel,
  fixedSwissMatchColForCount,
  fixedSwissPlacementLabel,
} from "@/lib/fixed-swiss-layout";
import {
  fixedSwissTs32StageByMatchNo,
  fixedSwissTs64StageByMatchNo,
} from "@/lib/fixed-swiss-ts-grid";
import {
  isExcelRef64Format,
  isFixedSwissFormat,
  isOlympicFormat,
  teamLabel,
  teamRating,
  usesFixedSwissGridEngine,
} from "@/lib/pair-tournament";

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

/** Сколько идёт встреча: «01:23» (часы:минуты с начала). */
export function formatMatchElapsedHm(
  startedAt: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!startedAt) return null;
  const startMs = new Date(startedAt).getTime();
  if (Number.isNaN(startMs)) return null;
  const totalMinutes = Math.floor(Math.max(0, now.getTime() - startMs) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function buildBracketMatchNumbers(
  matches: BracketMatchView[],
  format: string,
): Map<string, number> {
  const maxRound = matches.reduce((max, m) => Math.max(max, m.round), 0);
  const matchCount = matches.length;
  const fixedSwiss = usesFixedSwissGridEngine(format);

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

/** Рейтинги сторон: «3.5 — 2» (сильнее — слабее по порядку в паре). */
export function matchRatingsLabel(match: BracketMatchView): string {
  if (!match.team1 || !match.team2) return "—";
  return `${formatRating(teamRating(match.team1))} — ${formatRating(teamRating(match.team2))}`;
}

/** Короткая подпись форы для списка встреч. */
export function matchHandicapShortLabel(
  match: BracketMatchView,
  handicapHalfStep = true,
): string {
  if (!match.team1 || !match.team2) return "—";
  const high = Math.max(teamRating(match.team1), teamRating(match.team2));
  const low = Math.min(teamRating(match.team1), teamRating(match.team2));
  return describeHandicapShort(high, low, { halfStep: handicapHalfStep });
}

/** Полная расшифровка форы (для title). */
export function matchHandicapFullLabel(
  match: BracketMatchView,
  handicapHalfStep = true,
): string | null {
  if (!match.team1 || !match.team2) return null;
  const high = Math.max(teamRating(match.team1), teamRating(match.team2));
  const low = Math.min(teamRating(match.team1), teamRating(match.team2));
  return describeHandicap(high, low, { halfStep: handicapHalfStep });
}

/** Колонка сетки / этап — как подписи на визуальной сетке. */
export function matchStageLabel(
  match: BracketMatchView,
  format: string,
  allMatches: BracketMatchView[],
  matchNumber?: number,
): string {
  const maxRound = allMatches.reduce((max, m) => Math.max(max, m.round), 0);
  const matchCount = allMatches.length;

  if (usesFixedSwissGridEngine(format) && matchCount > 0) {
    try {
      const col = fixedSwissMatchColForCount(
        match.round,
        match.slot,
        matchCount,
        maxRound,
      );
      const mpr = inferFixedSwissGridSize(matchCount) / 2;
      const no =
        matchNumber ??
        fixedSwissMatchNo(match.round, match.slot, matchCount, maxRound);
      const stageOverride =
        isFixedSwissTs32MatchCount(matchCount) ||
        isFixedSwissTs32BronzeMatchCount(matchCount)
          ? fixedSwissTs32StageByMatchNo(no)
          : isFixedSwissTs64MatchCount(matchCount) ||
              isFixedSwissTs64BronzeMatchCount(matchCount)
            ? fixedSwissTs64StageByMatchNo(no)
            : null;
      const stage =
        stageOverride ?? fixedSwissColumnLabel(col, matchCount, maxRound);
      const placement = fixedSwissPlacementLabel(
        match.round,
        match.slot,
        maxRound,
        mpr,
        matchCount,
        no,
      );
      return placement ? `${stage} · ${placement}` : stage;
    } catch {
      return `Тур ${match.round}`;
    }
  }

  if (isOlympicFormat(format) && maxRound > 0) {
    const fromFinal = maxRound - match.round;
    if (fromFinal === 0) return "Финал";
    if (fromFinal === 1) return "Полуфинал";
    if (fromFinal === 2) return "1/4 финала";
    if (fromFinal === 3) return "1/8 финала";
  }

  return `Тур ${match.round}`;
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
