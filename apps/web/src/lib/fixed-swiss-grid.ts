import type { BracketMatchInput } from "@/lib/pair-tournament";
import {
  buildFixedSwissTsTemplateForGridSize,
  buildFixedSwissTs32OutdatedTemplate,
  fixedSwissTs32MatchNo,
  fixedSwissTs64MatchNo,
  fixedSwissTsBronzeMatchNoForHalf2,
  fixedSwissTsMatchNoForHalf2,
  isFixedSwissTs32BronzeMatchCount,
  isFixedSwissTs32MatchCount,
  isFixedSwissTs64BronzeMatchCount,
  isFixedSwissTs64MatchCount,
  isOutdatedFixedSwiss32Bracket,
  tsTotalMatchCount,
} from "@/lib/fixed-swiss-ts-grid";
export {
  isFixedSwissTs32MatchCount,
  isFixedSwissTs32BronzeMatchCount,
  isFixedSwissTs64MatchCount,
  isFixedSwissTs64BronzeMatchCount,
  isOutdatedFixedSwiss32Bracket,
} from "@/lib/fixed-swiss-ts-grid";
export type { FixedSwissLink, FixedSwissTemplate } from "@/lib/fixed-swiss-grid-types";
export { findFixedSwissLink } from "@/lib/fixed-swiss-grid-types";
import type { FixedSwissLink, FixedSwissTemplate } from "@/lib/fixed-swiss-grid-types";

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function slotParityTeam(slot: number): 1 | 2 {
  return slot % 2 === 1 ? 1 : 2;
}

/**
 * Эталонная сетка Setka — см. docs/BRACKET_REFERENCE_16_8.md
 *
 * 27 встреч — TS chart «16-8» (7 колонок).
 *
 * #1–8  первый тур
 * #9–12 верхняя, тур 1  |  #13–16 нижняя, тур 1
 * #17–20 нижняя, тур 2 (крест)
 * #21–#24 1/4 финала (место 5–8)
 * #25–#26 место 3–4
 * #27    место 1–2
 */
/** Проигравший верхней R2 (слот 5–8) → крест (слот 1–4), зеркально: #9→#20 … #12→#17. */
function upperLossToCrossSlot(upperSlot: number): number {
  return 5 - (upperSlot - 4);
}

function buildFixedSwissTsTemplate(): FixedSwissTemplate {
  return buildFixedSwissTsTemplateForGridSize(16, false);
}

/** TS 16-8 + матч за 3–4 (#28). */
export function buildFixedSwissTsBronzeTemplate(): FixedSwissTemplate {
  return buildFixedSwissTsTemplateForGridSize(16, true);
}

/** TS 32-16 (59 встреч, нижняя тур 3–4, олимпийка с 1/8). */
export function buildFixedSwissTs32Template(): FixedSwissTemplate {
  return buildFixedSwissTsTemplateForGridSize(32, false);
}

/** TS 32-16 + матч за 3–4 (#60). */
export function buildFixedSwissTs32BronzeTemplate(): FixedSwissTemplate {
  return buildFixedSwissTsTemplateForGridSize(32, true);
}

/** TS 64-32 (111 встреч, нижняя тур 1–4, олимпийка с 1/8). */
export function buildFixedSwissTs64Template(): FixedSwissTemplate {
  return buildFixedSwissTsTemplateForGridSize(64, false);
}

/** TS 64-32 + матч за 3–4 (#112). */
export function buildFixedSwissTs64BronzeTemplate(): FixedSwissTemplate {
  return buildFixedSwissTsTemplateForGridSize(64, true);
}

/** @deprecated Сетка 27 / 6 туров — только для уже созданных турниров в БД. */
function buildFixedSwissTsLegacy27SixRoundTemplate(): FixedSwissTemplate {
  const matches: BracketMatchInput[] = [];

  for (let slot = 1; slot <= 8; slot++) {
    matches.push({ round: 1, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 8; slot++) {
    matches.push({ round: 2, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 6; slot++) {
    matches.push({ round: 3, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 2; slot++) {
    matches.push({ round: 4, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 2; slot++) {
    matches.push({ round: 5, slot, team1Id: null, team2Id: null });
  }
  matches.push({ round: 6, slot: 1, team1Id: null, team2Id: null });

  const links: FixedSwissLink[] = [];

  for (let slot = 1; slot <= 8; slot++) {
    const toTeam = slotParityTeam(slot);
    links.push({
      fromRound: 1,
      fromSlot: slot,
      kind: "win",
      toRound: 2,
      toSlot: 4 + Math.ceil(slot / 2),
      toTeam,
    });
    links.push({
      fromRound: 1,
      fromSlot: slot,
      kind: "loss",
      toRound: 2,
      toSlot: Math.ceil(slot / 2),
      toTeam,
    });
  }

  for (let slot = 1; slot <= 4; slot++) {
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: 5 - slot,
      toTeam: slot % 2 === 1 ? 1 : 2,
    });
  }

  for (let slot = 5; slot <= 8; slot++) {
    const k = slot - 4;
    const toTeam = slotParityTeam(slot);
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: 4 + Math.ceil(k / 2),
      toTeam,
    });
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "loss",
      toRound: 3,
      toSlot: 5 - k,
      toTeam: 1,
    });
  }

  const crossToQuarter: Record<number, number> = { 1: 6, 2: 5, 3: 6, 4: 5 };
  for (let slot = 1; slot <= 4; slot++) {
    links.push({
      fromRound: 3,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: crossToQuarter[slot]!,
      toTeam: 2,
    });
  }

  links.push({ fromRound: 3, fromSlot: 5, kind: "win", toRound: 5, toSlot: 1, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 6, kind: "win", toRound: 5, toSlot: 2, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 5, kind: "loss", toRound: 4, toSlot: 1, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 6, kind: "loss", toRound: 4, toSlot: 2, toTeam: 1 });
  links.push({ fromRound: 4, fromSlot: 1, kind: "win", toRound: 5, toSlot: 2, toTeam: 2 });
  links.push({ fromRound: 4, fromSlot: 2, kind: "win", toRound: 5, toSlot: 1, toTeam: 2 });
  links.push({ fromRound: 5, fromSlot: 1, kind: "win", toRound: 6, toSlot: 1, toTeam: 1 });
  links.push({ fromRound: 5, fromSlot: 2, kind: "win", toRound: 6, toSlot: 1, toTeam: 2 });

  return {
    gridSize: 16,
    rounds: 6,
    matchesPerRound: 8,
    matches,
    links,
    variant: "ts168",
  };
}

/**
 * 29 встреч — устаревший TS chart с нижней тур 3–4 (9 колонок).
 * Для турниров, уже созданных в БД до перехода на 27 встреч.
 */
function buildFixedSwissTsLegacy29Template(): FixedSwissTemplate {
  const matches: BracketMatchInput[] = [];

  for (let slot = 1; slot <= 8; slot++) {
    matches.push({ round: 1, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 8; slot++) {
    matches.push({ round: 2, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 6; slot++) {
    matches.push({ round: 3, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 4; slot++) {
    matches.push({ round: 4, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 2; slot++) {
    matches.push({ round: 5, slot, team1Id: null, team2Id: null });
  }
  matches.push({ round: 6, slot: 1, team1Id: null, team2Id: null });

  const links: FixedSwissLink[] = [];

  for (let slot = 1; slot <= 8; slot++) {
    const toTeam = slotParityTeam(slot);
    links.push({
      fromRound: 1,
      fromSlot: slot,
      kind: "win",
      toRound: 2,
      toSlot: 4 + Math.ceil(slot / 2),
      toTeam,
    });
    links.push({
      fromRound: 1,
      fromSlot: slot,
      kind: "loss",
      toRound: 2,
      toSlot: Math.ceil(slot / 2),
      toTeam,
    });
  }

  for (let slot = 1; slot <= 4; slot++) {
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: 5 - slot,
      toTeam: slot % 2 === 1 ? 1 : 2,
    });
  }

  for (let slot = 5; slot <= 8; slot++) {
    const k = slot - 4;
    const toTeam = slotParityTeam(slot);
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: 4 + Math.ceil(k / 2),
      toTeam,
    });
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "loss",
      toRound: 3,
      toSlot: k,
      toTeam: 1,
    });
  }

  links.push({ fromRound: 3, fromSlot: 1, kind: "win", toRound: 4, toSlot: 1, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 2, kind: "win", toRound: 4, toSlot: 1, toTeam: 2 });
  links.push({ fromRound: 3, fromSlot: 3, kind: "win", toRound: 4, toSlot: 2, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 4, kind: "win", toRound: 4, toSlot: 2, toTeam: 2 });

  links.push({ fromRound: 3, fromSlot: 5, kind: "win", toRound: 5, toSlot: 1, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 6, kind: "win", toRound: 5, toSlot: 2, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 5, kind: "loss", toRound: 4, toSlot: 3, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 6, kind: "loss", toRound: 4, toSlot: 4, toTeam: 1 });

  links.push({ fromRound: 4, fromSlot: 1, kind: "win", toRound: 4, toSlot: 3, toTeam: 1 });
  links.push({ fromRound: 4, fromSlot: 2, kind: "win", toRound: 4, toSlot: 4, toTeam: 1 });

  links.push({ fromRound: 4, fromSlot: 3, kind: "win", toRound: 5, toSlot: 2, toTeam: 2 });
  links.push({ fromRound: 4, fromSlot: 4, kind: "win", toRound: 5, toSlot: 1, toTeam: 2 });

  links.push({ fromRound: 5, fromSlot: 1, kind: "win", toRound: 6, toSlot: 1, toTeam: 1 });
  links.push({ fromRound: 5, fromSlot: 2, kind: "win", toRound: 6, toSlot: 1, toTeam: 2 });

  return {
    gridSize: 16,
    rounds: 6,
    matchesPerRound: 8,
    matches,
    links,
    variant: "ts168legacy29",
  };
}

/** Устаревший шаблон 27 встреч / 7 колонок (5 туров) — для уже созданных турниров. */
function buildFixedSwiss168LegacyTemplate(): FixedSwissTemplate {
  const matches: BracketMatchInput[] = [];
  for (let slot = 1; slot <= 8; slot++) {
    matches.push({ round: 1, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 8; slot++) {
    matches.push({ round: 2, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 8; slot++) {
    matches.push({ round: 3, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 2; slot++) {
    matches.push({ round: 4, slot, team1Id: null, team2Id: null });
  }
  matches.push({ round: 5, slot: 1, team1Id: null, team2Id: null });

  const links: FixedSwissLink[] = [];

  for (let slot = 1; slot <= 8; slot++) {
    const toTeam = slotParityTeam(slot);
    links.push({
      fromRound: 1,
      fromSlot: slot,
      kind: "win",
      toRound: 2,
      toSlot: 4 + Math.ceil(slot / 2),
      toTeam,
    });
    links.push({
      fromRound: 1,
      fromSlot: slot,
      kind: "loss",
      toRound: 2,
      toSlot: Math.ceil(slot / 2),
      toTeam,
    });
  }

  for (let slot = 1; slot <= 4; slot++) {
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: slot,
      /** Нижняя → крест: team2; верхняя loss → крест: team1. */
      toTeam: 2,
    });
  }

  for (let slot = 5; slot <= 8; slot++) {
    const k = slot - 4;
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: k + 4,
      /** Верхняя R2 → team1 в 1/4; крест → team2 (crossToQuarter ниже). */
      toTeam: 1,
    });
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "loss",
      toRound: 3,
      toSlot: upperLossToCrossSlot(slot),
      toTeam: 1,
    });
  }

  const crossToQuarter: Record<number, number> = { 1: 6, 2: 5, 3: 8, 4: 7 };
  for (let slot = 1; slot <= 4; slot++) {
    links.push({
      fromRound: 3,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: crossToQuarter[slot]!,
      toTeam: 2,
    });
  }

  links.push({ fromRound: 3, fromSlot: 5, kind: "win", toRound: 4, toSlot: 1, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 6, kind: "win", toRound: 4, toSlot: 1, toTeam: 2 });
  links.push({ fromRound: 3, fromSlot: 7, kind: "win", toRound: 4, toSlot: 2, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 8, kind: "win", toRound: 4, toSlot: 2, toTeam: 2 });
  links.push({ fromRound: 4, fromSlot: 1, kind: "win", toRound: 5, toSlot: 1, toTeam: 1 });
  links.push({ fromRound: 4, fromSlot: 2, kind: "win", toRound: 5, toSlot: 1, toTeam: 2 });

  return {
    gridSize: 16,
    rounds: 5,
    matchesPerRound: 8,
    matches,
    links,
    variant: "168legacy",
  };
}

function buildFixedSwissClassicTemplate(gridSize: number): FixedSwissTemplate {
  const rounds = Math.log2(gridSize) + 1;
  const matchesPerRound = gridSize / 2;
  const matches: BracketMatchInput[] = [];
  const links: FixedSwissLink[] = [];

  for (let round = 1; round <= rounds; round++) {
    for (let slot = 1; slot <= matchesPerRound; slot++) {
      matches.push({ round, slot, team1Id: null, team2Id: null });
    }
  }

  const half = matchesPerRound / 2;
  for (let round = 1; round < rounds; round++) {
    for (let slot = 1; slot <= matchesPerRound; slot++) {
      const toTeam = slotParityTeam(slot);
      links.push({
        fromRound: round,
        fromSlot: slot,
        kind: "win",
        toRound: round + 1,
        toSlot: Math.ceil(slot / 2),
        toTeam,
      });
      links.push({
        fromRound: round,
        fromSlot: slot,
        kind: "loss",
        toRound: round + 1,
        toSlot: half + Math.ceil(slot / 2),
        toTeam,
      });
    }
  }

  return { gridSize, rounds, matchesPerRound, matches, links, variant: "classic" };
}

export function buildFixedSwissTemplate(
  participantCount: number,
  format?: string,
): FixedSwissTemplate {
  const gridSize = nextPowerOfTwo(participantCount);
  if (gridSize < 4) {
    throw new Error("Фиксированная швейцарская сетка: минимум 4 участника");
  }
  if (gridSize > 64) {
    throw new Error("Фиксированная швейцарская сетка: максимум 64 участника");
  }

  if (gridSize === 16) {
    if (
      format === "FIXED_SWISS_16_BRONZE" ||
      format === "FIXED_PAIR_SWISS_16_BRONZE"
    ) {
      return buildFixedSwissTsTemplateForGridSize(16, true);
    }
    return buildFixedSwissTsTemplateForGridSize(16, false);
  }

  if (gridSize === 32) {
    if (
      format === "FIXED_SWISS_32_BRONZE" ||
      format === "FIXED_PAIR_SWISS_32_BRONZE"
    ) {
      return buildFixedSwissTsTemplateForGridSize(32, true);
    }
    return buildFixedSwissTsTemplateForGridSize(32, false);
  }

  if (gridSize === 64) {
    if (
      format === "FIXED_SWISS_64_BRONZE" ||
      format === "FIXED_PAIR_SWISS_64_BRONZE"
    ) {
      return buildFixedSwissTsTemplateForGridSize(64, true);
    }
    if (
      format === "FIXED_SWISS_64" ||
      format === "FIXED_PAIR_SWISS_64"
    ) {
      return buildFixedSwissTsTemplateForGridSize(64, false);
    }
    return buildFixedSwissTsTemplateForGridSize(64, false);
  }

  return buildFixedSwissClassicTemplate(gridSize);
}

/** Устаревшая сетка 27 встреч с 6 турами (до перехода на 4×1/4). */
export function isFixedSwissTsLegacy27SixRound(
  matchCount: number,
  maxRound?: number,
): boolean {
  return matchCount === 27 && maxRound !== undefined && maxRound >= 6;
}

/** Сетка 27 встреч в БД ещё по старому шаблону (2×1/4, 6 туров). */
export function isOutdatedFixedSwiss27Bracket(
  matches: Array<{ round: number; slot: number }>,
): boolean {
  if (matches.length !== 27) return false;
  const maxRound = Math.max(0, ...matches.map((m) => m.round));
  if (maxRound >= 6) return true;
  const r3 = matches.filter((m) => m.round === 3);
  if (r3.length < 8) return true;
  if (!r3.some((m) => m.slot === 8)) return true;
  if (matches.some((m) => m.round === 6)) return true;
  return false;
}

/** Актуальная TS-сетка 16: 27 встреч, 7 колонок (5 туров). */
export function isFixedSwissTsMatchCount(
  matchCount: number,
  maxRound?: number,
): boolean {
  if (matchCount !== 27) return false;
  if (isFixedSwissTsLegacy27SixRound(matchCount, maxRound)) return false;
  if (maxRound === undefined) return true;
  return maxRound >= 5;
}

/** Устаревшая TS-сетка: 29 встреч, 9 колонок (нижняя тур 3–4). */
export function isFixedSwissTsLegacy29MatchCount(matchCount: number): boolean {
  return matchCount === 29;
}

/** TS 16-8 с матчем за 3–4: 28 встреч, 7 колонок. */
export function isFixedSwissTsBronzeMatchCount(matchCount: number): boolean {
  return matchCount === 28;
}

/** TS 16-8 / 32-16 или legacy 29 — для UI линий и подписей колонок. */
export function isFixedSwiss168MatchCount(matchCount: number): boolean {
  return (
    matchCount === 27 ||
    matchCount === 28 ||
    matchCount === 29 ||
    matchCount === 55 ||
    matchCount === 56 ||
    matchCount === 59 ||
    matchCount === 60 ||
    matchCount === 63 ||
    matchCount === 64 ||
    matchCount === 111 ||
    matchCount === 112 ||
    matchCount === 114 ||
    matchCount === 115 ||
    matchCount === 116 ||
    matchCount === 119 ||
    matchCount === 120
  );
}

/** Старая платформенная сетка 27 встреч (5 туров, без TS-нумерации). */
export function isFixedSwiss168LegacyMatchCount(
  matchCount: number,
  maxRound?: number,
): boolean {
  if (matchCount !== 27) return false;
  if (maxRound === undefined) return false;
  return maxRound <= 5;
}

export function inferFixedSwissGridSize(matchCount: number): number {
  if (matchCount === 29 || matchCount === 27 || matchCount === 28) return 16;
  if (matchCount === 59 || matchCount === 60 || matchCount === 55 || matchCount === 56 || matchCount === 63 || matchCount === 64) return 32;
  if (
    matchCount === 111 ||
    matchCount === 112 ||
    matchCount === 114 ||
    matchCount === 115 ||
    matchCount === 116 ||
    matchCount === 119 ||
    matchCount === 120
  ) {
    return 64;
  }
  for (let size = 4; size <= 64; size *= 2) {
    const rounds = Math.log2(size) + 1;
    if ((size / 2) * rounds === matchCount) return size;
  }
  throw new Error("Не удалось определить размер фиксированной сетки");
}

/** Порядок встреч TS 27 (актуальная сетка 16, 5 туров). */
export function fixedSwissTsMatchNo(round: number, slot: number): number {
  if (round === 1) return slot;
  if (round === 2 && slot <= 4) return 12 + slot;
  if (round === 2) return slot + 4;
  if (round === 3) return 16 + slot;
  if (round === 4) return 24 + slot;
  if (round === 5) return 26 + slot;
  throw new Error(`Некорректный слот TS 16-8: тур ${round}, слот ${slot}`);
}

/** Нумерация TS 28 (финал #27, матч за 3–4 — #28). */
export function fixedSwissTsBronzeMatchNo(round: number, slot: number): number {
  if (round === 5 && slot === 2) return 28;
  return fixedSwissTsMatchNo(round, slot);
}

/** Нумерация для старых сеток 27 встреч / 6 туров (2×1/4 + место 5–6). */
export function fixedSwissTsLegacy27SixRoundMatchNo(
  round: number,
  slot: number,
): number {
  if (round === 1) return slot;
  if (round === 2 && slot <= 4) return 12 + slot;
  if (round === 2) return slot + 4;
  if (round === 3) return 16 + slot;
  if (round === 4) return 22 + slot;
  if (round === 5) return 24 + slot;
  if (round === 6) return 27;
  throw new Error(`Некорректный слот TS legacy27×6: тур ${round}, слот ${slot}`);
}

/** Порядок встреч TS 29 (устаревшая, с нижней тур 3–4). */
export function fixedSwissTsLegacy29MatchNo(round: number, slot: number): number {
  if (round === 1) return slot;
  if (round === 2 && slot <= 4) return 12 + slot;
  if (round === 2) return slot + 4;
  if (round === 3) return 16 + slot;
  if (round === 4 && slot <= 2) return 22 + slot;
  if (round === 4) return 22 + slot;
  if (round === 5) return 26 + slot;
  if (round === 6) return 28 + slot;
  throw new Error(`Некорректный слот TS legacy29: тур ${round}, слот ${slot}`);
}

/** Глобальный номер встречи для legacy 27 встреч. */
export function fixedSwiss168MatchNo(round: number, slot: number): number {
  if (round === 1) return slot;
  if (round === 2 && slot <= 4) return 8 + slot;
  if (round === 2) return 12 + slot - 4;
  if (round === 3 && slot <= 4) return 16 + slot;
  if (round === 3) return 20 + slot - 4;
  if (round === 4) return 24 + slot;
  if (round === 5) return 26 + slot;
  throw new Error(`Некорректный слот legacy 16-8: тур ${round}, слот ${slot}`);
}

export function fixedSwissMatchNo(
  round: number,
  slot: number,
  matchCount: number,
  maxRound?: number,
): number {
  if (isFixedSwissTsLegacy29MatchCount(matchCount)) {
    return fixedSwissTsLegacy29MatchNo(round, slot);
  }
  if (isFixedSwissTsLegacy27SixRound(matchCount, maxRound)) {
    return fixedSwissTsLegacy27SixRoundMatchNo(round, slot);
  }
  if (
    isFixedSwiss168LegacyMatchCount(matchCount, maxRound) &&
    !isFixedSwissTsMatchCount(matchCount, maxRound)
  ) {
    return fixedSwiss168MatchNo(round, slot);
  }
  if (isFixedSwissTs64BronzeMatchCount(matchCount)) {
    return fixedSwissTs64MatchNo(round, slot, true);
  }
  if (isFixedSwissTs64MatchCount(matchCount)) {
    return fixedSwissTs64MatchNo(round, slot, false);
  }
  if (isFixedSwissTs32BronzeMatchCount(matchCount)) {
    return fixedSwissTs32MatchNo(round, slot, true);
  }
  if (isFixedSwissTs32MatchCount(matchCount)) {
    return fixedSwissTs32MatchNo(round, slot, false);
  }
  if (isOutdatedFixedSwiss32Bracket(matchCount)) {
    return fixedSwissTsMatchNoForHalf2(round, slot, 16);
  }
  if (isFixedSwissTsBronzeMatchCount(matchCount)) {
    return fixedSwissTsBronzeMatchNoForHalf2(round, slot, 8);
  }
  if (isFixedSwissTsMatchCount(matchCount, maxRound) || matchCount === 27) {
    return fixedSwissTsMatchNoForHalf2(round, slot, 8);
  }
  throw new Error(`Нет нумерации TS для ${matchCount} встреч`);
}

/** Итоговое место участника по номеру встречи (#13–#27 и варианты legacy). */
export function fixedSwissProtocolPlace(
  matchNo: number,
  role: "winner" | "loser",
  matchCount: number,
  maxRound?: number,
): number | null {
  if (role === "winner") {
    if (isFixedSwissTsLegacy29MatchCount(matchCount) && matchNo === 29) return 1;
    if (isFixedSwissTsLegacy27SixRound(matchCount, maxRound) && matchNo === 27) {
      return 1;
    }
    if (isFixedSwissTs64BronzeMatchCount(matchCount) && matchNo === 120) return 3;
    if (isFixedSwissTs64MatchCount(matchCount) && matchNo === 119) return 1;
    if (isFixedSwissTs32BronzeMatchCount(matchCount) && matchNo === 60) return 3;
    if (isFixedSwissTs32MatchCount(matchCount) && matchNo === 59) return 1;
    if (isFixedSwissTsBronzeMatchCount(matchCount) && matchNo === 28) return 3;
    if (matchNo === 27) return 1;
    return null;
  }

  if (isFixedSwissTs64BronzeMatchCount(matchCount) || isFixedSwissTs64MatchCount(matchCount)) {
    return fixedSwissProtocolPlace64(
      matchNo,
      role,
      isFixedSwissTs64BronzeMatchCount(matchCount),
    );
  }

  if (isFixedSwissTs32BronzeMatchCount(matchCount) || isFixedSwissTs32MatchCount(matchCount)) {
    return fixedSwissProtocolPlace32(
      matchNo,
      role,
      isFixedSwissTs32BronzeMatchCount(matchCount),
    );
  }

  if (isOutdatedFixedSwiss32Bracket(matchCount)) {
    return fixedSwissProtocolPlaceForHalf2(
      matchNo,
      role,
      16,
      matchCount === 56 || matchCount === 64,
    );
  }

  if (isFixedSwissTsBronzeMatchCount(matchCount)) {
    return fixedSwissProtocolPlaceForHalf2(matchNo, role, 8, true);
  }

  if (isFixedSwissTsLegacy29MatchCount(matchCount)) {
    if (matchNo === 29) return 2;
    if (matchNo === 27) return 3;
    if (matchNo === 28) return 4;
    if (matchNo === 25) return 5;
    if (matchNo === 26) return 6;
    if (matchNo === 23) return 7;
    if (matchNo === 24) return 8;
    if (matchNo >= 17 && matchNo <= 20) return 9 + (matchNo - 17);
    if (matchNo >= 13 && matchNo <= 16) return 13 + (matchNo - 13);
    return null;
  }

  if (isFixedSwissTsLegacy27SixRound(matchCount, maxRound)) {
    if (matchNo === 27) return 2;
    if (matchNo === 25) return 3;
    if (matchNo === 26) return 4;
    if (matchNo === 23) return 5;
    if (matchNo === 24) return 6;
    if (matchNo >= 17 && matchNo <= 20) return 9 + (matchNo - 17);
    if (matchNo >= 13 && matchNo <= 16) return 13 + (matchNo - 13);
    return null;
  }

  return fixedSwissProtocolPlaceForHalf2(matchNo, role, 8, false);
}

function fixedSwissProtocolPlace64(
  matchNo: number,
  role: "winner" | "loser",
  withBronze: boolean,
): number | null {
  if (role === "winner") {
    if (withBronze && matchNo === 120) return 3;
    if (matchNo === 119) return 1;
    return null;
  }

  if (withBronze && matchNo === 119) return 2;
  if (withBronze && matchNo === 120) return 4;
  if (!withBronze && matchNo === 119) return 2;
  if (!withBronze && matchNo === 117) return 3;
  if (!withBronze && matchNo === 118) return 4;

  if (matchNo >= 105 && matchNo <= 108) return matchNo - 100;
  if (matchNo >= 97 && matchNo <= 104) return matchNo - 88;
  if (matchNo >= 89 && matchNo <= 96) return matchNo - 72;
  if (matchNo >= 65 && matchNo <= 80) return matchNo - 32;
  if (matchNo >= 33 && matchNo <= 48) return matchNo + 16;
  return null;
}

function fixedSwissProtocolPlace32(
  matchNo: number,
  role: "winner" | "loser",
  withBronze: boolean,
): number | null {
  if (role === "winner") {
    if (withBronze && matchNo === 60) return 3;
    if (matchNo === 59) return 1;
    return null;
  }

  if (withBronze && matchNo === 59) return 2;
  if (withBronze && matchNo === 60) return 4;
  if (!withBronze && matchNo === 59) return 2;
  if (!withBronze && matchNo === 57) return 3;
  if (!withBronze && matchNo === 58) return 4;

  if (matchNo >= 53 && matchNo <= 56) return matchNo - 48;
  if (matchNo >= 49 && matchNo <= 52) return matchNo - 40;
  if (matchNo >= 45 && matchNo <= 48) return matchNo - 32;
  if (matchNo >= 33 && matchNo <= 40) return matchNo - 16;
  if (matchNo >= 17 && matchNo <= 24) return matchNo + 8;
  return null;
}

function fixedSwissProtocolPlaceForHalf2(
  matchNo: number,
  role: "winner" | "loser",
  half2: number,
  withBronze: boolean,
): number | null {
  const half1 = half2 / 2;
  const finalNo = tsTotalMatchCount(half2, false);
  const bronzeNo = withBronze ? finalNo + 1 : null;

  if (role === "winner") {
    if (withBronze && bronzeNo !== null && matchNo === bronzeNo) return 3;
    if (matchNo === finalNo) return 1;
    return null;
  }

  if (withBronze && matchNo === finalNo) return 2;
  if (withBronze && bronzeNo !== null && matchNo === bronzeNo) return 4;
  if (withBronze && (matchNo === finalNo - 2 || matchNo === finalNo - 1)) {
    return null;
  }

  if (!withBronze && matchNo === finalNo) return 2;
  if (!withBronze && matchNo === finalNo - 2) return 3;
  if (!withBronze && matchNo === finalNo - 1) return 4;

  const olympicStart = 2 * half2 + half1 + 1;
  if (matchNo >= olympicStart && matchNo <= olympicStart + half1 - 1) {
    return half1 + 1 + (matchNo - olympicStart);
  }

  const postStart = 3 * half2 + 1;
  if (matchNo >= postStart && matchNo <= postStart + half1 / 2 - 1) {
    return half1 / 2 + 1 + (matchNo - postStart);
  }

  const crossStart = 2 * half2 + 1;
  if (matchNo >= crossStart && matchNo <= crossStart + half1 - 1) {
    return half2 + 1 + (matchNo - crossStart);
  }

  const lowerStart = half2 >= 16 ? half2 + 1 : half2 + half1 + 1;
  if (matchNo >= lowerStart && matchNo <= lowerStart + half1 - 1) {
    return half2 >= 16
      ? half2 + half1 + 1 + (matchNo - lowerStart)
      : lowerStart + (matchNo - lowerStart);
  }

  return null;
}

export function getFixedSwissLinksForGrid(
  gridSize: number,
  matchCount?: number,
  maxRound?: number,
): FixedSwissLink[] {
  if (gridSize === 16 && matchCount === 40) {
    return buildFixedSwissClassicTemplate(16).links;
  }
  if (gridSize === 16 && matchCount === 29) {
    return buildFixedSwissTsLegacy29Template().links;
  }
  if (gridSize === 16 && isFixedSwissTsLegacy27SixRound(matchCount ?? 0, maxRound)) {
    return buildFixedSwissTsLegacy27SixRoundTemplate().links;
  }
  if (gridSize === 16 && matchCount === 28) {
    return buildFixedSwissTsBronzeTemplate().links;
  }
  if (gridSize === 16 && matchCount === 28) {
    return buildFixedSwissTsTemplateForGridSize(16, true).links;
  }
  if (gridSize === 16) {
    return buildFixedSwissTsTemplateForGridSize(16, false).links;
  }
  if (gridSize === 32 && matchCount === 60) {
    return buildFixedSwissTsTemplateForGridSize(32, true).links;
  }
  if (gridSize === 32 && matchCount === 59) {
    return buildFixedSwissTsTemplateForGridSize(32, false).links;
  }
  if (gridSize === 32 && isOutdatedFixedSwiss32Bracket(matchCount ?? 0)) {
    return buildFixedSwissTs32OutdatedTemplate(matchCount === 56 || matchCount === 64).links;
  }
  if (gridSize === 64) {
    const withBronze = matchCount === 116 || matchCount === 112;
    return buildFixedSwissTsTemplateForGridSize(64, withBronze).links;
  }
  return buildFixedSwissTemplate(gridSize).links;
}

export function getFixedSwissLinksForMatchCount(
  matchCount: number,
  maxRound?: number,
): FixedSwissLink[] {
  const gridSize = inferFixedSwissGridSize(matchCount);
  return getFixedSwissLinksForGrid(gridSize, matchCount, maxRound);
}
