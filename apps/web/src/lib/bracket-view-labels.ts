import type { BracketMatchView, BracketCardFooterRow } from "@/lib/bracket-view";
import {
  matchAutopassBye,
  olympicLoserDestMatchNo,
  olympicLoserPlaceRange,
  olympicWinnerDestMatchNo,
} from "@/lib/bracket-view";
import type { AppLocale } from "@/i18n/routing";

export type BracketUILabels = {
  waiting: string;
  handicap: string;
  handicapTitle: (value: string) => string;
  ratingPrefix: string;
  highlightPlayer: string;
  matchResult: string;
  noHandicap: string;
  notFormedShort: string;
  round: (round: number) => string;
  standings: string;
  final: string;
  finalBronze: string;
  semifinal: string;
  bronzeMatch: string;
  placeFinal: string;
  placeRange: (from: number, to: number) => string;
  autopassTo: (matchNo: number) => string;
  winnerTo: (matchNo: number) => string;
  loserTo: (matchNo: number) => string;
  walkover: string;
};

const LABELS: Record<AppLocale, BracketUILabels> = {
  ru: {
    waiting: "Ожидание",
    handicap: "Фора",
    handicapTitle: (value) => `Фора: ${value}`,
    ratingPrefix: "ур.",
    highlightPlayer: "Подсветить встречи игрока",
    matchResult: "Результат встречи",
    noHandicap: "Без форы",
    notFormedShort: "Сетка ещё не сформирована.",
    round: (round) => `Раунд ${round}`,
    standings: "Таблица",
    final: "Финал",
    finalBronze: "Финал / 3–4",
    semifinal: "Полуфинал",
    bronzeMatch: "матч за 3–4 место",
    placeFinal: "место 1–2",
    placeRange: (from, to) => `место ${from}–${to}`,
    autopassTo: (matchNo) => `автопроход на #${matchNo}`,
    winnerTo: (matchNo) => `победитель на #${matchNo}`,
    loserTo: (matchNo) => `проигравший на #${matchNo}`,
    walkover: "тех. поражение",
  },
  en: {
    waiting: "Waiting",
    handicap: "Handicap",
    handicapTitle: (value) => `Handicap: ${value}`,
    ratingPrefix: "rtg.",
    highlightPlayer: "Highlight player matches",
    matchResult: "Match result",
    noHandicap: "No handicap",
    notFormedShort: "The bracket has not been formed yet.",
    round: (round) => `Round ${round}`,
    standings: "Standings",
    final: "Final",
    finalBronze: "Final / 3–4",
    semifinal: "Semifinal",
    bronzeMatch: "3rd–4th place match",
    placeFinal: "places 1–2",
    placeRange: (from, to) => `places ${from}–${to}`,
    autopassTo: (matchNo) => `bye to #${matchNo}`,
    winnerTo: (matchNo) => `winner to #${matchNo}`,
    loserTo: (matchNo) => `loser to #${matchNo}`,
    walkover: "Walkover",
  },
};

export function getBracketUILabels(locale: AppLocale = "ru"): BracketUILabels {
  return LABELS[locale] ?? LABELS.ru;
}

export function localizedOlympicColumnLabel(
  locale: AppLocale,
  round: number,
  maxRound: number,
  withBronzeMatch: boolean,
): string {
  const L = getBracketUILabels(locale);
  if (round === maxRound) {
    return withBronzeMatch ? L.finalBronze : L.final;
  }
  if (round === maxRound - 1) return L.semifinal;
  return `1/${2 ** (maxRound - round)}`;
}

function localizedOlympicMatchPlacementLabel(
  locale: AppLocale,
  round: number,
  slot: number,
  maxRound: number,
  withBronzeMatch: boolean,
): string | null {
  const L = getBracketUILabels(locale);
  if (withBronzeMatch && round === maxRound && slot === 2) {
    return L.bronzeMatch;
  }
  if (round === maxRound && slot === 1) {
    return L.placeFinal;
  }
  const places = olympicLoserPlaceRange(round, maxRound);
  if (places) {
    return L.placeRange(places.from, places.to);
  }
  return null;
}

export function localizedOlympicMatchFooterRows(
  locale: AppLocale,
  match: BracketMatchView,
  matches: BracketMatchView[],
  matchNumbers: Map<string, number>,
  maxRound: number,
  withBronzeMatch: boolean,
): BracketCardFooterRow[] {
  const L = getBracketUILabels(locale);
  const placement = localizedOlympicMatchPlacementLabel(
    locale,
    match.round,
    match.slot,
    maxRound,
    withBronzeMatch,
  );
  const { isBye: roundOneBye } = matchAutopassBye(match);
  const winnerToNo = olympicWinnerDestMatchNo(match, matches, matchNumbers, maxRound);
  const loserToNo = olympicLoserDestMatchNo(
    match,
    matches,
    matchNumbers,
    maxRound,
    withBronzeMatch,
  );

  const winnerLine =
    winnerToNo !== undefined
      ? roundOneBye && match.round === 1
        ? L.autopassTo(winnerToNo)
        : L.winnerTo(winnerToNo)
      : null;
  const loserLine = loserToNo !== undefined ? L.loserTo(loserToNo) : null;

  const footerRows: BracketCardFooterRow[] = [];

  if (winnerLine && loserLine) {
    if (placement) footerRows.push({ kind: "text", text: placement });
    footerRows.push({ kind: "split", left: loserLine, right: winnerLine });
  } else if (placement && winnerLine) {
    footerRows.push({ kind: "split", left: placement, right: winnerLine });
  } else if (placement && loserLine) {
    footerRows.push({ kind: "split", left: placement, right: loserLine });
  } else if (placement) {
    footerRows.push({ kind: "text", text: placement });
  } else if (winnerLine) {
    footerRows.push({ kind: "text", text: winnerLine });
  } else if (loserLine) {
    footerRows.push({ kind: "text", text: loserLine });
  }

  return footerRows;
}

const BRACKET_COLUMN_LABEL_EN: Record<string, string> = {
  Старт: "Start",
  "Первый тур": "First round",
  Крест: "Cross",
  "Полуфинал": "Semifinal",
  Финал: "Final",
  "Матч за 3–4": "3rd–4th",
  "1/16 финала": "Round of 16",
  "1/8 финала": "Round of 8",
  "1/4 финала": "Quarterfinal",
};

export function localizedFixedSwissFooterDestLabel(
  kind: "win" | "loss" | "bye",
  matchNo: number,
  locale: AppLocale,
): string {
  const L = getBracketUILabels(locale);
  if (kind === "bye") return L.autopassTo(matchNo);
  if (kind === "loss") return L.loserTo(matchNo);
  return L.winnerTo(matchNo);
}

/** Колонки fixed Swiss / grid — перевод подписей с RU-генераторов layout. */
export function localizeBracketColumnLabel(label: string, locale: AppLocale): string {
  if (locale === "ru") return label;

  if (BRACKET_COLUMN_LABEL_EN[label]) return BRACKET_COLUMN_LABEL_EN[label];

  let m = label.match(/^Нижняя, тур (\d+)$/);
  if (m) return `Lower, round ${m[1]}`;

  m = label.match(/^Верхняя, тур (\d+)( · 1\/8)?$/);
  if (m) return m[2] ? `Upper, round ${m[1]} · R16` : `Upper, round ${m[1]}`;

  m = label.match(/^Тур (\d+)$/);
  if (m) return `Round ${m[1]}`;

  if (label === "← 1" || label === "← 2") return label;

  return label;
}

/** Подвал карточки, места, переходы — перевод RU-строк из fixed-swiss-layout. */
export function localizeBracketFooterText(text: string, locale: AppLocale): string {
  if (locale === "ru") return text;

  const L = getBracketUILabels(locale);

  if (text === "полуфинал") return L.semifinal;
  if (text === "матч за 3–4 место") return L.bronzeMatch;
  if (text === "тех. поражение") return L.walkover;

  let m = text.match(/^место (\d+)–(\d+)$/);
  if (m) return L.placeRange(Number(m[1]), Number(m[2]));

  m = text.match(/^автопроход на #(\d+)$/);
  if (m) return L.autopassTo(Number(m[1]));

  m = text.match(/^победитель на #(\d+)$/);
  if (m) return L.winnerTo(Number(m[1]));

  m = text.match(/^проигравший на #(\d+)$/);
  if (m) return L.loserTo(Number(m[1]));

  return localizeBracketColumnLabel(text, locale);
}
