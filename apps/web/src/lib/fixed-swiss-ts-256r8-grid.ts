/**
 * 256→128 R16 (496 встреч) — каноническая нумерация по колонкам.
 *
 * Верх: 1–128, 129–192, 321–352, 417–432, 465–480, 481–488, 489–492, 493–494, 495, 496
 * Низ:  193–256, 257–320, 353–384, 385–416, 433–448, 449–464
 */
import type { BracketMatchInput } from "@/lib/pair-tournament";
import type { FixedSwissLink, FixedSwissTemplate } from "@/lib/fixed-swiss-grid-types";

const HALF1 = 64;
const HALF2 = 128;

/** Канонические диапазоны # встреч. */
export const TS256_NO_R1_END = 128;
export const TS256_NO_UT1_END = 192;
export const TS256_NO_LT1_END = 256;
export const TS256_NO_LT2_END = 320;
export const TS256_NO_UT2_END = 352;
export const TS256_NO_LT3_END = 384;
export const TS256_NO_LT4_END = 416;
export const TS256_NO_UT3_END = 432;
export const TS256_NO_LT5_END = 448;
export const TS256_NO_LT6_END = 464;
export const TS256_NO_R16_END = 480;
export const TS256_NO_R8_END = 488;
export const TS256_NO_R4_OLY_END = 492;
export const TS256_NO_SEMI_END = 494;
export const TS256_NO_FINAL = 495;
export const TS256_NO_BRONZE = 496;

const R3_LOWER = HALF1;
const R3_UPPER = HALF1 / 2;
const R3_SLOTS = R3_LOWER + R3_UPPER;
const R3_UPPER_SLOT0 = R3_LOWER + 1;

const R4_LOWER_T3 = HALF1 / 2;
const R4_LOWER_T4 = HALF1 / 2;
const R4_UT3 = HALF1 / 4;
const R4_LT5 = HALF1 / 4;
const R4_UPPER_SLOT0 = R4_LOWER_T3 + R4_LOWER_T4 + 1;
const R4_LT5_SLOT0 = R4_UPPER_SLOT0 + R4_UT3;
const R4_LOWER_T4_SLOT0 = R4_LOWER_T3 + 1;
const R4_SLOTS = R4_LOWER_T3 + R4_LOWER_T4 + R4_UT3 + R4_LT5;

const R5_LT6 = HALF1 / 4;
const R5_R16 = HALF1 / 4;
const TS256_LT6_R16_PAIR_SUM = TS256_NO_LT5_END + 1 + TS256_NO_R16_END;
const R5_R16_SLOT0 = R5_LT6 + 1;
const R5_SLOTS = R5_LT6 + R5_R16;

const R6_R8 = HALF1 / 8;
const R7_R4 = HALF1 / 16;
const R8_SEMI = HALF1 / 32;
const R9_FINAL = 1;
const R10_BRONZE = 1;

export const FIXED_SWISS_TS256R16_MATCH_COUNT = TS256_NO_BRONZE;
export const FIXED_SWISS_TS256R16_R5_SNAPSHOT_MATCH_COUNT = TS256_NO_LT6_END;
export const FIXED_SWISS_TS256R16_UT4_R5_SNAPSHOT_MATCH_COUNT = TS256_NO_LT5_END;
export const FIXED_SWISS_TS256R16_R6_PAIR_SNAPSHOT_MATCH_COUNT = 488;
export const FIXED_SWISS_TS256R16_OLYMPIC_DRAFT479_MATCH_COUNT = 479;
export const FIXED_SWISS_TS256R16_OLYMPIC_SNAPSHOT_MATCH_COUNT = TS256_NO_BRONZE;

const FIXED_SWISS_TS256R16_KNOWN_MATCH_COUNTS = new Set([
  FIXED_SWISS_TS256R16_MATCH_COUNT,
  FIXED_SWISS_TS256R16_R6_PAIR_SNAPSHOT_MATCH_COUNT,
  FIXED_SWISS_TS256R16_R5_SNAPSHOT_MATCH_COUNT,
  FIXED_SWISS_TS256R16_UT4_R5_SNAPSHOT_MATCH_COUNT,
  FIXED_SWISS_TS256R16_OLYMPIC_DRAFT479_MATCH_COUNT,
  FIXED_SWISS_TS256R16_OLYMPIC_SNAPSHOT_MATCH_COUNT,
  464,
  480,
  488,
]);

function slotParityTeam(slot: number): 1 | 2 {
  return slot % 2 === 1 ? 1 : 2;
}

function buildTs256R16Matches(): BracketMatchInput[] {
  const matches: BracketMatchInput[] = [];
  for (let slot = 1; slot <= HALF2; slot++) {
    matches.push({ round: 1, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= HALF2; slot++) {
    matches.push({ round: 2, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= R3_SLOTS; slot++) {
    matches.push({ round: 3, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= R4_SLOTS; slot++) {
    matches.push({ round: 4, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= R5_SLOTS; slot++) {
    matches.push({ round: 5, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= R6_R8; slot++) {
    matches.push({ round: 6, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= R7_R4; slot++) {
    matches.push({ round: 7, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= R8_SEMI; slot++) {
    matches.push({ round: 8, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= R9_FINAL; slot++) {
    matches.push({ round: 9, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= R10_BRONZE; slot++) {
    matches.push({ round: 10, slot, team1Id: null, team2Id: null });
  }
  return matches;
}

function appendTs256R16Tour1Links(links: FixedSwissLink[]): void {
  for (let k = 0; k < HALF1 / 2; k++) {
    const slotA = 2 * k + 1;
    const slotB = 2 * k + 2;
    links.push({
      fromRound: 2,
      fromSlot: slotA,
      kind: "win",
      toRound: 3,
      toSlot: R3_UPPER_SLOT0 + k,
      toTeam: 1,
    });
    links.push({
      fromRound: 2,
      fromSlot: slotB,
      kind: "win",
      toRound: 3,
      toSlot: R3_UPPER_SLOT0 + k,
      toTeam: 2,
    });
    links.push({
      fromRound: 2,
      fromSlot: slotA,
      kind: "loss",
      toRound: 3,
      toSlot: fixedSwissTs256UpperTour1LossMatchNo(k, false) - TS256_NO_LT1_END,
      toTeam: 1,
    });
    links.push({
      fromRound: 2,
      fromSlot: slotB,
      kind: "loss",
      toRound: 3,
      toSlot: fixedSwissTs256UpperTour1LossMatchNo(k, true) - TS256_NO_LT1_END,
      toTeam: 2,
    });
  }

  for (let i = 0; i < HALF1; i++) {
    links.push({
      fromRound: 2,
      fromSlot: HALF1 + 1 + i,
      kind: "win",
      toRound: 3,
      toSlot: i + 1,
      toTeam: slotParityTeam(i + 1),
    });
  }
}

function appendTs256R16Tour2Links(links: FixedSwissLink[]): void {
  for (let k = 0; k < R4_UT3; k++) {
    const slotA = R3_UPPER_SLOT0 + 2 * k;
    const slotB = slotA + 1;
    const ut3Slot = R4_UPPER_SLOT0 + k;
    links.push({
      fromRound: 3,
      fromSlot: slotA,
      kind: "win",
      toRound: 4,
      toSlot: ut3Slot,
      toTeam: 1,
    });
    links.push({
      fromRound: 3,
      fromSlot: slotB,
      kind: "win",
      toRound: 4,
      toSlot: ut3Slot,
      toTeam: 2,
    });
  }

  for (let k = 0; k < R3_UPPER; k++) {
    const fromSlot = R3_UPPER_SLOT0 + k;
    const lossNo = fixedSwissTs256UpperTour2LossMatchNo(fromSlot);
    links.push({
      fromRound: 3,
      fromSlot,
      kind: "loss",
      toRound: 4,
      toSlot: fixedSwissTs256R4Lt4SlotFromLossNo(lossNo),
      toTeam: 1,
    });
  }

  for (let s = 1; s <= R3_LOWER; s++) {
    links.push({
      fromRound: 3,
      fromSlot: s,
      kind: "win",
      toRound: 4,
      toSlot: Math.floor((s - 1) / 2) + 1,
      toTeam: slotParityTeam(s),
    });
    const lt2No = fixedSwissTs256R16MatchNo(3, s);
    const lossNo = fixedSwissTs256LowerTour2LossMatchNo(lt2No);
    if (lossNo > TS256_NO_LT1_END && lossNo <= TS256_NO_LT2_END) {
      links.push({
        fromRound: 3,
        fromSlot: s,
        kind: "loss",
        toRound: 3,
        toSlot: lossNo - TS256_NO_LT1_END,
        toTeam: 1,
      });
    }
  }
}

function appendTs256R16Tour3Links(links: FixedSwissLink[]): void {
  for (let s = 1; s <= R4_LOWER_T3; s++) {
    links.push({
      fromRound: 4,
      fromSlot: s,
      kind: "win",
      toRound: 4,
      toSlot: R4_LOWER_T3 + s,
      toTeam: 1,
    });
    const lt3No = fixedSwissTs256R16MatchNo(4, s);
    const lossNo = fixedSwissTs256LowerTour3LossMatchNo(lt3No);
    if (lossNo >= TS256_NO_LT4_END + 1 && lossNo <= TS256_NO_LT4_END + R4_LOWER_T4) {
      links.push({
        fromRound: 4,
        fromSlot: s,
        kind: "loss",
        toRound: 4,
        toSlot: fixedSwissTs256R4Lt4SlotFromLossNo(lossNo),
        toTeam: 1,
      });
    }
  }

  for (let s = R4_LOWER_T4_SLOT0; s <= R4_LOWER_T3 + R4_LOWER_T4; s++) {
    const win = fixedSwissTs256LowerTour4WinTarget(s);
    links.push({
      fromRound: 4,
      fromSlot: s,
      kind: "win",
      toRound: win.toRound,
      toSlot: win.toSlot,
      toTeam: win.toTeam,
    });
  }

  for (let k = 0; k < R4_UT3; k++) {
    const fromSlot = R4_UPPER_SLOT0 + k;
    const loss = fixedSwissTs256UpperTour3LossTarget(fromSlot);
    if (loss) {
      links.push({
        fromRound: 4,
        fromSlot,
        kind: "loss",
        toRound: loss.toRound,
        toSlot: loss.toSlot,
        toTeam: loss.toTeam,
      });
    }
    links.push({
      fromRound: 4,
      fromSlot,
      kind: "win",
      toRound: 5,
      toSlot: R5_R16_SLOT0 + k,
      toTeam: slotParityTeam(fromSlot),
    });
  }

  for (let k = 0; k < R4_LT5; k++) {
    const fromSlot = R4_LT5_SLOT0 + k;
    links.push({
      fromRound: 4,
      fromSlot,
      kind: "win",
      toRound: 5,
      toSlot: k + 1,
      toTeam: 1,
    });
  }
}

function appendTs256R16LowerTour6Links(links: FixedSwissLink[]): void {
  for (let lt6No = TS256_NO_LT5_END + 1; lt6No <= TS256_NO_LT6_END; lt6No++) {
    const win = fixedSwissTs256LowerTour6WinTarget(lt6No);
    if (!win) continue;
    links.push({
      fromRound: 5,
      fromSlot: lt6No - TS256_NO_LT5_END,
      kind: "win",
      toRound: win.toRound,
      toSlot: win.toSlot,
      toTeam: win.toTeam,
    });
  }
}

function appendTs256R16OlympicLinks(links: FixedSwissLink[]): void {
  for (let k = 0; k < R5_R16 / 2; k++) {
    const slotA = R5_R16_SLOT0 + 2 * k;
    const slotB = slotA + 1;
    links.push({
      fromRound: 5,
      fromSlot: slotA,
      kind: "win",
      toRound: 6,
      toSlot: k + 1,
      toTeam: 1,
    });
    links.push({
      fromRound: 5,
      fromSlot: slotB,
      kind: "win",
      toRound: 6,
      toSlot: k + 1,
      toTeam: 2,
    });
  }

  for (let k = 0; k < R6_R8 / 2; k++) {
    const slotA = 2 * k + 1;
    const slotB = 2 * k + 2;
    links.push({
      fromRound: 6,
      fromSlot: slotA,
      kind: "win",
      toRound: 7,
      toSlot: k + 1,
      toTeam: 1,
    });
    links.push({
      fromRound: 6,
      fromSlot: slotB,
      kind: "win",
      toRound: 7,
      toSlot: k + 1,
      toTeam: 2,
    });
  }

  for (let k = 0; k < R7_R4 / 2; k++) {
    const slotA = 2 * k + 1;
    const slotB = 2 * k + 2;
    links.push({
      fromRound: 7,
      fromSlot: slotA,
      kind: "win",
      toRound: 8,
      toSlot: k + 1,
      toTeam: 1,
    });
    links.push({
      fromRound: 7,
      fromSlot: slotB,
      kind: "win",
      toRound: 8,
      toSlot: k + 1,
      toTeam: 2,
    });
  }

  links.push({
    fromRound: 8,
    fromSlot: 1,
    kind: "win",
    toRound: 9,
    toSlot: 1,
    toTeam: 1,
  });
  links.push({
    fromRound: 8,
    fromSlot: 2,
    kind: "win",
    toRound: 9,
    toSlot: 1,
    toTeam: 2,
  });
  links.push({
    fromRound: 8,
    fromSlot: 1,
    kind: "loss",
    toRound: 10,
    toSlot: 1,
    toTeam: 1,
  });
  links.push({
    fromRound: 8,
    fromSlot: 2,
    kind: "loss",
    toRound: 10,
    toSlot: 1,
    toTeam: 2,
  });
}

function buildTs256R16Links(): FixedSwissLink[] {
  const links: FixedSwissLink[] = [];
  for (let slot = 1; slot <= HALF2; slot++) {
    const toTeam = slotParityTeam(slot);
    const pair = Math.ceil(slot / 2);
    links.push({
      fromRound: 1,
      fromSlot: slot,
      kind: "win",
      toRound: 2,
      toSlot: pair,
      toTeam,
    });
    links.push({
      fromRound: 1,
      fromSlot: slot,
      kind: "loss",
      toRound: 2,
      toSlot: HALF1 + pair,
      toTeam,
    });
  }
  appendTs256R16Tour1Links(links);
  appendTs256R16Tour2Links(links);
  appendTs256R16Tour3Links(links);
  appendTs256R16LowerTour6Links(links);
  appendTs256R16OlympicLinks(links);
  return links;
}

export function buildFixedSwissTs256R16Template(): FixedSwissTemplate {
  return {
    gridSize: HALF2 * 2,
    rounds: 10,
    matchesPerRound: HALF2,
    matches: buildTs256R16Matches(),
    links: buildTs256R16Links(),
    variant: "ts256128r16",
  };
}

export function buildFixedSwissTs256R16BronzeTemplate(): FixedSwissTemplate {
  return buildFixedSwissTs256R16Template();
}

export const buildFixedSwissTs256R8ElimAtEighthTemplate = buildFixedSwissTs256R16Template;
export const buildFixedSwissTs256R8ElimAtEighthBronzeTemplate =
  buildFixedSwissTs256R16BronzeTemplate;

/** Канонический # по (round, slot). */
export function fixedSwissTs256R16MatchNo(
  round: number,
  slot: number,
  _withBronze = false,
): number {
  if (round === 1) return slot;
  if (round === 2) {
    return slot <= HALF1 ? TS256_NO_R1_END + slot : TS256_NO_UT1_END + slot - HALF1;
  }
  if (round === 3) {
    return slot <= R3_LOWER
      ? TS256_NO_LT1_END + slot
      : TS256_NO_LT2_END + slot - R3_UPPER_SLOT0 + 1;
  }
  if (round === 4) {
    if (slot <= R4_LOWER_T3) return TS256_NO_UT2_END + slot;
    if (slot <= R4_LOWER_T3 + R4_LOWER_T4) {
      return TS256_NO_LT3_END + slot - R4_LOWER_T3;
    }
    if (slot <= R4_UPPER_SLOT0 + R4_UT3 - 1) {
      return TS256_NO_LT4_END + slot - R4_UPPER_SLOT0 + 1;
    }
    return TS256_NO_UT3_END + slot - R4_LT5_SLOT0 + 1;
  }
  if (round === 5) {
    return slot <= R5_LT6
      ? TS256_NO_LT5_END + slot
      : TS256_NO_LT6_END + slot - R5_LT6;
  }
  if (round === 6) return TS256_NO_R16_END + slot;
  if (round === 7) return TS256_NO_R8_END + slot;
  if (round === 8) return TS256_NO_R4_OLY_END + slot;
  if (round === 9) return TS256_NO_SEMI_END + slot;
  if (round === 10) return TS256_NO_BRONZE;
  throw new Error(`256 R16: нет тура ${round}, слот ${slot}`);
}

export const fixedSwissTs256R8ElimMatchNo = fixedSwissTs256R16MatchNo;

function fixedSwissTs256R16TemplateCapRound(
  matchCount: number,
  maxRound?: number,
): number {
  if (matchCount === FIXED_SWISS_TS256R16_MATCH_COUNT) return maxRound ?? 10;
  if (matchCount === FIXED_SWISS_TS256R16_R5_SNAPSHOT_MATCH_COUNT) {
    return maxRound ?? 5;
  }
  return maxRound ?? 5;
}

/** LT2/LT3 зеркало: подпись «проигравший на #…», без автоподстановки (команды уже в слоте). */
export function isFixedSwissTs256R16IntraRoundMirrorLossEdge(
  link: { fromRound: number; toRound: number; kind: string },
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (link.kind !== "loss") return false;
  if (!isFixedSwissTs256R16Family(matchCount, maxRound)) return false;
  return (
    (link.fromRound === 3 && link.toRound === 3) ||
    (link.fromRound === 4 && link.toRound === 4)
  );
}

/** LT3 → merge-слот в том же R4: победитель в #385… (гибкая позиция). */
export function isFixedSwissTs256R16IntraRoundMergeWinEdge(
  link: {
    fromRound: number;
    fromSlot: number;
    toRound: number;
    toSlot: number;
    kind: string;
  },
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (link.kind !== "win") return false;
  if (!isFixedSwissTs256R16Family(matchCount, maxRound)) return false;
  if (link.fromRound !== 4 || link.toRound !== 4) return false;
  const r4LowerT3 = HALF1 / 2;
  return (
    link.fromSlot >= 1 &&
    link.fromSlot <= r4LowerT3 &&
    link.toSlot === r4LowerT3 + link.fromSlot
  );
}

export function isFixedSwissTs256R16LowerTour5FeedWinEdge(
  link: {
    fromRound: number;
    fromSlot: number;
    toRound: number;
    kind: string;
  },
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (link.kind !== "win") return false;
  if (!isFixedSwissTs256R16Family(matchCount, maxRound)) return false;
  return (
    link.fromRound === 4 &&
    link.toRound === 5 &&
    link.fromSlot >= R4_LT5_SLOT0
  );
}

export function isFixedSwissTs256R16ForwardLink(
  link: { toRound: number },
  matchCount: number,
  maxRound?: number,
): boolean {
  if (!FIXED_SWISS_TS256R16_KNOWN_MATCH_COUNTS.has(matchCount)) return false;
  return link.toRound > fixedSwissTs256R16TemplateCapRound(matchCount, maxRound);
}

export function isFixedSwissTs256R16FromMatches(
  matches: Array<{ round: number }>,
): boolean {
  return FIXED_SWISS_TS256R16_KNOWN_MATCH_COUNTS.has(matches.length);
}

export function isFixedSwissTs256R16MatchCount(
  matchCount: number,
  maxRound?: number,
): boolean {
  return (
    FIXED_SWISS_TS256R16_KNOWN_MATCH_COUNTS.has(matchCount) &&
    maxRound !== undefined &&
    maxRound >= 2
  );
}

export function isFixedSwissTs256R16BronzeMatchCount(
  matchCount: number,
  maxRound?: number,
): boolean {
  return isFixedSwissTs256R16MatchCount(matchCount, maxRound);
}

export function isFixedSwissTs256R16Family(
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (matchCount == null) return false;
  return isFixedSwissTs256R16MatchCount(matchCount, maxRound);
}

export function fixedSwissTs256LowerTour5Slot(fromLt4Slot: number): number {
  const k = fromLt4Slot - R4_LOWER_T4_SLOT0;
  return R4_LT5_SLOT0 + Math.floor(k / 2);
}

export function fixedSwissTs256LowerTour4WinTarget(
  fromSlot: number,
): { toRound: 4; toSlot: number; toTeam: 1 | 2 } {
  return {
    toRound: 4,
    toSlot: fixedSwissTs256LowerTour5Slot(fromSlot),
    toTeam: fromSlot % 2 === 1 ? 1 : 2,
  };
}

export function fixedSwissTs256LowerTour4WinMatchNo(fromSlot: number): number {
  const win = fixedSwissTs256LowerTour4WinTarget(fromSlot);
  return fixedSwissTs256R16MatchNo(win.toRound, win.toSlot);
}

export function fixedSwissTs256UpperTour3LossTarget(
  fromSlot: number,
): { toRound: 5; toSlot: number; toTeam: 1 | 2 } | null {
  if (fromSlot < R4_UPPER_SLOT0 || fromSlot >= R4_UPPER_SLOT0 + R4_UT3) {
    return null;
  }
  const k = fromSlot - R4_UPPER_SLOT0;
  const lossNo = fixedSwissTs256UpperTour3LossMatchNo(k);
  return {
    toRound: 5,
    toSlot: fixedSwissTs256R5Lt6SlotFromLossNo(lossNo),
    toTeam: 1,
  };
}

export function fixedSwissTs256UpperTour2WinTarget(
  fromR3Slot: number,
): { toRound: 4; toSlot: number; toTeam: 1 | 2 } | null {
  if (fromR3Slot < R3_UPPER_SLOT0 || fromR3Slot > R3_UPPER_SLOT0 + R3_UPPER - 1) {
    return null;
  }
  const pairIndex = Math.floor((fromR3Slot - R3_UPPER_SLOT0) / 2);
  return {
    toRound: 4,
    toSlot: R4_UPPER_SLOT0 + pairIndex,
    toTeam: slotParityTeam(fromR3Slot),
  };
}

export function isFixedSwissTs256R16UpperTour2ToUpperTour3ForkEdge(
  fromRound: number,
  toRound: number,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (
    fromSlot == null ||
    toSlot == null ||
    !isFixedSwissTs256R16Family(matchCount, maxRound)
  ) {
    return false;
  }
  if (fromRound !== 3 || toRound !== 4) return false;
  if (fromSlot < R3_UPPER_SLOT0) return false;
  for (let k = 0; k < R4_UT3; k++) {
    const slotA = R3_UPPER_SLOT0 + 2 * k;
    const slotB = slotA + 1;
    if (toSlot !== R4_UPPER_SLOT0 + k) continue;
    if (fromSlot === slotA || fromSlot === slotB) return true;
  }
  return false;
}

export function isFixedSwissTs256R16UpperTour2ForkEdge(
  fromRound: number,
  toRound: number,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (
    fromSlot == null ||
    toSlot == null ||
    !isFixedSwissTs256R16Family(matchCount, maxRound)
  ) {
    return false;
  }
  if (fromRound !== 2 || toRound !== 3) return false;
  if (fromSlot > HALF1) return false;
  for (let k = 0; k < HALF1 / 2; k++) {
    const slotA = 2 * k + 1;
    const slotB = 2 * k + 2;
    if (toSlot !== R3_UPPER_SLOT0 + k) continue;
    if (fromSlot === slotA || fromSlot === slotB) return true;
  }
  return false;
}

export function isFixedSwissTs256R16LowerTour2ToTour3ForkEdge(
  fromRound: number,
  toRound: number,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (
    fromSlot == null ||
    toSlot == null ||
    !isFixedSwissTs256R16Family(matchCount, maxRound)
  ) {
    return false;
  }
  if (fromRound !== 3 || toRound !== 4) return false;
  if (fromSlot > R3_LOWER) return false;
  const target = Math.floor((fromSlot - 1) / 2) + 1;
  if (toSlot !== target) return false;
  const slotA = 2 * (target - 1) + 1;
  const slotB = 2 * (target - 1) + 2;
  return fromSlot === slotA || fromSlot === slotB;
}

export function isFixedSwissTs256R16LowerTour4ToLowerTour5WinEdge(
  fromRound: number,
  toRound: number,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (
    fromSlot == null ||
    toSlot == null ||
    !isFixedSwissTs256R16Family(matchCount, maxRound)
  ) {
    return false;
  }
  if (fromRound !== 4 || toRound !== 4) return false;
  if (fromSlot < R4_LOWER_T4_SLOT0 || fromSlot > R4_LOWER_T3 + R4_LOWER_T4) {
    return false;
  }
  return toSlot === fixedSwissTs256LowerTour5Slot(fromSlot);
}

export function isFixedSwissTs256R16UpperTour3LossToLowerTour5Edge(
  fromRound: number,
  toRound: number,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (
    fromSlot == null ||
    toSlot == null ||
    !isFixedSwissTs256R16Family(matchCount, maxRound)
  ) {
    return false;
  }
  if (fromRound !== 4 || toRound !== 5) return false;
  const loss = fixedSwissTs256UpperTour3LossTarget(fromSlot);
  return loss != null && loss.toSlot === toSlot;
}

export function isFixedSwissTs256R16UpperTour3ToR16WinEdge(
  fromRound: number,
  toRound: number,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (
    fromSlot == null ||
    toSlot == null ||
    !isFixedSwissTs256R16Family(matchCount, maxRound)
  ) {
    return false;
  }
  if (fromRound !== 4 || toRound !== 5) return false;
  if (fromSlot < R4_UPPER_SLOT0 || fromSlot >= R4_UPPER_SLOT0 + R4_UT3) {
    return false;
  }
  return toSlot === R5_R16_SLOT0 + fromSlot - R4_UPPER_SLOT0;
}

export const isFixedSwissTs256R16UpperTour3ToUpperTour4WinEdge =
  isFixedSwissTs256R16UpperTour3ToR16WinEdge;
export const isFixedSwissTs256R16UpperTour3ForkEdge =
  isFixedSwissTs256R16UpperTour3ToR16WinEdge;

export function isFixedSwissTs256R16LowerTour5ToLowerTour6TrackEdge(
  fromRound: number,
  toRound: number,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (
    fromSlot == null ||
    toSlot == null ||
    !isFixedSwissTs256R16Family(matchCount, maxRound)
  ) {
    return false;
  }
  if (fromRound !== 4 || toRound !== 5) return false;
  if (fromSlot < R4_LT5_SLOT0 || fromSlot > R4_SLOTS) return false;
  return toSlot === fromSlot - R4_LT5_SLOT0 + 1;
}

export const isFixedSwissTs256R16LowerTour5ToLowerTour6ForkEdge =
  isFixedSwissTs256R16LowerTour5ToLowerTour6TrackEdge;

export function isFixedSwissTs256R16UpperTour4ForkEdge(
  fromRound: number,
  toRound: number,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (
    fromSlot == null ||
    toSlot == null ||
    !isFixedSwissTs256R16Family(matchCount, maxRound)
  ) {
    return false;
  }
  if (fromRound !== 5 || toRound !== 6) return false;
  for (let k = 0; k < R5_R16 / 2; k++) {
    const slotA = R5_R16_SLOT0 + 2 * k;
    const slotB = slotA + 1;
    if (toSlot !== k + 1) continue;
    if (fromSlot === slotA || fromSlot === slotB) return true;
  }
  return false;
}

/** Олимпийская вилка 1/8→1/4, 1/4→полуфинал, полуфинал→финал (256). */
export function isFixedSwissTs256R16OlympicForkEdge(
  fromRound: number,
  toRound: number,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (
    fromSlot == null ||
    toSlot == null ||
    !isFixedSwissTs256R16Family(matchCount, maxRound)
  ) {
    return false;
  }
  const configs: Array<{ fr: number; tr: number; pairCount: number }> = [
    { fr: 6, tr: 7, pairCount: R6_R8 / 2 },
    { fr: 7, tr: 8, pairCount: R7_R4 / 2 },
    { fr: 8, tr: 9, pairCount: R8_SEMI / 2 },
  ];
  const cfg = configs.find((c) => c.fr === fromRound && c.tr === toRound);
  if (!cfg) return false;
  for (let k = 0; k < cfg.pairCount; k++) {
    const slotA = 2 * k + 1;
    const slotB = slotA + 1;
    if (toSlot !== k + 1) continue;
    if (fromSlot === slotA || fromSlot === slotB) return true;
  }
  return false;
}

export const isFixedSwissTs256R8ElimAtEighthFromMatches = isFixedSwissTs256R16FromMatches;
export const isFixedSwissTs256R8ElimAtEighthMatchCount = isFixedSwissTs256R16MatchCount;
export const isFixedSwissTs256R8ElimAtEighthBronzeMatchCount =
  isFixedSwissTs256R16BronzeMatchCount;
export const isFixedSwissTs256R8ElimAtEighthFamily = isFixedSwissTs256R16Family;

export function fixedSwissTs256R16StageByMatchNo(no: number): string | null {
  if (no >= 1 && no <= TS256_NO_R1_END) return "Первый тур";
  if (no <= TS256_NO_UT1_END) return "Верхняя, тур 1";
  if (no <= TS256_NO_LT1_END) return "Нижняя, тур 1";
  if (no <= TS256_NO_LT2_END) return "Нижняя, тур 2";
  if (no <= TS256_NO_UT2_END) return "Верхняя, тур 2";
  if (no <= TS256_NO_LT3_END) return "Нижняя, тур 3";
  if (no <= TS256_NO_LT4_END) return "Нижняя, тур 4";
  if (no <= TS256_NO_UT3_END) return "Верхняя, тур 3";
  if (no <= TS256_NO_LT5_END) return "Нижняя, тур 5";
  if (no <= TS256_NO_LT6_END) return "Нижняя, тур 6";
  if (no <= TS256_NO_R16_END) return "1/16 финала";
  if (no <= TS256_NO_R8_END) return "1/8 финала";
  if (no <= TS256_NO_R4_OLY_END) return "1/4 финала";
  if (no <= TS256_NO_SEMI_END) return "Полуфинал";
  if (no === TS256_NO_FINAL) return "Финал";
  if (no === TS256_NO_BRONZE) return "Матч за 3–4";
  return null;
}

export const fixedSwissTs256R8ElimStageByMatchNo = fixedSwissTs256R16StageByMatchNo;

export function fixedSwissTs256R16PlacementByMatchNo(
  no: number,
  withBronze: boolean,
): string | null {
  if (no >= 1 && no <= TS256_NO_R1_END) return null;
  if (no > TS256_NO_R1_END && no <= TS256_NO_UT1_END) return null;
  if (no > TS256_NO_UT1_END && no <= TS256_NO_LT1_END) return "место 193–256";
  if (no > TS256_NO_LT1_END && no <= TS256_NO_LT2_END) return "место 129–192";
  if (no > TS256_NO_LT2_END && no <= TS256_NO_UT2_END) return null;
  if (no > TS256_NO_UT2_END && no <= TS256_NO_LT3_END) return "место 97–128";
  if (no > TS256_NO_LT3_END && no <= TS256_NO_LT4_END) return "место 65–96";
  if (no > TS256_NO_LT4_END && no <= TS256_NO_UT3_END) return null;
  if (no > TS256_NO_UT3_END && no <= TS256_NO_LT5_END) return "место 49–64";
  if (no > TS256_NO_LT5_END && no <= TS256_NO_LT6_END) return "место 33–48";
  if (no <= TS256_NO_R16_END) return "место 17–32";
  if (no <= TS256_NO_R8_END) return "место 9–16";
  if (no <= TS256_NO_R4_OLY_END) return "место 5–8";
  if (withBronze && no >= TS256_NO_R4_OLY_END + 1 && no <= TS256_NO_SEMI_END) {
    return "полуфинал";
  }
  if (!withBronze && no <= TS256_NO_SEMI_END) return "3-е место";
  if (no === TS256_NO_FINAL) return "место 1–2";
  if (no === TS256_NO_BRONZE) return "матч за 3–4 место";
  return null;
}

export const fixedSwissTs256R8ElimPlacementByMatchNo = fixedSwissTs256R16PlacementByMatchNo;

export function fixedSwissTs256UpperTour1WinMatchNo(pairIndex: number): number {
  return TS256_NO_LT1_END + R3_UPPER_SLOT0 + pairIndex;
}

export function fixedSwissTs256UpperTour1LossMatchNo(
  pairIndex: number,
  secondInPair: boolean,
): number {
  const fromSlot = 2 * pairIndex + (secondInPair ? 2 : 1);
  const matchNo = TS256_NO_R1_END + fromSlot;
  const block = Math.floor((fromSlot - 1) / 16);
  return 401 + 32 * block - matchNo;
}

/** R3 upper UT2 (#321–352): зоны 16×4 — база 709 + 32·block16 + 8·sub4 − #. */
export function fixedSwissTs256UpperTour2LossMatchNo(fromR3UpperSlot: number): number {
  const i = fromR3UpperSlot - R3_UPPER_SLOT0;
  const matchNo = TS256_NO_LT2_END + i + 1;
  const block16 = Math.floor(i / 16);
  const sub4 = Math.floor((i % 16) / 4);
  return 709 + 32 * block16 + 8 * sub4 - matchNo;
}

/** R3 lower LT2 (#257–320): проигравший на #288… — сумма с # = 545. */
export function fixedSwissTs256LowerTour2LossMatchNo(lt2MatchNo: number): number {
  return 545 - lt2MatchNo;
}

/** R4 LT3 (#353–384): зеркало UT2 с базой 749. */
export function fixedSwissTs256LowerTour3LossMatchNo(lt3MatchNo: number): number {
  const i = lt3MatchNo - TS256_NO_UT2_END - 1;
  const block16 = Math.floor(i / 16);
  const sub4 = Math.floor((i % 16) / 4);
  return 749 + 32 * block16 + 8 * sub4 - lt3MatchNo;
}

/** Эталон: UT3 #417–432 → LT6 #449–464, группы по 4. */
export function fixedSwissTs256UpperTour3LossMatchNo(ut3Index: number): number {
  const g = Math.floor(ut3Index / 4);
  const p = ut3Index % 4;
  const base = TS256_NO_LT5_END + 1 + 4 * g;
  return p < 2 ? base + 2 + p : base + (p - 2);
}

function fixedSwissTs256R4Lt4SlotFromLossNo(lossNo: number): number {
  return lossNo - TS256_NO_LT3_END + R4_LOWER_T3;
}

function fixedSwissTs256R5Lt6SlotFromLossNo(lossNo: number): number {
  return lossNo - TS256_NO_LT5_END;
}

/** Нижняя тур 6 (#449–464) → 1/16 (#465–480), сумма пар # = 929. */
export function fixedSwissTs256LowerTour6WinTarget(
  lt6MatchNo: number,
): { toRound: 5; toSlot: number; toTeam: 1 | 2 } | null {
  if (lt6MatchNo < TS256_NO_LT5_END + 1 || lt6MatchNo > TS256_NO_LT6_END) {
    return null;
  }
  const r16MatchNo = TS256_LT6_R16_PAIR_SUM - lt6MatchNo;
  const r16Slot = r16MatchNo - TS256_NO_LT6_END + R5_LT6;
  const k = r16Slot - R5_R16_SLOT0;
  const ut3FromSlot = R4_UPPER_SLOT0 + k;
  const ut3WinTeam = slotParityTeam(ut3FromSlot);
  return {
    toRound: 5,
    toSlot: r16Slot,
    toTeam: ut3WinTeam === 1 ? 2 : 1,
  };
}

export function isFixedSwissTs256R16LowerTour6ToR16WinEdge(
  fromRound: number,
  toRound: number,
  fromSlot?: number,
  toSlot?: number,
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (
    fromSlot == null ||
    toSlot == null ||
    !isFixedSwissTs256R16Family(matchCount, maxRound)
  ) {
    return false;
  }
  if (fromRound !== 5 || toRound !== 5) return false;
  if (fromSlot < 1 || fromSlot > R5_LT6) return false;
  const lt6No = TS256_NO_LT5_END + fromSlot;
  const target = fixedSwissTs256LowerTour6WinTarget(lt6No);
  return target != null && target.toSlot === toSlot;
}

/** 256→128 R16: LT6 → 1/16 — подпись в подвале (как 128R8). */
export function isFixedSwissTs256LowerTour6FooterWinEdge(
  link: {
    fromRound: number;
    fromSlot: number;
    toRound: number;
    toSlot: number;
    kind: "win" | "loss";
  },
  matchCount: number,
  maxRound?: number,
): boolean {
  if (link.kind !== "win") return false;
  return isFixedSwissTs256R16LowerTour6ToR16WinEdge(
    link.fromRound,
    link.toRound,
    link.fromSlot,
    link.toSlot,
    matchCount,
    maxRound,
  );
}

export function fixedSwissTs256LowerTour1WinMatchNo(fromMatchNo: number): number {
  return fromMatchNo + HALF1;
}

export function fixedSwissTs256UpperTour2WinMatchNo(pairIndex: number): number {
  return TS256_NO_LT4_END + 1 + pairIndex;
}

export function fixedSwissTs256LowerTour2WinMatchNo(r3LowerSlot: number): number {
  return TS256_NO_UT2_END + Math.floor((r3LowerSlot - 1) / 2) + 1;
}

export function fixedSwissTs256LowerTour3WinMatchNo(r4LowerT3Slot: number): number {
  return TS256_NO_LT3_END + r4LowerT3Slot;
}

export function fixedSwissTs256UpperTour3WinMatchNo(pairIndex: number): number {
  return TS256_NO_LT6_END + 1 + pairIndex;
}

export function fixedSwissTs256LowerTour5WinMatchNo(pairIndex: number): number {
  return TS256_NO_LT5_END + 1 + pairIndex;
}

export function fixedSwissTs256LowerTour6MatchNoFromSlot(lt6Slot: number): number {
  return fixedSwissTs256R16MatchNo(5, lt6Slot);
}

export const fixedSwissTs256LowerTour6MatchNo =
  fixedSwissTs256LowerTour6MatchNoFromSlot;

export function assertFixedSwissTs256R1Routing(links: FixedSwissLink[]): void {
  for (let slot = 1; slot <= HALF2; slot++) {
    const win = links.find(
      (l) => l.fromRound === 1 && l.fromSlot === slot && l.kind === "win",
    );
    const loss = links.find(
      (l) => l.fromRound === 1 && l.fromSlot === slot && l.kind === "loss",
    );
    if (!win || !loss) throw new Error(`256 R1: нет links для слота ${slot}`);
    const pair = Math.ceil(slot / 2);
    const winNo = fixedSwissTs256R16MatchNo(win.toRound, win.toSlot);
    const lossNo = fixedSwissTs256R16MatchNo(loss.toRound, loss.toSlot);
    if (winNo !== TS256_NO_R1_END + pair || lossNo !== TS256_NO_UT1_END + pair) {
      throw new Error(`256 R1 slot ${slot}: win→#${winNo} loss→#${lossNo}`);
    }
  }
}

export function assertFixedSwissTs256Tour1Routing(links: FixedSwissLink[]): void {
  for (let k = 0; k < HALF1 / 2; k++) {
    for (const [slot, second] of [
      [2 * k + 1, false],
      [2 * k + 2, true],
    ] as const) {
      const win = links.find(
        (l) => l.fromRound === 2 && l.fromSlot === slot && l.kind === "win",
      );
      const loss = links.find(
        (l) => l.fromRound === 2 && l.fromSlot === slot && l.kind === "loss",
      );
      if (!win || !loss) throw new Error(`256 R2 upper slot ${slot}`);
      const winNo = fixedSwissTs256R16MatchNo(win.toRound, win.toSlot);
      const lossNo = fixedSwissTs256R16MatchNo(loss.toRound, loss.toSlot);
      if (winNo !== fixedSwissTs256UpperTour1WinMatchNo(k)) {
        throw new Error(`#${TS256_NO_R1_END + slot} win→#${winNo}`);
      }
      const expectLoss = fixedSwissTs256UpperTour1LossMatchNo(k, second);
      if (lossNo !== expectLoss) {
        throw new Error(`#${TS256_NO_R1_END + slot} loss→#${lossNo}`);
      }
    }
  }

  for (let i = 0; i < HALF1; i++) {
    const fromSlot = HALF1 + 1 + i;
    const win = links.find(
      (l) => l.fromRound === 2 && l.fromSlot === fromSlot && l.kind === "win",
    );
    if (!win) throw new Error(`256 R2 lower slot ${fromSlot}: нет win`);
    const winNo = fixedSwissTs256R16MatchNo(win.toRound, win.toSlot);
    if (winNo !== fixedSwissTs256LowerTour1WinMatchNo(TS256_NO_R1_END + fromSlot)) {
      throw new Error(`#${TS256_NO_R1_END + fromSlot} win→#${winNo}`);
    }
  }
}

export function assertFixedSwissTs256Tour2Routing(links: FixedSwissLink[]): void {
  for (let k = 0; k < R3_UPPER; k++) {
    const fromSlot = R3_UPPER_SLOT0 + k;
    const pairIndex = Math.floor(k / 2);
    const win = links.find(
      (l) => l.fromRound === 3 && l.fromSlot === fromSlot && l.kind === "win",
    );
    const loss = links.find(
      (l) => l.fromRound === 3 && l.fromSlot === fromSlot && l.kind === "loss",
    );
    if (!win || !loss) throw new Error(`256 R3 upper slot ${fromSlot}`);
    const expectWin = fixedSwissTs256UpperTour2WinTarget(fromSlot);
    if (!expectWin) throw new Error(`256 R3 upper slot ${fromSlot}: нет win target`);
    const winNo = fixedSwissTs256R16MatchNo(win.toRound, win.toSlot);
    if (winNo !== fixedSwissTs256UpperTour2WinMatchNo(pairIndex)) {
      throw new Error(`UT2 #${TS256_NO_LT2_END + k + 1} win→#${winNo}`);
    }
    const lossNo = fixedSwissTs256R16MatchNo(loss.toRound, loss.toSlot);
    if (lossNo !== fixedSwissTs256UpperTour2LossMatchNo(fromSlot)) {
      throw new Error(`UT2 loss→#${lossNo}`);
    }
  }

  for (let s = 1; s <= R3_LOWER; s++) {
    const win = links.find(
      (l) => l.fromRound === 3 && l.fromSlot === s && l.kind === "win",
    );
    if (!win) throw new Error(`256 R3 lower slot ${s}: нет win`);
    const winNo = fixedSwissTs256R16MatchNo(win.toRound, win.toSlot);
    if (winNo !== fixedSwissTs256LowerTour2WinMatchNo(s)) {
      throw new Error(`LT2 win→#${winNo}`);
    }
    const lt2No = fixedSwissTs256R16MatchNo(3, s);
    const lossNo = fixedSwissTs256LowerTour2LossMatchNo(lt2No);
    if (lossNo > TS256_NO_LT1_END && lossNo <= TS256_NO_LT2_END) {
      const loss = links.find(
        (l) => l.fromRound === 3 && l.fromSlot === s && l.kind === "loss",
      );
      if (!loss) throw new Error(`256 R3 LT2 slot ${s}: нет loss`);
      if (fixedSwissTs256R16MatchNo(loss.toRound, loss.toSlot) !== lossNo) {
        throw new Error(`LT2 #${lt2No} loss→#${fixedSwissTs256R16MatchNo(loss.toRound, loss.toSlot)}`);
      }
    }
  }
}

export function assertFixedSwissTs256Tour3Routing(links: FixedSwissLink[]): void {
  for (let s = 1; s <= R4_LOWER_T3; s++) {
    const win = links.find(
      (l) => l.fromRound === 4 && l.fromSlot === s && l.kind === "win",
    );
    if (!win) throw new Error(`256 R4 LT3 slot ${s}: нет win`);
    const winNo = fixedSwissTs256R16MatchNo(win.toRound, win.toSlot);
    if (winNo !== fixedSwissTs256LowerTour3WinMatchNo(s)) {
      throw new Error(`LT3 win→#${winNo}`);
    }
    const lt3No = fixedSwissTs256R16MatchNo(4, s);
    const expectLoss = fixedSwissTs256LowerTour3LossMatchNo(lt3No);
    if (expectLoss >= TS256_NO_LT4_END + 1 && expectLoss <= TS256_NO_LT4_END + R4_LOWER_T4) {
      const loss = links.find(
        (l) => l.fromRound === 4 && l.fromSlot === s && l.kind === "loss",
      );
      if (!loss) throw new Error(`256 R4 LT3 slot ${s}: нет loss`);
      if (fixedSwissTs256R16MatchNo(loss.toRound, loss.toSlot) !== expectLoss) {
        throw new Error(`LT3 #${lt3No} loss→#${fixedSwissTs256R16MatchNo(loss.toRound, loss.toSlot)}`);
      }
    }
  }

  for (let s = R4_LOWER_T4_SLOT0; s <= R4_LOWER_T3 + R4_LOWER_T4; s++) {
    const win = links.find(
      (l) => l.fromRound === 4 && l.fromSlot === s && l.kind === "win",
    );
    if (!win) throw new Error(`256 R4 LT4 slot ${s}: нет win`);
    const winNo = fixedSwissTs256R16MatchNo(win.toRound, win.toSlot);
    if (winNo !== fixedSwissTs256LowerTour4WinMatchNo(s)) {
      throw new Error(`LT4 #${TS256_NO_LT3_END + s - R4_LOWER_T3} win→#${winNo}`);
    }
  }

  for (let k = 0; k < R4_UT3; k++) {
    const slot = R4_UPPER_SLOT0 + k;
    const win = links.find(
      (l) => l.fromRound === 4 && l.fromSlot === slot && l.kind === "win",
    );
    const loss = links.find(
      (l) => l.fromRound === 4 && l.fromSlot === slot && l.kind === "loss",
    );
    if (!win || !loss) throw new Error(`256 R4 UT3 slot ${slot}`);
    if (fixedSwissTs256R16MatchNo(win.toRound, win.toSlot) !== fixedSwissTs256UpperTour3WinMatchNo(k)) {
      throw new Error(`UT3 win→#${fixedSwissTs256R16MatchNo(win.toRound, win.toSlot)}`);
    }
    const expectLoss = fixedSwissTs256UpperTour3LossTarget(slot);
    if (!expectLoss) throw new Error(`UT3 slot ${slot}: нет loss`);
    const lossNo = fixedSwissTs256R16MatchNo(loss.toRound, loss.toSlot);
    if (lossNo !== fixedSwissTs256UpperTour3LossMatchNo(k)) {
      throw new Error(`UT3 loss→#${lossNo}`);
    }
  }

  for (let k = 0; k < R4_LT5; k++) {
    const slot = R4_LT5_SLOT0 + k;
    const win = links.find(
      (l) => l.fromRound === 4 && l.fromSlot === slot && l.kind === "win",
    );
    if (!win) throw new Error(`256 R4 LT5 slot ${slot}: нет win`);
    if (fixedSwissTs256R16MatchNo(win.toRound, win.toSlot) !== fixedSwissTs256LowerTour5WinMatchNo(k)) {
      throw new Error(`LT5 win→#${fixedSwissTs256R16MatchNo(win.toRound, win.toSlot)}`);
    }
  }
}

export function assertFixedSwissTs256Tour4Routing(links: FixedSwissLink[]): void {
  for (let k = 0; k < R5_R16 / 2; k++) {
    for (const slot of [R5_R16_SLOT0 + 2 * k, R5_R16_SLOT0 + 2 * k + 1] as const) {
      const win = links.find(
        (l) => l.fromRound === 5 && l.fromSlot === slot && l.kind === "win",
      );
      if (!win) throw new Error(`256 R5 1/16 slot ${slot}: нет win`);
      if (fixedSwissTs256R16MatchNo(win.toRound, win.toSlot) !== TS256_NO_R16_END + k + 1) {
        throw new Error(`1/16 win→#${fixedSwissTs256R16MatchNo(win.toRound, win.toSlot)}`);
      }
    }
  }
}

export function assertFixedSwissTs256Tour5Routing(links: FixedSwissLink[]): void {
  for (let lt6No = TS256_NO_LT5_END + 1; lt6No <= TS256_NO_LT6_END; lt6No++) {
    const fromSlot = lt6No - TS256_NO_LT5_END;
    const win = links.find(
      (l) => l.fromRound === 5 && l.fromSlot === fromSlot && l.kind === "win",
    );
    if (!win) throw new Error(`256 R5 LT6 slot ${fromSlot}: нет win`);
    const expect = fixedSwissTs256LowerTour6WinTarget(lt6No);
    if (!expect) throw new Error(`256 LT6 #${lt6No}: нет target`);
    if (win.toRound !== expect.toRound || win.toSlot !== expect.toSlot || win.toTeam !== expect.toTeam) {
      throw new Error(`LT6 #${lt6No} win→R${win.toRound}S${win.toSlot}T${win.toTeam}`);
    }
    const winNo = fixedSwissTs256R16MatchNo(win.toRound, win.toSlot);
    if (winNo !== TS256_LT6_R16_PAIR_SUM - lt6No) {
      throw new Error(`LT6 #${lt6No} win→#${winNo}`);
    }
  }
}
