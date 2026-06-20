import type { BracketMatchInput } from "@/lib/pair-tournament";
import type { FixedSwissLink, FixedSwissTemplate } from "@/lib/fixed-swiss-grid-types";

function slotParityTeam(slot: number): 1 | 2 {
  return slot % 2 === 1 ? 1 : 2;
}

/** Куда крест (слоты 1…half1) подставляет team2 в верхнюю ветку (слоты half1+1…2×half1). */
export function buildCrossToQuarterMap(half1: number): Record<number, number> {
  if (half1 === 2) {
    return { 1: 4, 2: 3 };
  }
  if (half1 === 4) {
    return { 1: 6, 2: 5, 3: 8, 4: 7 };
  }
  const map: Record<number, number> = {};
  const inner = buildCrossToQuarterMap(half1 / 2);
  const h = half1 / 2;
  for (const [k, v] of Object.entries(inner)) {
    const ki = Number(k);
    map[ki] = v + half1;
    map[ki + h] = v + h;
  }
  return map;
}

export function tsHalf2FromGridSize(gridSize: number): number {
  return gridSize / 2;
}

export function tsMaxRound(half2: number): number {
  // 3 тура по half2 + log2(half2) − 1 (1/8|1/4 в R3, дальше 1/4|1/2|финал…)
  return Math.log2(half2) + 2;
}

export function tsPostR3SlotCount(half2: number, round: number): number {
  return half2 / Math.pow(2, round - 2);
}

export function tsTotalMatchCount(half2: number, withBronze: boolean): number {
  let total = 3 * half2;
  const maxRound = tsMaxRound(half2);
  for (let round = 4; round <= maxRound; round++) {
    total += tsPostR3SlotCount(half2, round);
  }
  if (withBronze) total += 1;
  return total;
}

/** 32→16 эталон (59/60 встреч): см. docs/BRACKET_REFERENCE_32_16.md */
function buildFixedSwissTs32Template(withBronze = false): FixedSwissTemplate {
  const gridSize = 32 as const;
  const half2 = 16;
  const half1 = 8;
  const maxRound = 7;
  const matches: BracketMatchInput[] = [];

  for (let round = 1; round <= 3; round++) {
    for (let slot = 1; slot <= half2; slot++) {
      matches.push({ round, slot, team1Id: null, team2Id: null });
    }
  }
  for (let slot = 1; slot <= 4; slot++) {
    matches.push({ round: 4, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 4; slot++) {
    matches.push({ round: 5, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 2; slot++) {
    matches.push({ round: 6, slot, team1Id: null, team2Id: null });
  }
  matches.push({ round: 7, slot: 1, team1Id: null, team2Id: null });
  if (withBronze) {
    matches.push({ round: 7, slot: 2, team1Id: null, team2Id: null });
  }

  const links: FixedSwissLink[] = [];

  for (let slot = 1; slot <= half2; slot++) {
    const toTeam = slotParityTeam(slot);
    links.push({
      fromRound: 1,
      fromSlot: slot,
      kind: "win",
      toRound: 2,
      toSlot: half1 + Math.ceil(slot / 2),
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

  for (let slot = 1; slot <= half1; slot++) {
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: slot,
      toTeam: 2,
    });
  }

  for (let slot = half1 + 1; slot <= half2; slot++) {
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "loss",
      toRound: 3,
      toSlot: 2 * half1 + 1 - slot,
      toTeam: 1,
    });
  }

  for (let k = 1; k <= half1 / 2; k++) {
    const slotA = half1 + 2 * k - 1;
    const slotB = half1 + 2 * k;
    const olympicSlot = half1 + k;
    links.push({
      fromRound: 2,
      fromSlot: slotA,
      kind: "win",
      toRound: 3,
      toSlot: olympicSlot,
      toTeam: 1,
    });
    links.push({
      fromRound: 2,
      fromSlot: slotB,
      kind: "win",
      toRound: 3,
      toSlot: olympicSlot,
      toTeam: 2,
    });
  }

  links.push({ fromRound: 3, fromSlot: 1, kind: "win", toRound: 4, toSlot: 1, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 2, kind: "win", toRound: 4, toSlot: 1, toTeam: 2 });
  links.push({ fromRound: 3, fromSlot: 3, kind: "win", toRound: 4, toSlot: 2, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 4, kind: "win", toRound: 4, toSlot: 2, toTeam: 2 });
  links.push({ fromRound: 3, fromSlot: 5, kind: "win", toRound: 4, toSlot: 3, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 6, kind: "win", toRound: 4, toSlot: 3, toTeam: 2 });
  links.push({ fromRound: 3, fromSlot: 7, kind: "win", toRound: 4, toSlot: 4, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 8, kind: "win", toRound: 4, toSlot: 4, toTeam: 2 });

  for (let slot = half1 + 1; slot <= half2; slot++) {
    const target = fixedSwissTs32OlympicToQuarterTarget(slot);
    if (!target) continue;
    links.push({
      fromRound: 3,
      fromSlot: slot,
      kind: "win",
      toRound: 5,
      toSlot: target.toSlot,
      toTeam: target.toTeam,
    });
  }

  // 1/8 проигравшие → нижняя тур 4 (пара к 1/4: #41→#50 … #44→#51), по аналогии с 16→8.
  const eighthLossToLowerTour4: Array<{ from: number; to: number }> = [
    { from: 9, to: 15 },
    { from: 10, to: 16 },
    { from: 11, to: 13 },
    { from: 12, to: 14 },
  ];
  for (const { from, to } of eighthLossToLowerTour4) {
    links.push({
      fromRound: 3,
      fromSlot: from,
      kind: "loss",
      toRound: 3,
      toSlot: to,
      toTeam: 1,
    });
  }

  // Нижняя тур 3 → тур 4: team2 (team1 занят проигравшим 1/8).
  links.push({ fromRound: 4, fromSlot: 1, kind: "win", toRound: 3, toSlot: 13, toTeam: 2 });
  links.push({ fromRound: 4, fromSlot: 2, kind: "win", toRound: 3, toSlot: 14, toTeam: 2 });
  links.push({ fromRound: 4, fromSlot: 3, kind: "win", toRound: 3, toSlot: 15, toTeam: 2 });
  links.push({ fromRound: 4, fromSlot: 4, kind: "win", toRound: 3, toSlot: 16, toTeam: 2 });

  for (let slot = 1; slot <= 4; slot++) {
    links.push({
      fromRound: 5,
      fromSlot: slot,
      kind: "win",
      toRound: 6,
      toSlot: Math.ceil(slot / 2),
      toTeam: slotParityTeam(slot),
    });
  }

  links.push({ fromRound: 6, fromSlot: 1, kind: "win", toRound: 7, toSlot: 1, toTeam: 1 });
  links.push({ fromRound: 6, fromSlot: 2, kind: "win", toRound: 7, toSlot: 1, toTeam: 2 });

  if (withBronze) {
    links.push({ fromRound: 6, fromSlot: 1, kind: "loss", toRound: 7, toSlot: 2, toTeam: 1 });
    links.push({ fromRound: 6, fromSlot: 2, kind: "loss", toRound: 7, toSlot: 2, toTeam: 2 });
  }

  return {
    gridSize,
    rounds: maxRound,
    matchesPerRound: half2,
    matches,
    links,
    variant: withBronze ? "ts3216bronze" : "ts3216",
  };
}

/**
 * 32→16 (55 встреч): как 59, но проигравшие 1/8 (#41–#44) сразу на места 9–12 —
 * без нижней тур 4 (#49–#52). Нижняя тур 3 (#45–#48) → 1/4 напрямую.
 * FIXED_SWISS_32R8_2_3_mesta.
 */
export function buildFixedSwissTs32R8ElimAtEighthTemplate(): FixedSwissTemplate {
  const base = buildFixedSwissTs32Template(false);
  const half1 = 8;
  const half2 = 16;
  const maxRound = 7;

  const matches = base.matches.filter(
    (m) => !(m.round === 3 && m.slot > half1 + half1 / 2),
  );

  const links: FixedSwissLink[] = base.links.filter((link) => {
    if (link.kind === "loss" && link.fromRound === 3 && link.fromSlot >= 9 && link.fromSlot <= 12) {
      return false;
    }
    if (link.fromRound === 4 && link.toRound === 3 && link.toSlot >= 13) {
      return false;
    }
    return true;
  });

  const lowerTour3ToQuarter: Record<number, { toSlot: number; toTeam: 2 }> = {
    1: { toSlot: 2, toTeam: 2 },
    2: { toSlot: 1, toTeam: 2 },
    3: { toSlot: 4, toTeam: 2 },
    4: { toSlot: 3, toTeam: 2 },
  };
  for (let slot = 1; slot <= 4; slot++) {
    const target = lowerTour3ToQuarter[slot]!;
    links.push({
      fromRound: 4,
      fromSlot: slot,
      kind: "win",
      toRound: 5,
      toSlot: target.toSlot,
      toTeam: target.toTeam,
    });
  }

  return {
    gridSize: 32,
    rounds: maxRound,
    matchesPerRound: half2,
    matches,
    links,
    variant: "ts3216r8elim",
  };
}

/**
 * 32→16 (56 встреч): как R8_2_3_mesta (55), плюс #60 — матч проигравших полуфиналистов.
 * FIXED_SWISS_32R8_1_3_mesto.
 */
export function buildFixedSwissTs32R8ElimAtEighthBronzeTemplate(): FixedSwissTemplate {
  const base = buildFixedSwissTs32R8ElimAtEighthTemplate();
  return {
    ...base,
    matches: [
      ...base.matches,
      { round: 7, slot: 2, team1Id: null, team2Id: null },
    ],
    links: [
      ...base.links,
      { fromRound: 6, fromSlot: 1, kind: "loss", toRound: 7, toSlot: 2, toTeam: 1 },
      { fromRound: 6, fromSlot: 2, kind: "loss", toRound: 7, toSlot: 2, toTeam: 2 },
    ],
    variant: "ts3216r8elimbronze",
  };
}

/** 55 встреч / 7 туров — вылет с 1/8 (не путать с устаревшей 55/6). */
export function isFixedSwissTs32R8ElimAtEighthMatchCount(
  matchCount: number,
  maxRound?: number,
): boolean {
  return matchCount === 55 && maxRound !== undefined && maxRound >= 7;
}

/** 56 встреч / 7 туров — R8_2_3_mesta + матч за 3–4 (#60). */
export function isFixedSwissTs32R8ElimAtEighthBronzeMatchCount(
  matchCount: number,
  maxRound?: number,
): boolean {
  return matchCount === 56 && maxRound !== undefined && maxRound >= 7;
}

export function isFixedSwissTs32R8ElimAtEighthFamily(
  matchCount: number,
  maxRound?: number,
): boolean {
  return (
    isFixedSwissTs32R8ElimAtEighthMatchCount(matchCount, maxRound) ||
    isFixedSwissTs32R8ElimAtEighthBronzeMatchCount(matchCount, maxRound)
  );
}

/** 1/8 + нижняя тур 4 → 1/4 (R5): обобщение для half1 = 16 (64) и half1 = 32 (128). */
export function fixedSwissTsOlympicToQuarterTarget(
  half1: number,
  r3Slot: number,
): { toRound: number; toSlot: number; toTeam: 1 | 2 } | null {
  const half2 = half1 * 2;
  const eighthStart = half1 + half1 / 4 + 1;
  const eighthEnd = half1 + half1 / 2;
  const upperTour2Start = half2 + 1;
  const upperTour2End = half2 + half1 / 4;
  const lowerTour4Start = half1 + half1 / 2 + 1;
  const lowerTour4End = half2;

  if (r3Slot >= eighthStart && r3Slot <= eighthEnd) {
    const idx = r3Slot - eighthStart;
    if (half1 <= 16) {
      return { toRound: 5, toSlot: half1 / 4 + 1 + idx, toTeam: 1 };
    }
    if (idx < half1 / 8) {
      return { toRound: 5, toSlot: half1 / 8 + 1 + idx, toTeam: 1 };
    }
    return {
      toRound: 5,
      toSlot: half1 / 4 + 1 + (idx - half1 / 8),
      toTeam: 1,
    };
  }
  const upperTour2EndR8 = half2 + 4;
  if (r3Slot >= upperTour2Start && r3Slot <= upperTour2EndR8) {
    const idx = r3Slot - upperTour2Start;
    return { toRound: 5, toSlot: idx + 1, toTeam: 1 };
  }
  if (half1 > 16) {
    const upperTour2BStart = half1 + 1;
    const upperTour2BEnd = half1 + half1 / 8;
    if (r3Slot >= upperTour2BStart && r3Slot <= upperTour2BEnd) {
      return null;
    }
  }
  if (r3Slot >= lowerTour4Start && r3Slot <= lowerTour4End) {
    const idx = r3Slot - lowerTour4Start;
    const toSlot =
      idx < half1 / 4
        ? half1 / 4 + 1 + idx
        : idx - half1 / 4 + 1;
    return { toRound: 5, toSlot, toTeam: 2 };
  }
  return null;
}

/** @deprecated Используйте fixedSwissTsOlympicToQuarterTarget(16, r3Slot). */
export function fixedSwissTs64OlympicToQuarterTarget(
  r3Slot: number,
): { toRound: number; toSlot: number; toTeam: 1 | 2 } | null {
  return fixedSwissTsOlympicToQuarterTarget(16, r3Slot);
}

/** R2 upper tour pair k → R3 slot (half2 = 32|64). */
export function fixedSwissTsUpperTour2Slot(
  half2: 32 | 64 | 128,
  k: number,
): number | null {
  const half1 = half2 / 2;
  if (k < 1 || k > half1 / 2) return null;
  if (half2 <= 32) {
    return k <= half1 / 4 ? half2 + k : half1 + k;
  }
  if (half2 > 64) {
    if (k <= half1 / 16) return half2 + k;
    if (k <= half1 / 8) {
      return half1 + half1 / 4 + (k - half1 / 16);
    }
    if (k <= (3 * half1) / 8) {
      return half1 + half1 / 4 + half1 / 16 + (k - half1 / 8);
    }
    if (k <= half1 / 2) {
      const lowerTour4Start = half1 + half1 / 2 + 1;
      return lowerTour4Start + (k - (3 * half1) / 8 - 1);
    }
    return null;
  }
  if (k <= half1 / 8) return half2 + k;
  if (k <= (3 * half1) / 8) {
    return half1 + half1 / 4 + (k - half1 / 8);
  }
  if (k <= half1 / 2) {
    const lowerTour4Start = half1 + half1 / 2 + 1;
    return lowerTour4Start + (k - (3 * half1) / 8 - 1);
  }
  return null;
}

/**
 * Эталон TS «N→N/2» для half2 = 32 (64) и half2 = 64 (128).
 * 64→32: 119/120; 128→64: 231/232 (полная); R8 elim — 111/112 и 215/216.
 */
export function buildFixedSwissTsLargeTemplate(
  half2: 32 | 64 | 128,
  withBronze = false,
): FixedSwissTemplate {
  const half1 = half2 / 2;
  const gridSize = half2 * 2;
  const r3ExtraSlots = 4;
  const maxRound = 7;
  const lowerTour4Start = half1 + half1 / 2 + 1;
  const eighthStart = half1 + half1 / 4 + 1;
  const eighthEnd = half1 + half1 / 2;
  const matches: BracketMatchInput[] = [];

  for (let round = 1; round <= 3; round++) {
    const slotCount = round === 3 ? half2 + r3ExtraSlots : half2;
    for (let slot = 1; slot <= slotCount; slot++) {
      matches.push({ round, slot, team1Id: null, team2Id: null });
    }
  }
  for (let slot = 1; slot <= half1 / 2; slot++) {
    matches.push({ round: 4, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= half1 / 2; slot++) {
    matches.push({ round: 5, slot, team1Id: null, team2Id: null });
  }
  for (let slot = 1; slot <= 2; slot++) {
    matches.push({ round: 6, slot, team1Id: null, team2Id: null });
  }
  matches.push({ round: 7, slot: 1, team1Id: null, team2Id: null });
  if (withBronze) {
    matches.push({ round: 7, slot: 2, team1Id: null, team2Id: null });
  }

  const links: FixedSwissLink[] = [];

  for (let slot = 1; slot <= half2; slot++) {
    const toTeam = slotParityTeam(slot);
    links.push({
      fromRound: 1,
      fromSlot: slot,
      kind: "win",
      toRound: 2,
      toSlot: half1 + Math.ceil(slot / 2),
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

  for (let slot = 1; slot <= half1 / 2; slot++) {
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: slot,
      toTeam: 2,
    });
  }
  for (let slot = half1 / 2 + 1; slot <= (half1 <= 16 ? half1 : half1 - half1 / 8); slot++) {
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: slot,
      toTeam: 2,
    });
  }
  if (half1 > 16) {
    for (let slot = half1 - 3; slot <= half1; slot++) {
      links.push({
        fromRound: 2,
        fromSlot: slot,
        kind: "win",
        toRound: 3,
        toSlot: slot,
        toTeam: 2,
      });
    }
  }

  for (let slot = half1 + 1; slot <= half2; slot++) {
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "loss",
      toRound: 3,
      toSlot: 2 * half1 + 1 - slot,
      toTeam: 1,
    });
  }

  for (let k = 1; k <= (half1 > 16 ? (3 * half1) / 8 : half1 / 2); k++) {
    const slotA = half1 + 2 * k - 1;
    const slotB = half1 + 2 * k;
    const upperTour2Slot = fixedSwissTsUpperTour2Slot(half2, k);
    if (upperTour2Slot == null) continue;
    links.push({
      fromRound: 2,
      fromSlot: slotA,
      kind: "win",
      toRound: 3,
      toSlot: upperTour2Slot,
      toTeam: 1,
    });
    links.push({
      fromRound: 2,
      fromSlot: slotB,
      kind: "win",
      toRound: 3,
      toSlot: upperTour2Slot,
      toTeam: 2,
    });
  }

  for (let k = 1; k <= half1 / 4; k++) {
    const crossA = 2 * k - 1;
    const crossB = 2 * k;
    links.push({
      fromRound: 3,
      fromSlot: crossA,
      kind: "win",
      toRound: 4,
      toSlot: k,
      toTeam: 1,
    });
    links.push({
      fromRound: 3,
      fromSlot: crossB,
      kind: "win",
      toRound: 4,
      toSlot: k,
      toTeam: 2,
    });
  }

  for (let k = 1; k <= half1 / 4; k++) {
    const bridgeA = half1 / 2 + 2 * k - 1;
    const bridgeB = half1 / 2 + 2 * k;
    const r4Slot = half1 / 4 + k;
    links.push({
      fromRound: 3,
      fromSlot: bridgeA,
      kind: "win",
      toRound: 4,
      toSlot: r4Slot,
      toTeam: 1,
    });
    links.push({
      fromRound: 3,
      fromSlot: bridgeB,
      kind: "win",
      toRound: 4,
      toSlot: r4Slot,
      toTeam: 2,
    });
  }

  for (let slot = eighthStart; slot <= eighthEnd; slot++) {
    const target = fixedSwissTsOlympicToQuarterTarget(half1, slot);
    if (!target) continue;
    links.push({
      fromRound: 3,
      fromSlot: slot,
      kind: "win",
      toRound: target.toRound,
      toSlot: target.toSlot,
      toTeam: target.toTeam,
    });
  }

  const upperTour2Start = half2 + 1;
  const upperTour2EndR8 = half2 + r3ExtraSlots;
  for (let slot = upperTour2Start; slot <= upperTour2EndR8; slot++) {
    const target = fixedSwissTsOlympicToQuarterTarget(half1, slot);
    if (!target) continue;
    links.push({
      fromRound: 3,
      fromSlot: slot,
      kind: "win",
      toRound: target.toRound,
      toSlot: target.toSlot,
      toTeam: target.toTeam,
    });
  }

  for (let slot = lowerTour4Start; slot <= half2; slot++) {
    const target = fixedSwissTsOlympicToQuarterTarget(half1, slot);
    if (!target) continue;
    links.push({
      fromRound: 3,
      fromSlot: slot,
      kind: "win",
      toRound: 5,
      toSlot: target.toSlot,
      toTeam: target.toTeam,
    });
  }

  for (let i = 0; i < half1 / 4; i++) {
    const toSlot = half2 - (half1 / 4 + 1) + i;
    links.push({
      fromRound: 3,
      fromSlot: half2 + 1 + i,
      kind: "loss",
      toRound: 3,
      toSlot,
      toTeam: 1,
    });
    links.push({
      fromRound: 3,
      fromSlot: eighthStart + i,
      kind: "loss",
      toRound: 3,
      toSlot,
      toTeam: 2,
    });
  }

  for (let slot = 1; slot <= half1 / 4; slot++) {
    const r3EighthSlot = half1 + slot;
    links.push({
      fromRound: 5,
      fromSlot: 2 * slot - 1,
      kind: "win",
      toRound: 3,
      toSlot: r3EighthSlot,
      toTeam: 1,
    });
    links.push({
      fromRound: 5,
      fromSlot: 2 * slot,
      kind: "win",
      toRound: 3,
      toSlot: r3EighthSlot,
      toTeam: 2,
    });
  }

  for (let slot = 1; slot <= half1 / 4; slot++) {
    links.push({
      fromRound: 4,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: lowerTour4Start + slot - 1,
      toTeam: 1,
    });
  }
  for (let r4Slot = half1 / 4 + 1; r4Slot <= half1 / 2; r4Slot++) {
    links.push({
      fromRound: 4,
      fromSlot: r4Slot,
      kind: "win",
      toRound: 3,
      toSlot: lowerTour4Start + r4Slot - 1,
      toTeam: 1,
    });
  }

  for (let slot = 1; slot <= half1 / 4; slot++) {
    const r3EighthSlot = half1 + slot;
    const semiSlot = Math.ceil(slot / (half1 / 8));
    const toTeam = slot % 2 === 1 ? 1 : 2;
    links.push({
      fromRound: 3,
      fromSlot: r3EighthSlot,
      kind: "win",
      toRound: 6,
      toSlot: semiSlot,
      toTeam,
    });
  }

  links.push({ fromRound: 6, fromSlot: 1, kind: "win", toRound: 7, toSlot: 1, toTeam: 1 });
  links.push({ fromRound: 6, fromSlot: 2, kind: "win", toRound: 7, toSlot: 1, toTeam: 2 });

  if (withBronze) {
    links.push({ fromRound: 6, fromSlot: 1, kind: "loss", toRound: 7, toSlot: 2, toTeam: 1 });
    links.push({ fromRound: 6, fromSlot: 2, kind: "loss", toRound: 7, toSlot: 2, toTeam: 2 });
  }

  const variant =
    half2 === 32
      ? withBronze
        ? "ts6432bronze"
        : "ts6432"
      : half2 === 64
        ? withBronze
          ? "ts12864bronze"
          : "ts12864"
        : withBronze
          ? "ts256128bronze"
          : "ts256128";

  return {
    gridSize,
    rounds: maxRound,
    matchesPerRound: half2,
    matches,
    links,
    variant,
  };
}

/** 64→32 эталон (119/120 встреч; legacy 115/116): см. docs/BRACKET_REFERENCE_64_32.md */
function buildFixedSwissTs64Template(withBronze = false): FixedSwissTemplate {
  return buildFixedSwissTsLargeTemplate(32, withBronze);
}

/** 128→64 эталон (231/232 встреч). */
function buildFixedSwissTs128Template(withBronze = false): FixedSwissTemplate {
  return buildFixedSwissTsLargeTemplate(64, withBronze);
}

/** 256→128 эталон (496 встреч, полная TS). */
function buildFixedSwissTs256Template(withBronze = false): FixedSwissTemplate {
  return buildFixedSwissTsLargeTemplate(128, withBronze);
}

/**
 * Колонки −4/−5/−6 по эталону TS (#193–208, #217–224, #225–232) — без связей, только раскладка.
 * R3 слоты 53–64 (#204–193), 81–84 (#208–205), 69–72 (#217–218, #223–224), 73–80 (#225–232).
 */
function appendTs128R8DisplayColumnMatches(matches: BracketMatchInput[]): void {
  for (const slot of [
    53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64,
    69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
    81, 82, 83, 84,
  ]) {
    matches.push({ round: 3, slot, team1Id: null, team2Id: null });
  }
}

/** Пары R3 верхней тур 2 → R5 (#209–#216). */
export const FIXED_SWISS_TS128R8_UPPER_TOUR2_WIN_PAIRS: readonly (readonly [
  number,
  number,
])[] = [
  [65, 66],
  [67, 68],
  [41, 42],
  [43, 44],
  [45, 46],
  [47, 48],
  [49, 50],
  [51, 52],
];

export function fixedSwissTs128R8UpperTour2PairForTour3Slot(
  r5Slot: number,
): readonly [number, number] | null {
  if (r5Slot < 1 || r5Slot > FIXED_SWISS_TS128R8_UPPER_TOUR2_WIN_PAIRS.length) {
    return null;
  }
  return FIXED_SWISS_TS128R8_UPPER_TOUR2_WIN_PAIRS[r5Slot - 1] ?? null;
}

/** R3 слот display-колонки нижней тур 4 (#193–#208). */
export function fixedSwissTs128R8LowerTour4DisplaySlot(matchNo: number): number {
  if (matchNo >= 193 && matchNo <= 204) return 257 - matchNo;
  if (matchNo >= 205 && matchNo <= 208) return 289 - matchNo;
  throw new Error(`128R8 lower tour 4 display: #${matchNo}`);
}

/** R4 нижней тур 3 (#177–#192) → R3 нижней тур 4 (#193–#208) по одному. */
export function fixedSwissTs128R8LowerTour3WinTarget(
  fromSlot: number,
): { toRound: 3; toSlot: number } | null {
  if (fromSlot < 1 || fromSlot > 16) return null;
  const matchNo = 209 - fromSlot;
  return {
    toRound: 3,
    toSlot: fixedSwissTs128R8LowerTour4DisplaySlot(matchNo),
  };
}

/** team2 в нижней тур 4, если проигравший верхней тур 2 уже на team1. */
export function fixedSwissTs128R8LowerTour3WinToTeam(
  fromSlot: number,
): 1 | 2 {
  const matchNo = 209 - fromSlot;
  const targetSlot = fixedSwissTs128R8LowerTour4DisplaySlot(matchNo);
  for (let i = 0; i < FIXED_SWISS_TS128R8_UPPER_TOUR2_FROM_SLOTS.length; i++) {
    const upperFromSlot = FIXED_SWISS_TS128R8_UPPER_TOUR2_FROM_SLOTS[i]!;
    const upperMatchNo = 161 + i;
    const lossNo =
      upperMatchNo <= 168 ? 200 + (upperMatchNo - 160) : 192 + (upperMatchNo - 168);
    if (fixedSwissTs128R8LowerTour4DisplaySlot(lossNo) !== targetSlot) continue;
    return slotParityTeam(upperFromSlot) === 1 ? 2 : 1;
  }
  return 1;
}

/** Нижняя тур 3 (#177–#192) → нижняя тур 4 display (#193–#208). */
function appendTs128R8LowerTour3Links(links: FixedSwissLink[]): void {
  for (let fromSlot = 1; fromSlot <= 16; fromSlot++) {
    const win = fixedSwissTs128R8LowerTour3WinTarget(fromSlot);
    if (!win) continue;
    links.push({
      fromRound: 4,
      fromSlot,
      kind: "win",
      toRound: win.toRound,
      toSlot: win.toSlot,
      toTeam: fixedSwissTs128R8LowerTour3WinToTeam(fromSlot),
    });
  }
}

/** R3 display-слот нижней тур 4 (#193–#208) → номер встречи. */
export function fixedSwissTs128R8LowerTour4MatchNoFromDisplaySlot(
  slot: number,
): number | null {
  if (slot >= 53 && slot <= 64) return 257 - slot;
  if (slot >= 81 && slot <= 84) return 289 - slot;
  return null;
}

/** Нижняя тур 5 (#217–#224): R3 69–72 или R5 9–12. */
export function fixedSwissTs128R8LowerTour5FromMatchNo(
  matchNo: number,
): { toRound: 3 | 5; toSlot: number } | null {
  if (matchNo === 217) return { toRound: 3, toSlot: 69 };
  if (matchNo === 218) return { toRound: 3, toSlot: 70 };
  if (matchNo === 219) return { toRound: 5, toSlot: 9 };
  if (matchNo === 220) return { toRound: 5, toSlot: 10 };
  if (matchNo === 221) return { toRound: 5, toSlot: 11 };
  if (matchNo === 222) return { toRound: 5, toSlot: 12 };
  if (matchNo === 223) return { toRound: 3, toSlot: 71 };
  if (matchNo === 224) return { toRound: 3, toSlot: 72 };
  return null;
}

/** Нижняя тур 4 (#193–#208): win → #217–#224 парами; loss — место 33–48. */
export function fixedSwissTs128R8LowerTour4WinTarget(
  fromMatchNo: number,
): { toRound: 3 | 5; toSlot: number; toTeam: 1 | 2 } | null {
  if (fromMatchNo < 193 || fromMatchNo > 208) return null;
  const targetMatchNo = 224 - Math.floor((fromMatchNo - 193) / 2);
  const target = fixedSwissTs128R8LowerTour5FromMatchNo(targetMatchNo);
  if (!target) return null;
  return {
    ...target,
    toTeam: fromMatchNo % 2 === 1 ? 1 : 2,
  };
}

/** Нижняя тур 4 (#193–#208) → нижняя тур 5 (#217–#224). */
function appendTs128R8LowerTour4Links(links: FixedSwissLink[]): void {
  for (let matchNo = 193; matchNo <= 208; matchNo++) {
    const fromSlot = fixedSwissTs128R8LowerTour4DisplaySlot(matchNo);
    const win = fixedSwissTs128R8LowerTour4WinTarget(matchNo);
    if (!win) continue;
    links.push({
      fromRound: 3,
      fromSlot,
      kind: "win",
      toRound: win.toRound,
      toSlot: win.toSlot,
      toTeam: win.toTeam,
    });
  }
}

/** R3 слоты верхней тур 2 (#161–#176) в порядке номеров встреч. */
export const FIXED_SWISS_TS128R8_UPPER_TOUR2_FROM_SLOTS = [
  65, 66, 67, 68, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
] as const;

export function fixedSwissTs128R8UpperTour2LossDisplaySlot(
  fromSlot: number,
): number | null {
  const idx = FIXED_SWISS_TS128R8_UPPER_TOUR2_FROM_SLOTS.indexOf(
    fromSlot as (typeof FIXED_SWISS_TS128R8_UPPER_TOUR2_FROM_SLOTS)[number],
  );
  if (idx < 0) return null;
  const matchNo = 161 + idx;
  const lossNo =
    matchNo <= 168 ? 200 + (matchNo - 160) : 192 + (matchNo - 168);
  return fixedSwissTs128R8LowerTour4DisplaySlot(lossNo);
}

/** R3 слот верхней тур 2 (#161–#176) → R5 (#209–#216) парами. */
export function fixedSwissTs128R8UpperTour2WinTarget(
  fromSlot: number,
): { toRound: 5; toSlot: number } | null {
  for (let k = 0; k < FIXED_SWISS_TS128R8_UPPER_TOUR2_WIN_PAIRS.length; k++) {
    const pair = FIXED_SWISS_TS128R8_UPPER_TOUR2_WIN_PAIRS[k]!;
    if (fromSlot === pair[0] || fromSlot === pair[1]) {
      return { toRound: 5, toSlot: k + 1 };
    }
  }
  return null;
}

function isTs128R8UpperTour2R3Slot(slot: number): boolean {
  return (slot >= 41 && slot <= 52) || (slot >= 65 && slot <= 68);
}

/** Верхняя тур 2 (#161–#176): win → #209–#216 парами; loss → #193–#208 по одному. */
function appendTs128R8UpperTour2Links(links: FixedSwissLink[]): void {
  const fromSlots = FIXED_SWISS_TS128R8_UPPER_TOUR2_FROM_SLOTS;
  for (const fromSlot of fromSlots) {
    const target = fixedSwissTs128R8UpperTour2WinTarget(fromSlot);
    if (!target) continue;
    links.push({
      fromRound: 3,
      fromSlot,
      kind: "win",
      toRound: target.toRound,
      toSlot: target.toSlot,
      toTeam: slotParityTeam(fromSlot),
    });
  }

  for (let i = 0; i < FIXED_SWISS_TS128R8_UPPER_TOUR2_FROM_SLOTS.length; i++) {
    const fromSlot = FIXED_SWISS_TS128R8_UPPER_TOUR2_FROM_SLOTS[i]!;
    const matchNo = 161 + i;
    const lossNo =
      matchNo <= 168 ? 200 + (matchNo - 160) : 192 + (matchNo - 168);
    links.push({
      fromRound: 3,
      fromSlot,
      kind: "loss",
      toRound: 3,
      toSlot: fixedSwissTs128R8LowerTour4DisplaySlot(lossNo),
      toTeam: slotParityTeam(fromSlot),
    });
  }
}

/** R3 слот display-колонки нижней тур 6 (#225–#232). */
export function fixedSwissTs128R8LowerTour6DisplaySlot(matchNo: number): number {
  if (matchNo >= 225 && matchNo <= 232) return matchNo - 152;
  throw new Error(`128R8 lower tour 6 display: #${matchNo}`);
}

/** Нижняя тур 5 (#217–#224) → нижняя тур 6 display (#225–#232) по одному. */
export function fixedSwissTs128R8LowerTour5WinTarget(
  fromMatchNo: number,
): { toRound: 3; toSlot: number } | null {
  if (fromMatchNo < 217 || fromMatchNo > 224) return null;
  return {
    toRound: 3,
    toSlot: fixedSwissTs128R8LowerTour6DisplaySlot(fromMatchNo + 8),
  };
}

/** team2 в нижней тур 6, если проигравший верхней тур 3 уже на team1. */
export function fixedSwissTs128R8LowerTour5WinToTeam(
  fromMatchNo: number,
): 1 | 2 {
  const win = fixedSwissTs128R8LowerTour5WinTarget(fromMatchNo);
  if (!win) return 1;
  for (let fromSlot = 1; fromSlot <= 8; fromSlot++) {
    const loss = fixedSwissTs128R8UpperTour3LossTarget(fromSlot);
    if (!loss || loss.toSlot !== win.toSlot) continue;
    return slotParityTeam(fromSlot) === 1 ? 2 : 1;
  }
  return 1;
}

/** Нижняя тур 5 (#217–#224) → нижняя тур 6 (#225–#232). */
function appendTs128R8LowerTour5Links(links: FixedSwissLink[]): void {
  for (let matchNo = 217; matchNo <= 224; matchNo++) {
    const from = fixedSwissTs128R8LowerTour5FromMatchNo(matchNo);
    const win = fixedSwissTs128R8LowerTour5WinTarget(matchNo);
    if (!from || !win) continue;
    links.push({
      fromRound: from.toRound,
      fromSlot: from.toSlot,
      kind: "win",
      toRound: win.toRound,
      toSlot: win.toSlot,
      toTeam: fixedSwissTs128R8LowerTour5WinToTeam(matchNo),
    });
  }
}

/** R3 слот 1/8 (#233–#240). */
export function fixedSwissTs128R8EighthDisplaySlot(matchNo: number): number {
  if (matchNo >= 233 && matchNo <= 240) return matchNo - 200;
  throw new Error(`128R8 1/8 display: #${matchNo}`);
}

/** team1 в 1/8, если победитель верхней тур 3 уже на team2. */
export function fixedSwissTs128R8LowerTour6WinToTeam(
  fromMatchNo: number,
): 1 | 2 {
  if (fromMatchNo < 225 || fromMatchNo > 232) return 2;
  const targetMatchNo = 465 - fromMatchNo;
  const eighthSlot = fixedSwissTs128R8EighthDisplaySlot(targetMatchNo);
  const upperFromSlot = eighthSlot - 32;
  if (upperFromSlot < 1 || upperFromSlot > 8) return 2;
  return slotParityTeam(upperFromSlot) === 1 ? 2 : 1;
}

/** Нижняя тур 6 (#225–#232) → 1/8 (#233–#240) по одному. */
export function fixedSwissTs128R8LowerTour6WinTarget(
  fromMatchNo: number,
): { toRound: 3; toSlot: number; toTeam: 1 | 2 } | null {
  if (fromMatchNo < 225 || fromMatchNo > 232) return null;
  const targetMatchNo = 465 - fromMatchNo;
  return {
    toRound: 3,
    toSlot: fixedSwissTs128R8EighthDisplaySlot(targetMatchNo),
    toTeam: fixedSwissTs128R8LowerTour6WinToTeam(fromMatchNo),
  };
}

/** Нижняя тур 6 (#225–#232) → 1/8 (#233–#240). */
function appendTs128R8LowerTour6Links(links: FixedSwissLink[]): void {
  for (let matchNo = 225; matchNo <= 232; matchNo++) {
    const fromSlot = fixedSwissTs128R8LowerTour6DisplaySlot(matchNo);
    const win = fixedSwissTs128R8LowerTour6WinTarget(matchNo);
    if (!win) continue;
    links.push({
      fromRound: 3,
      fromSlot,
      kind: "win",
      toRound: win.toRound,
      toSlot: win.toSlot,
      toTeam: win.toTeam,
    });
  }
}

/** R5 слот верхней тур 3 (#209–#216) → R3 1/8 (#233–#240) по одному. */
export function fixedSwissTs128R8UpperTour3WinTarget(
  fromSlot: number,
): { toRound: 3; toSlot: number } | null {
  if (fromSlot < 1 || fromSlot > 8) return null;
  return { toRound: 3, toSlot: 32 + fromSlot };
}

/** R5 слот верхней тур 3 → R3 нижняя тур 6 (#229–#232, #225–#228). */
export function fixedSwissTs128R8UpperTour3LossTarget(
  fromSlot: number,
): { toRound: 3; toSlot: number } | null {
  if (fromSlot < 1 || fromSlot > 8) return null;
  const lossNo = fromSlot <= 4 ? 228 + fromSlot : 220 + fromSlot;
  return { toRound: 3, toSlot: fixedSwissTs128R8LowerTour6DisplaySlot(lossNo) };
}

/** Верхняя тур 3 (#209–#216): win → #233–#240; loss → #229–#232 / #225–#228. */
function appendTs128R8UpperTour3Links(links: FixedSwissLink[]): void {
  for (let fromSlot = 1; fromSlot <= 8; fromSlot++) {
    const win = fixedSwissTs128R8UpperTour3WinTarget(fromSlot);
    if (win) {
      links.push({
        fromRound: 5,
        fromSlot,
        kind: "win",
        toRound: win.toRound,
        toSlot: win.toSlot,
        toTeam: slotParityTeam(fromSlot),
      });
    }
    const loss = fixedSwissTs128R8UpperTour3LossTarget(fromSlot);
    if (loss) {
      links.push({
        fromRound: 5,
        fromSlot,
        kind: "loss",
        toRound: loss.toRound,
        toSlot: loss.toSlot,
        toTeam: slotParityTeam(fromSlot),
      });
    }
  }
}

/** R3 1/8 (#233–#240) → R5 1/4 (#241–#244) парами. */
export const FIXED_SWISS_TS128R8_EIGHTH_WIN_PAIRS: readonly (readonly [
  number,
  number,
])[] = [
  [33, 34],
  [35, 36],
  [37, 38],
  [39, 40],
];

export function fixedSwissTs128R8EighthWinTarget(
  fromSlot: number,
): { toRound: 5; toSlot: number } | null {
  for (let k = 0; k < FIXED_SWISS_TS128R8_EIGHTH_WIN_PAIRS.length; k++) {
    const pair = FIXED_SWISS_TS128R8_EIGHTH_WIN_PAIRS[k]!;
    if (fromSlot === pair[0] || fromSlot === pair[1]) {
      return { toRound: 5, toSlot: 13 + k };
    }
  }
  return null;
}

export function fixedSwissTs128R8QuarterWinTarget(
  fromSlot: number,
): { toRound: 6; toSlot: number } | null {
  if (fromSlot < 13 || fromSlot > 16) return null;
  return { toRound: 6, toSlot: Math.ceil((fromSlot - 12) / 2) };
}

/** 1/8 (#233–#240) → 1/4 (#241–#244); 1/4 → полуфинал (#245–#246). */
function appendTs128R8EighthAndQuarterLinks(links: FixedSwissLink[]): void {
  for (let r3Slot = 33; r3Slot <= 40; r3Slot++) {
    const win = fixedSwissTs128R8EighthWinTarget(r3Slot);
    if (!win) continue;
    links.push({
      fromRound: 3,
      fromSlot: r3Slot,
      kind: "win",
      toRound: win.toRound,
      toSlot: win.toSlot,
      toTeam: slotParityTeam(r3Slot - 32),
    });
  }
  for (let r5Slot = 13; r5Slot <= 16; r5Slot++) {
    const win = fixedSwissTs128R8QuarterWinTarget(r5Slot);
    if (!win) continue;
    links.push({
      fromRound: 5,
      fromSlot: r5Slot,
      kind: "win",
      toRound: win.toRound,
      toSlot: win.toSlot,
      toTeam: slotParityTeam(r5Slot - 12),
    });
  }
}

/**
 * R8 elim: проигравшие 1/8 сразу на места (half1+1)–(half1+half1/2), без нижней тур 4.
 * 64→32 (111) / 128→64 (247/248 с колонками TS −4/−5/−6).
 */
export function buildFixedSwissTsR8ElimForHalf2(half2: 32 | 64): FixedSwissTemplate {
  const base = buildFixedSwissTsLargeTemplate(half2, false);
  const half1 = half2 / 2;
  const maxRound = 7;
  const lowerTour4Start = half1 + half1 / 2 + 1;
  const eighthStart = half1 + half1 / 4 + 1;
  const eighthEnd = half1 + half1 / 2;
  const upperTour2Start = half2 + 1;
  const upperTour2End = half2 + half1 / 4;

  const upperTour2TailStart = lowerTour4Start;
  const upperTour2TailEnd =
    half2 === 64 ? lowerTour4Start + half1 / 8 - 1 : lowerTour4Start - 1;

  const matches = base.matches
    .filter(
      (m) =>
        !(
          m.round === 3 &&
          m.slot >= lowerTour4Start &&
          m.slot <= half2 &&
          (half2 !== 64 ||
            m.slot < upperTour2TailStart ||
            m.slot > upperTour2TailEnd)
        ),
    )
    .sort((a, b) => a.round - b.round || a.slot - b.slot);

  const links: FixedSwissLink[] = base.links.filter((link) => {
    if (
      half2 === 64 &&
      link.fromRound === 3 &&
      link.toRound === 6 &&
      link.fromSlot >= 33 &&
      link.fromSlot <= 40
    ) {
      return false;
    }
    /** 128→64: убрать legacy R5→R3 (third-place / нижняя тур 5); актуальные — appendTs128R8*. */
    if (
      half2 === 64 &&
      link.fromRound === 5 &&
      link.kind === "win" &&
      link.toRound === 3
    ) {
      return false;
    }
    /** 128→64: нижняя тур 5 (#219–#222) — appendTs128R8LowerTour5Links. */
    if (
      half2 === 64 &&
      link.fromRound === 5 &&
      link.fromSlot >= 9 &&
      link.fromSlot <= 12 &&
      link.kind === "win"
    ) {
      return false;
    }
    /** 128→64: нижняя тур 5 (#217,#218,#223,#224) — appendTs128R8LowerTour5Links. */
    if (
      half2 === 64 &&
      link.fromRound === 3 &&
      link.fromSlot >= 69 &&
      link.fromSlot <= 72 &&
      link.kind === "win"
    ) {
      return false;
    }
    /** 128→64: нижняя тур 6 (#225–#232) — appendTs128R8LowerTour6Links. */
    if (
      half2 === 64 &&
      link.fromRound === 3 &&
      link.fromSlot >= 73 &&
      link.fromSlot <= 80 &&
      link.kind === "win"
    ) {
      return false;
    }
    /** 128→64: убрать legacy R4→R3/R5; актуальные — appendTs128R8LowerTour3Links. */
    if (half2 === 64 && link.fromRound === 4 && link.kind === "win") {
      return false;
    }
    if (
      half2 === 64 &&
      link.fromRound === 3 &&
      link.kind === "win" &&
      isTs128R8UpperTour2R3Slot(link.fromSlot)
    ) {
      return false;
    }
    if (
      link.kind === "loss" &&
      link.fromRound === 3 &&
      ((link.fromSlot >= eighthStart && link.fromSlot <= eighthEnd) ||
        (link.fromSlot >= upperTour2Start && link.fromSlot <= upperTour2End))
    ) {
      return false;
    }
    if (
      link.fromRound === 4 &&
      link.toRound === 3 &&
      link.toSlot >= lowerTour4Start &&
      link.toSlot <= half2
    ) {
      return false;
    }
    if (
      link.fromRound === 3 &&
      link.fromSlot >= lowerTour4Start &&
      link.fromSlot <= half2
    ) {
      return false;
    }
    return true;
  });

  if (half2 !== 64) {
    for (let r4Slot = 1; r4Slot <= half1 / 2; r4Slot++) {
      const r3Slot = lowerTour4Start + r4Slot - 1;
      const target = fixedSwissTsOlympicToQuarterTarget(half1, r3Slot);
      if (!target || target.toRound !== 5) continue;
      links.push({
        fromRound: 4,
        fromSlot: r4Slot,
        kind: "win",
        toRound: 5,
        toSlot: target.toSlot,
        toTeam: target.toTeam,
      });
    }
  }

  if (half2 === 64) {
    appendTs128R8DisplayColumnMatches(matches);
    matches.sort((a, b) => a.round - b.round || a.slot - b.slot);
    for (let k = 13; k <= half1 / 2; k++) {
      const upperTour2Slot = fixedSwissTsUpperTour2Slot(half2, k);
      if (upperTour2Slot == null) continue;
      const slotA = half1 + 2 * k - 1;
      const slotB = half1 + 2 * k;
      links.push({
        fromRound: 2,
        fromSlot: slotA,
        kind: "win",
        toRound: 3,
        toSlot: upperTour2Slot,
        toTeam: 1,
      });
      links.push({
        fromRound: 2,
        fromSlot: slotB,
        kind: "win",
        toRound: 3,
        toSlot: upperTour2Slot,
        toTeam: 2,
      });
    }
    appendTs128R8UpperTour2Links(links);
    appendTs128R8UpperTour3Links(links);
    appendTs128R8EighthAndQuarterLinks(links);
    appendTs128R8LowerTour3Links(links);
    appendTs128R8LowerTour4Links(links);
    appendTs128R8LowerTour5Links(links);
    appendTs128R8LowerTour6Links(links);
  }

  const variant = half2 === 32 ? "ts6432r8elim" : "ts12864r8elim";
  return {
    gridSize: half2 * 2,
    rounds: maxRound,
    matchesPerRound: half2,
    matches,
    links,
    variant,
  };
}

function buildFixedSwissTsR8ElimBronzeForHalf2(half2: 32 | 64): FixedSwissTemplate {
  const base = buildFixedSwissTsR8ElimForHalf2(half2);
  const variant = half2 === 32 ? "ts6432r8elimbronze" : "ts12864r8elimbronze";
  return {
    ...base,
    matches: [
      ...base.matches,
      { round: 7, slot: 2, team1Id: null, team2Id: null },
    ],
    links: [
      ...base.links,
      { fromRound: 6, fromSlot: 1, kind: "loss", toRound: 7, toSlot: 2, toTeam: 1 },
      { fromRound: 6, fromSlot: 2, kind: "loss", toRound: 7, toSlot: 2, toTeam: 2 },
    ],
    variant,
  };
}

/**
 * 64→32 (111 встреч): как 119, но проигравшие 1/8 (#81–#88) сразу на места 17–24.
 * FIXED_SWISS_64R8_2_3_mesta.
 */
export function buildFixedSwissTs64R8ElimAtEighthTemplate(): FixedSwissTemplate {
  return buildFixedSwissTsR8ElimForHalf2(32);
}

/**
 * 64→32 (112 встреч): R8_2_3_mesta + матч за 3–4 (#120).
 * FIXED_SWISS_64R8_1_3_mesto.
 */
export function buildFixedSwissTs64R8ElimAtEighthBronzeTemplate(): FixedSwissTemplate {
  return buildFixedSwissTsR8ElimBronzeForHalf2(32);
}

/**
 * 128→64 (247 встреч): та же сетка, что FIXED_SWISS_128R8_1_3_mesto, без матча #248.
 * Полуфиналисты делят 3-е место (два «третьих»).
 * FIXED_SWISS_128R8_2_3_mesta.
 */
export function buildFixedSwissTs128R8ElimAtEighthTemplate(): FixedSwissTemplate {
  return buildFixedSwissTsR8ElimForHalf2(64);
}

/**
 * 128→64 (248 встреч): buildFixedSwissTsR8ElimForHalf2(64) + матч за 3–4 (#248).
 * FIXED_SWISS_128R8_1_3_mesto.
 */
export function buildFixedSwissTs128R8ElimAtEighthBronzeTemplate(): FixedSwissTemplate {
  return buildFixedSwissTsR8ElimBronzeForHalf2(64);
}

function isFixedSwissTsR8ElimAtEighthFromMatches(
  matches: Array<{ round: number }>,
  half2: 32 | 64,
): boolean {
  const half1 = half2 / 2;
  const count = matches.length;
  const expectedCounts =
    half2 === 32
      ? [111, 112]
      : [247, 248, 219, 220, 215, 216];
  if (!expectedCounts.includes(count)) return false;
  const r3Count =
    half2 === 32
      ? half2 + 4 - half1 / 2
      : half2 + 4 - half1 / 2 + half1 / 8 + 28;
  return matches.filter((m) => m.round === 3).length === r3Count;
}

/** R8 elim 64: 28 слотов в R3 (без нижней тур 4). */
export function isFixedSwissTs64R8ElimAtEighthFromMatches(
  matches: Array<{ round: number }>,
): boolean {
  return isFixedSwissTsR8ElimAtEighthFromMatches(matches, 32);
}

/** R8 elim 128: 56 слотов в R3 (без нижней тур 4, +4 верхней тур 2 #173–#176). */
export function isFixedSwissTs128R8ElimAtEighthFromMatches(
  matches: Array<{ round: number }>,
): boolean {
  return isFixedSwissTsR8ElimAtEighthFromMatches(matches, 64);
}

/** 111 встреч / 7 туров — вылет с 1/8 (64→32). */
export function isFixedSwissTs64R8ElimAtEighthMatchCount(
  matchCount: number,
  maxRound?: number,
): boolean {
  return matchCount === 111 && maxRound !== undefined && maxRound >= 7;
}

/** 112 встреч / 7 туров — R8_2_3_mesta + матч за 3–4 (#120). */
export function isFixedSwissTs64R8ElimAtEighthBronzeMatchCount(
  matchCount: number,
  maxRound?: number,
): boolean {
  return matchCount === 112 && maxRound !== undefined && maxRound >= 7;
}

export function isFixedSwissTs64R8ElimAtEighthFamily(
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (matchCount == null) return false;
  return (
    isFixedSwissTs64R8ElimAtEighthMatchCount(matchCount, maxRound) ||
    isFixedSwissTs64R8ElimAtEighthBronzeMatchCount(matchCount, maxRound)
  );
}

/** 247 встреч / 7 туров — вылет с 1/8 (128→64). Legacy: 215, 219. */
export function isFixedSwissTs128R8ElimAtEighthMatchCount(
  matchCount: number,
  maxRound?: number,
): boolean {
  return (
    (matchCount === 247 || matchCount === 219 || matchCount === 215) &&
    maxRound !== undefined &&
    maxRound >= 7
  );
}

/** 248 встреч / 7 туров — R8 + матч за 3–4 (128→64). Legacy: 216, 220. */
export function isFixedSwissTs128R8ElimAtEighthBronzeMatchCount(
  matchCount: number,
  maxRound?: number,
): boolean {
  return (
    (matchCount === 248 || matchCount === 220 || matchCount === 216) &&
    maxRound !== undefined &&
    maxRound >= 7
  );
}

export function isFixedSwissTs128R8ElimAtEighthFamily(
  matchCount?: number,
  maxRound?: number,
): boolean {
  if (matchCount == null) return false;
  return (
    isFixedSwissTs128R8ElimAtEighthMatchCount(matchCount, maxRound) ||
    isFixedSwissTs128R8ElimAtEighthBronzeMatchCount(matchCount, maxRound)
  );
}

/** Глобальный номер 32→16: 1/8 #41–#44; нижняя тур 3 #48–#45; тур 4 #52–#49. */
export function fixedSwissTs32MatchNo(
  round: number,
  slot: number,
  withBronze = false,
): number {
  if (round === 1) return slot;
  if (round === 2) {
    if (slot <= 8) return 16 + slot;
    return slot + 16;
  }
  if (round === 3) {
    if (slot <= 8) return 41 - slot;
    if (slot <= 12) return 32 + slot;
    return 65 - slot;
  }
  if (round === 4) return 49 - slot;
  if (round === 5) return 52 + slot;
  if (round === 6) return 56 + slot;
  if (withBronze && round === 7 && slot === 2) return 60;
  if (round === 7) return 59;
  throw new Error(`Некорректный слот TS 32-16: тур ${round}, слот ${slot}`);
}

/** 1/8 + нижняя тур 4 → 1/4: по одному входу в #53–#56. */
export function fixedSwissTs32OlympicToQuarterTarget(
  r3Slot: number,
): { toSlot: number; toTeam: 1 | 2 } | null {
  const map: Record<number, { toSlot: number; toTeam: 1 | 2 }> = {
    9: { toSlot: 1, toTeam: 1 },
    10: { toSlot: 2, toTeam: 1 },
    11: { toSlot: 3, toTeam: 1 },
    12: { toSlot: 4, toTeam: 1 },
    13: { toSlot: 2, toTeam: 2 },
    14: { toSlot: 1, toTeam: 2 },
    15: { toSlot: 4, toTeam: 2 },
    16: { toSlot: 3, toTeam: 2 },
  };
  return map[r3Slot] ?? null;
}

/** Верхняя тур 2/3 + нижняя тур 4 → R5; #105–#112→#113–#116 (пары) — links R5→R3. */
/**
 * Глобальный номер для half2 = 32 (64) и half2 = 64 (128).
 */
export function fixedSwissTsLargeMatchNo(
  half2: 32 | 64 | 128,
  round: number,
  slot: number,
  withBronze = false,
): number {
  const half1 = half2 / 2;
  const r3ExtraSlots = 4;
  if (round === 1) return slot;
  if (round === 2) {
    if (slot <= half1) return half2 + slot;
    return slot + half2;
  }
  if (round === 3) {
    if (slot <= half1) return 2 * half2 + half1 + 1 - slot;
    if (slot <= half1 + half1 / 4) return 3 * half2 + slot;
    if (slot <= half1 + half1 / 2) return 2 * half2 + slot;
    if (slot <= half2) return 3 * half2 + 1 + (half2 - slot);
    if (slot <= half2 + r3ExtraSlots) return half2 + half1 + slot;
  }
  if (round === 4) return 3 * half2 + 1 - slot;
  if (round === 5) return 3 * half2 + half1 / 2 + slot;
  if (round === 6) return 3 * half2 + 20 + slot;
  if (withBronze && round === 7 && slot === 2) return 3 * half2 + 24;
  if (round === 7) return 3 * half2 + 23;
  throw new Error(`Некорректный слот TS ${half2 * 2}→${half2}: тур ${round}, слот ${slot}`);
}

/**
 * Глобальный номер 64→32 (119 встреч).
 * Колонки: #1–32 · #33–48 ↓ · #49–64 ↑ · #80–65 ↓ · #81–88 ↑ · #96–89 ↓ · #104–97 ↓
 * · #105–#112 ↑ · #113–#116 (1/8) · #117–#118 полуфинал · #119 финал · бронза #120.
 */
export function fixedSwissTs64MatchNo(
  round: number,
  slot: number,
  withBronze = false,
): number {
  return fixedSwissTsLargeMatchNo(32, round, slot, withBronze);
}

/** Глобальный номер 128→64 (231/215 встреч). */
export function fixedSwissTs128MatchNo(
  round: number,
  slot: number,
  withBronze = false,
): number {
  return fixedSwissTsLargeMatchNo(64, round, slot, withBronze);
}

/**
 * 128→64 (247/248 встреч): R8 elim + колонки TS −4/−5/−6 (#193–208, #217–224, #225–232).
 * FIXED_SWISS_128R8_2_3_mesta — 247; FIXED_SWISS_128R8_1_3_mesto — 248.
 */
export function fixedSwissTs128R8ElimMatchNo(
  round: number,
  slot: number,
  withBronze = false,
): number {
  const half1 = 32;

  if (round === 1) return slot;

  if (round === 2) {
    if (slot <= half1) return half1 * 2 + slot;
    return slot + half1 * 2;
  }

  if (round === 3) {
    if (slot <= half1) return 161 - slot;
    if (slot <= 40) return 232 + (slot - 32);
    if (slot <= 52) return slot + 124;
    if (slot <= 64) return 257 - slot;
    if (slot <= 68) return slot + 96;
    if (slot === 69) return 217;
    if (slot === 70) return 218;
    if (slot === 71) return 223;
    if (slot === 72) return 224;
    if (slot <= 80) return slot + 152;
    if (slot <= 84) return 289 - slot;
    throw new Error(`R8 elim 128: R3 slot ${slot}`);
  }

  if (round === 4) return 193 - slot;

  if (round === 5) {
    if (slot <= 8) return 208 + slot;
    if (slot <= 12) return 210 + slot;
    return 228 + slot;
  }

  if (round === 6) return 244 + slot;

  if (round === 7) {
    if (!withBronze && slot === 2) {
      throw new Error("128R8_2_3: нет матча за 3–4");
    }
    return slot === 1 ? 247 : 248;
  }

  throw new Error(`R8 elim 128: R${round} slot ${slot}`);
}

/** Этап по номеру встречи (128→64 R8 elim). */
export function fixedSwissTs128R8ElimStageByMatchNo(no: number): string | null {
  if (no >= 1 && no <= 64) return "Первый тур";
  if (no >= 65 && no <= 96) return "Нижняя, тур 1";
  if (no >= 97 && no <= 128) return "Верхняя, тур 1";
  if (no >= 129 && no <= 160) return "Нижняя, тур 2";
  if (no >= 161 && no <= 176) return "Верхняя, тур 2";
  if (no >= 177 && no <= 192) return "Нижняя, тур 3";
  if (no >= 193 && no <= 208) return "Нижняя, тур 4";
  if (no >= 209 && no <= 216) return "Верхняя, тур 3";
  if (no >= 217 && no <= 224) return "Нижняя, тур 5";
  if (no >= 225 && no <= 232) return "Нижняя, тур 6";
  if (no >= 233 && no <= 240) return "1/8 финала";
  if (no >= 241 && no <= 244) return "1/4 финала";
  if (no === 245 || no === 246) return "Полуфинал";
  if (no === 247 || no === 248) return "Финал";
  return null;
}

/** Этап по номеру встречи (64→32). */
export function fixedSwissTs64StageByMatchNo(no: number): string | null {
  if (no >= 1 && no <= 32) return "Первый тур";
  if (no >= 33 && no <= 48) return "Нижняя, тур 1";
  if (no >= 49 && no <= 64) return "Верхняя, тур 1";
  if (no >= 65 && no <= 80) return "Нижняя, тур 2";
  if (no >= 81 && no <= 88) return "Верхняя, тур 2";
  if (no >= 89 && no <= 96) return "Нижняя, тур 3";
  if (no >= 97 && no <= 104) return "Нижняя, тур 4";
  if (no >= 105 && no <= 112) return "Верхняя, тур 3 · 1/8";
  if (no >= 113 && no <= 116) return "1/4 финала";
  if (no === 117 || no === 118) return "Полуфинал";
  if (no === 119 || no === 120) return "Финал";
  return null;
}

/** Этап по номеру встречи (32→16): 1/8 только #41–#44. */
export function fixedSwissTs32StageByMatchNo(no: number): string | null {
  if (no >= 41 && no <= 44) return "1/8 финала";
  if (no >= 45 && no <= 48) return "Нижняя, тур 3";
  if (no >= 49 && no <= 52) return "Нижняя, тур 4";
  return null;
}

export function isFixedSwissTs84BronzeMatchCount(matchCount: number): boolean {
  return matchCount === 14;
}

export function isFixedSwissTs84MatchCount(
  matchCount: number,
  maxRound?: number,
): boolean {
  if (matchCount !== 13) return false;
  if (maxRound === undefined) return true;
  return maxRound >= 4;
}

/** 32→16: 7 туров, 59 встреч (+1 бронза), нижняя тур 3–4 в R4. */
export function tsMaxRoundForGridSize(gridSize: 8 | 16 | 32 | 64 | 128): number {
  if (gridSize === 32 || gridSize === 64 || gridSize === 128) return 7;
  return tsMaxRound(tsHalf2FromGridSize(gridSize));
}

export function tsTotalMatchCountForGridSize(
  gridSize: 8 | 16 | 32 | 64 | 128,
  withBronze: boolean,
): number {
  if (gridSize === 32) return withBronze ? 60 : 59;
  if (gridSize === 64) return withBronze ? 120 : 119;
  if (gridSize === 128) return withBronze ? 232 : 231;
  return tsTotalMatchCount(tsHalf2FromGridSize(gridSize), withBronze);
}

/**
 * Эталон TS «N→N/2»: 16→8 (27/28), 32→16 (59/60), 64→32 (119/120), 128→64 (231/232).
 * Олимпийка: на 16 — с 1/4; на 32/64/128 — с 1/8, 1/4 в R5.
 */
export function buildFixedSwissTsTemplateForGridSize(
  gridSize: 8 | 16 | 32 | 64 | 128,
  withBronze = false,
): FixedSwissTemplate {
  if (gridSize === 128) {
    return buildFixedSwissTs128Template(withBronze);
  }
  if (gridSize === 64) {
    return buildFixedSwissTs64Template(withBronze);
  }
  if (gridSize === 32) {
    return buildFixedSwissTs32Template(withBronze);
  }

  const half2 = tsHalf2FromGridSize(gridSize);
  const half1 = half2 / 2;
  const maxRound = tsMaxRound(half2);
  const matches: BracketMatchInput[] = [];

  for (let round = 1; round <= 3; round++) {
    for (let slot = 1; slot <= half2; slot++) {
      matches.push({ round, slot, team1Id: null, team2Id: null });
    }
  }
  for (let round = 4; round <= maxRound; round++) {
    const count = tsPostR3SlotCount(half2, round);
    for (let slot = 1; slot <= count; slot++) {
      matches.push({ round, slot, team1Id: null, team2Id: null });
    }
  }
  if (withBronze) {
    matches.push({ round: maxRound, slot: 2, team1Id: null, team2Id: null });
  }

  const links: FixedSwissLink[] = [];

  for (let slot = 1; slot <= half2; slot++) {
    const toTeam = slotParityTeam(slot);
    links.push({
      fromRound: 1,
      fromSlot: slot,
      kind: "win",
      toRound: 2,
      toSlot: half1 + Math.ceil(slot / 2),
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

  for (let slot = 1; slot <= half1; slot++) {
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: slot,
      toTeam: 2,
    });
  }

  for (let slot = half1 + 1; slot <= half2; slot++) {
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "loss",
      toRound: 3,
      toSlot: 2 * half1 + 1 - slot,
      toTeam: 1,
    });
  }

  if (half1 >= 8) {
    // 32→16: верхняя R2 → 1/8 (#41–#44); слоты R3 13–16 — нижняя тур 4 (#49–#52).
    for (let k = 1; k <= half1 / 2; k++) {
      const slotA = half1 + 2 * k - 1;
      const slotB = half1 + 2 * k;
      const olympicSlot = half1 + k;
      links.push({
        fromRound: 2,
        fromSlot: slotA,
        kind: "win",
        toRound: 3,
        toSlot: olympicSlot,
        toTeam: 1,
      });
      links.push({
        fromRound: 2,
        fromSlot: slotB,
        kind: "win",
        toRound: 3,
        toSlot: olympicSlot,
        toTeam: 2,
      });
    }
    for (let k = 1; k <= half1 / 2; k++) {
      const crossA = 2 * k - 1;
      const crossB = 2 * k;
      const olympicSlot = half1 + half1 / 2 + k;
      links.push({
        fromRound: 3,
        fromSlot: crossA,
        kind: "win",
        toRound: 3,
        toSlot: olympicSlot,
        toTeam: 1,
      });
      links.push({
        fromRound: 3,
        fromSlot: crossB,
        kind: "win",
        toRound: 3,
        toSlot: olympicSlot,
        toTeam: 2,
      });
    }
  } else {
    for (let slot = half1 + 1; slot <= half2; slot++) {
      const k = slot - half1;
      links.push({
        fromRound: 2,
        fromSlot: slot,
        kind: "win",
        toRound: 3,
        toSlot: k + half1,
        toTeam: 1,
      });
    }

    const crossToQuarter = buildCrossToQuarterMap(half1);
    for (let slot = 1; slot <= half1; slot++) {
      links.push({
        fromRound: 3,
        fromSlot: slot,
        kind: "win",
        toRound: 3,
        toSlot: crossToQuarter[slot]!,
        toTeam: 2,
      });
    }
  }

  for (let slot = half1 + 1; slot <= half2; slot++) {
    const qIdx = slot - half1;
    links.push({
      fromRound: 3,
      fromSlot: slot,
      kind: "win",
      toRound: 4,
      toSlot: Math.ceil(qIdx / 2),
      toTeam: slotParityTeam(qIdx),
    });
  }

  for (let round = 4; round < maxRound; round++) {
    const count = tsPostR3SlotCount(half2, round);
    for (let slot = 1; slot <= count; slot++) {
      links.push({
        fromRound: round,
        fromSlot: slot,
        kind: "win",
        toRound: round + 1,
        toSlot: Math.ceil(slot / 2),
        toTeam: slotParityTeam(slot),
      });
    }
  }

  if (withBronze) {
    if (half1 < 4) {
      // 8→4: 1/4 (#11, #12) = «полуфинал» перед финалом; проигравшие → #14
      links.push({
        fromRound: 3,
        fromSlot: half1 + 1,
        kind: "loss",
        toRound: maxRound,
        toSlot: 2,
        toTeam: 1,
      });
      links.push({
        fromRound: 3,
        fromSlot: half1 + 2,
        kind: "loss",
        toRound: maxRound,
        toSlot: 2,
        toTeam: 2,
      });
    } else {
      const semiRound = maxRound - 1;
      links.push({
        fromRound: semiRound,
        fromSlot: 1,
        kind: "loss",
        toRound: maxRound,
        toSlot: 2,
        toTeam: 1,
      });
      links.push({
        fromRound: semiRound,
        fromSlot: 2,
        kind: "loss",
        toRound: maxRound,
        toSlot: 2,
        toTeam: 2,
      });
    }
  }

  return {
    gridSize,
    rounds: maxRound,
    matchesPerRound: half2,
    matches,
    links,
    variant: withBronze ? "ts168bronze" : "ts168",
  };
}

/** Устаревшая 32→16 (55/56 встреч, 6 туров, без нижней тур 3–4). */
export function buildFixedSwissTs32OutdatedTemplate(
  withBronze = false,
): FixedSwissTemplate {
  const gridSize = 32 as const;
  const half2 = 16;
  const half1 = 8;
  const maxRound = 6;
  const matches: BracketMatchInput[] = [];

  for (let round = 1; round <= 3; round++) {
    for (let slot = 1; slot <= half2; slot++) {
      matches.push({ round, slot, team1Id: null, team2Id: null });
    }
  }
  for (let round = 4; round <= maxRound; round++) {
    const count = tsPostR3SlotCount(half2, round);
    for (let slot = 1; slot <= count; slot++) {
      matches.push({ round, slot, team1Id: null, team2Id: null });
    }
  }
  if (withBronze) {
    matches.push({ round: maxRound, slot: 2, team1Id: null, team2Id: null });
  }

  const links: FixedSwissLink[] = [];

  for (let slot = 1; slot <= half2; slot++) {
    const toTeam = slotParityTeam(slot);
    links.push({
      fromRound: 1,
      fromSlot: slot,
      kind: "win",
      toRound: 2,
      toSlot: half1 + Math.ceil(slot / 2),
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

  for (let slot = 1; slot <= half1; slot++) {
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: slot,
      toTeam: 2,
    });
  }

  for (let slot = half1 + 1; slot <= half2; slot++) {
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "loss",
      toRound: 3,
      toSlot: 2 * half1 + 1 - slot,
      toTeam: 1,
    });
  }

  for (let k = 1; k <= half1 / 2; k++) {
    const slotA = half1 + 2 * k - 1;
    const slotB = half1 + 2 * k;
    const olympicSlot = half1 + k;
    links.push({
      fromRound: 2,
      fromSlot: slotA,
      kind: "win",
      toRound: 3,
      toSlot: olympicSlot,
      toTeam: 1,
    });
    links.push({
      fromRound: 2,
      fromSlot: slotB,
      kind: "win",
      toRound: 3,
      toSlot: olympicSlot,
      toTeam: 2,
    });
  }
  for (let k = 1; k <= half1 / 2; k++) {
    const crossA = 2 * k - 1;
    const crossB = 2 * k;
    const olympicSlot = half1 + half1 / 2 + k;
    links.push({
      fromRound: 3,
      fromSlot: crossA,
      kind: "win",
      toRound: 3,
      toSlot: olympicSlot,
      toTeam: 1,
    });
    links.push({
      fromRound: 3,
      fromSlot: crossB,
      kind: "win",
      toRound: 3,
      toSlot: olympicSlot,
      toTeam: 2,
    });
  }

  for (let slot = half1 + 1; slot <= half2; slot++) {
    const qIdx = slot - half1;
    links.push({
      fromRound: 3,
      fromSlot: slot,
      kind: "win",
      toRound: 4,
      toSlot: Math.ceil(qIdx / 2),
      toTeam: slotParityTeam(qIdx),
    });
  }

  for (let round = 4; round < maxRound; round++) {
    const count = tsPostR3SlotCount(half2, round);
    for (let slot = 1; slot <= count; slot++) {
      links.push({
        fromRound: round,
        fromSlot: slot,
        kind: "win",
        toRound: round + 1,
        toSlot: Math.ceil(slot / 2),
        toTeam: slotParityTeam(slot),
      });
    }
  }

  if (withBronze) {
    links.push({
      fromRound: maxRound - 1,
      fromSlot: 1,
      kind: "loss",
      toRound: maxRound,
      toSlot: 2,
      toTeam: 1,
    });
    links.push({
      fromRound: maxRound - 1,
      fromSlot: 2,
      kind: "loss",
      toRound: maxRound,
      toSlot: 2,
      toTeam: 2,
    });
  }

  return {
    gridSize,
    rounds: maxRound,
    matchesPerRound: half2,
    matches,
    links,
    variant: withBronze ? "ts3216bronze" : "ts3216",
  };
}

export function fixedSwissTsMatchNoForHalf2(
  round: number,
  slot: number,
  half2: number,
  withBronze = false,
): number {
  if (round === 1) return slot;
  if (round === 2) {
    const half1 = half2 / 2;
    if (slot <= half1) {
      // 32→16: нижняя R2 #17–#24; 16→8: #13–#16
      return half2 >= 16 ? half2 + slot : half2 + half1 + slot;
    }
    // 32→16: верхняя R2 #25–#32; 16→8: #9–#12
    return half2 >= 16 ? slot + half2 : slot + half1;
  }
  if (round === 3) return 2 * half2 + slot;

  let base = 3 * half2;
  for (let r = 4; r < round; r++) {
    base += tsPostR3SlotCount(half2, r);
  }
  const maxRound = tsMaxRound(half2);
  if (withBronze && round === maxRound && slot === 2) {
    return tsTotalMatchCount(half2, true);
  }
  return base + slot;
}

export function isFixedSwissTs64MatchCount(matchCount: number): boolean {
  return (
    matchCount === 111 ||
    matchCount === 114 ||
    matchCount === 115 ||
    matchCount === 119
  );
}

export function isFixedSwissTs64BronzeMatchCount(matchCount: number): boolean {
  return (
    matchCount === 112 || matchCount === 116 || matchCount === 120
  );
}

export function isFixedSwissTs128MatchCount(matchCount: number): boolean {
  return matchCount === 231 || matchCount === 219 || matchCount === 215 || matchCount === 247;
}

export function isFixedSwissTs128BronzeMatchCount(matchCount: number): boolean {
  return matchCount === 232 || matchCount === 220 || matchCount === 216 || matchCount === 248;
}

export function isFixedSwissTs32MatchCount(matchCount: number): boolean {
  return matchCount === 59;
}

export function isFixedSwissTs32BronzeMatchCount(matchCount: number): boolean {
  return matchCount === 60;
}

/** Устаревшие 32→16: 55/56 (6 туров), 63/64 (лишний 1/8 в R4). Не путать с 55/7 (R8_2_3_mesta). */
export function isOutdatedFixedSwiss32Bracket(
  matchCount: number,
  maxRound?: number,
): boolean {
  if (
    isFixedSwissTs32R8ElimAtEighthMatchCount(matchCount, maxRound) ||
    isFixedSwissTs32R8ElimAtEighthBronzeMatchCount(matchCount, maxRound)
  ) {
    return false;
  }
  if (
    isFixedSwissTs64R8ElimAtEighthMatchCount(matchCount, maxRound) ||
    isFixedSwissTs64R8ElimAtEighthBronzeMatchCount(matchCount, maxRound)
  ) {
    return false;
  }
  if (
    isFixedSwissTs128R8ElimAtEighthMatchCount(matchCount, maxRound) ||
    isFixedSwissTs128R8ElimAtEighthBronzeMatchCount(matchCount, maxRound)
  ) {
    return false;
  }
  return (
    matchCount === 55 ||
    matchCount === 56 ||
    matchCount === 63 ||
    matchCount === 64
  );
}

export function isFixedSwissTsScaledMatchCount(matchCount: number): boolean {
  return (
    matchCount === 13 ||
    matchCount === 14 ||
    matchCount === 27 ||
    matchCount === 28 ||
    matchCount === 59 ||
    matchCount === 60 ||
    matchCount === 111 ||
    matchCount === 112 ||
    matchCount === 114 ||
    matchCount === 115 ||
    matchCount === 119 ||
    matchCount === 120 ||
    matchCount === 215 ||
    matchCount === 216 ||
    matchCount === 219 ||
    matchCount === 220 ||
    matchCount === 231 ||
    matchCount === 232 ||
    isOutdatedFixedSwiss32Bracket(matchCount)
  );
}

export function half2FromTsMatchCount(matchCount: number): number {
  if (matchCount === 13 || matchCount === 14) return 4;
  if (matchCount === 27 || matchCount === 28) return 8;
  if (
    matchCount === 59 ||
    matchCount === 60 ||
    matchCount === 55 ||
    matchCount === 56 ||
    matchCount === 63 ||
    matchCount === 64
  ) {
    return 16;
  }
  if (
    matchCount === 111 ||
    matchCount === 112 ||
    matchCount === 114 ||
    matchCount === 115 ||
    matchCount === 119 ||
    matchCount === 120
  ) {
    return 32;
  }
  if (
    matchCount === 215 ||
    matchCount === 216 ||
    matchCount === 219 ||
    matchCount === 220 ||
    matchCount === 231 ||
    matchCount === 232 ||
    matchCount === 247 ||
    matchCount === 248
  ) {
    return 64;
  }
  if (matchCount === 455 || matchCount === 456 || matchCount === 256 || matchCount === 352 || matchCount === 448 || matchCount === 464 || matchCount === 480 || matchCount === 488 || matchCount === 496 || matchCount === 479) {
    return 128;
  }
  throw new Error(`Не TS-сетка: ${matchCount} встреч`);
}

export function fixedSwissTsBronzeMatchNoForHalf2(
  round: number,
  slot: number,
  half2: number,
): number {
  const maxRound = tsMaxRound(half2);
  if (round === maxRound && slot === 2) {
    return tsTotalMatchCount(half2, true);
  }
  return fixedSwissTsMatchNoForHalf2(round, slot, half2, false);
}
