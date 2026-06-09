import type { BracketMatchInput } from "@/lib/pair-tournament";
import type { FixedSwissLink, FixedSwissTemplate } from "@/lib/fixed-swiss-grid-types";

function slotParityTeam(slot: number): 1 | 2 {
  return slot % 2 === 1 ? 1 : 2;
}

/** Куда крест (слоты 1…half1) подставляет team2 в верхнюю ветку (слоты half1+1…2×half1). */
export function buildCrossToQuarterMap(half1: number): Record<number, number> {
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

/** 64→32 эталон (119/120 встреч; legacy 115/116): см. docs/BRACKET_REFERENCE_64_32.md */
function buildFixedSwissTs64Template(withBronze = false): FixedSwissTemplate {
  const gridSize = 64 as const;
  const half2 = 32;
  const half1 = 16;
  const r3ExtraSlots = 4;
  const maxRound = 7;
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

  // Нижняя тур 1: #33–#40 → крест #73–#80; #41–#44 → мост #72–#69; #45–#46 → #85–#86; #47–#48 → #66–#65.
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
  for (let slot = half1 / 2 + 1; slot <= half1; slot++) {
    let toSlot: number;
    if (slot <= half1 / 2 + half1 / 4) {
      toSlot = slot;
    } else if (slot <= half1 - 2) {
      toSlot = slot + 8;
    } else {
      toSlot = slot;
    }
    links.push({
      fromRound: 2,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot,
      toTeam: 2,
    });
  }

  // Верхняя тур 1: проигравшие #49→#65, #50→#66, … #64→#80.
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
    const upperTour2Slot = k <= half1 / 4 ? half2 + k : 16 + k;
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

  // #72+#71→#92 … #66+#65→#89 (R3 9–16 → R4 5–8).
  for (let k = 1; k <= half1 / 8 + 2; k++) {
    const bridgeA = 8 + 2 * k - 1;
    const bridgeB = 8 + 2 * k;
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
  for (let slot = 21; slot <= 24; slot++) {
    const target = fixedSwissTs64OlympicToQuarterTarget(slot);
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

  for (let slot = 25; slot <= half2 + r3ExtraSlots; slot++) {
    const target = fixedSwissTs64OlympicToQuarterTarget(slot);
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

  // Проигравшие #81–#88 → нижняя тур 4: #81/#85→#102, #82/#86→#101, #83/#87→#100, #84/#88→#99.
  const upperTour2LoserToLowerTour4: Record<
    number,
    { toSlot: number; toTeam: 1 | 2 }
  > = {
    33: { toSlot: 27, toTeam: 1 },
    34: { toSlot: 28, toTeam: 1 },
    35: { toSlot: 29, toTeam: 1 },
    36: { toSlot: 30, toTeam: 1 },
    21: { toSlot: 27, toTeam: 2 },
    22: { toSlot: 28, toTeam: 2 },
    23: { toSlot: 29, toTeam: 2 },
    24: { toSlot: 30, toTeam: 2 },
  };
  for (const [fromSlot, target] of Object.entries(upperTour2LoserToLowerTour4)) {
    links.push({
      fromRound: 3,
      fromSlot: Number(fromSlot),
      kind: "loss",
      toRound: 3,
      toSlot: target.toSlot,
      toTeam: target.toTeam,
    });
  }

  links.push({
    fromRound: 5,
    fromSlot: 1,
    kind: "win",
    toRound: 3,
    toSlot: 17,
    toTeam: 1,
  });
  links.push({
    fromRound: 5,
    fromSlot: 2,
    kind: "win",
    toRound: 3,
    toSlot: 17,
    toTeam: 2,
  });
  links.push({
    fromRound: 5,
    fromSlot: 3,
    kind: "win",
    toRound: 3,
    toSlot: 18,
    toTeam: 1,
  });
  links.push({
    fromRound: 5,
    fromSlot: 4,
    kind: "win",
    toRound: 3,
    toSlot: 18,
    toTeam: 2,
  });
  links.push({
    fromRound: 5,
    fromSlot: 5,
    kind: "win",
    toRound: 3,
    toSlot: 19,
    toTeam: 1,
  });
  links.push({
    fromRound: 5,
    fromSlot: 6,
    kind: "win",
    toRound: 3,
    toSlot: 19,
    toTeam: 2,
  });
  links.push({
    fromRound: 5,
    fromSlot: 7,
    kind: "win",
    toRound: 3,
    toSlot: 20,
    toTeam: 1,
  });
  links.push({
    fromRound: 5,
    fromSlot: 8,
    kind: "win",
    toRound: 3,
    toSlot: 20,
    toTeam: 2,
  });

  for (let slot = 1; slot <= half1 / 4; slot++) {
    links.push({
      fromRound: 4,
      fromSlot: slot,
      kind: "win",
      toRound: 3,
      toSlot: half1 + half1 / 2 + slot,
      toTeam: 1,
    });
  }
  // Нижняя тур 3 → тур 4: #92→#100 … #89→#97 (R4 5–8 → R3 29–32).
  const lowerTour4Start = half1 + half1 / 2 + 1;
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

  links.push({ fromRound: 3, fromSlot: 17, kind: "win", toRound: 6, toSlot: 1, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 18, kind: "win", toRound: 6, toSlot: 1, toTeam: 2 });
  links.push({ fromRound: 3, fromSlot: 19, kind: "win", toRound: 6, toSlot: 2, toTeam: 1 });
  links.push({ fromRound: 3, fromSlot: 20, kind: "win", toRound: 6, toSlot: 2, toTeam: 2 });
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
    variant: withBronze ? "ts6432bronze" : "ts6432",
  };
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
export function fixedSwissTs64OlympicToQuarterTarget(
  r3Slot: number,
): { toRound: number; toSlot: number; toTeam: 1 | 2 } | null {
  const upperToR5: Record<number, { toSlot: number; toTeam: 1 | 2 }> = {
    21: { toSlot: 5, toTeam: 1 },
    22: { toSlot: 6, toTeam: 1 },
    23: { toSlot: 7, toTeam: 1 },
    24: { toSlot: 8, toTeam: 1 },
    33: { toSlot: 1, toTeam: 1 },
    34: { toSlot: 2, toTeam: 1 },
    35: { toSlot: 3, toTeam: 1 },
    36: { toSlot: 4, toTeam: 1 },
  };
  /** Нижняя тур 4 → верхняя тур 3 · 1/8 (team2): #104→#109 … #97→#108. */
  const lowerToR5: Record<number, { toSlot: number; toTeam: 1 | 2 }> = {
    25: { toSlot: 5, toTeam: 2 },
    26: { toSlot: 6, toTeam: 2 },
    27: { toSlot: 7, toTeam: 2 },
    28: { toSlot: 8, toTeam: 2 },
    29: { toSlot: 1, toTeam: 2 },
    30: { toSlot: 2, toTeam: 2 },
    31: { toSlot: 3, toTeam: 2 },
    32: { toSlot: 4, toTeam: 2 },
  };
  if (upperToR5[r3Slot]) {
    return { toRound: 5, ...upperToR5[r3Slot]! };
  }
  if (lowerToR5[r3Slot]) {
    return { toRound: 5, ...lowerToR5[r3Slot]! };
  }
  return null;
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
  const half2 = 32;
  const half1 = 16;
  if (round === 1) return slot;
  if (round === 2) {
    if (slot <= half1) return half2 + slot;
    return slot + half2;
  }
  if (round === 3) {
    if (slot <= half1) return 81 - slot;
    if (slot <= 20) return 112 + (slot - 16);
    if (slot <= 24) return 64 + slot;
    if (slot <= half2) return 97 + (half2 - slot);
    if (slot <= half2 + 4) return 48 + slot;
  }
  if (round === 4) return 97 - slot;
  if (round === 5) return 104 + slot;
  if (round === 6) return 116 + slot;
  if (withBronze && round === 7 && slot === 2) return 120;
  if (round === 7) return 119;
  throw new Error(`Некорректный слот TS 64-32: тур ${round}, слот ${slot}`);
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

/** 32→16: 7 туров, 59 встреч (+1 бронза), нижняя тур 3–4 в R4. */
export function tsMaxRoundForGridSize(gridSize: 16 | 32 | 64): number {
  if (gridSize === 32 || gridSize === 64) return 7;
  return tsMaxRound(tsHalf2FromGridSize(gridSize));
}

export function tsTotalMatchCountForGridSize(
  gridSize: 16 | 32 | 64,
  withBronze: boolean,
): number {
  if (gridSize === 32) return withBronze ? 60 : 59;
  if (gridSize === 64) return withBronze ? 120 : 119;
  return tsTotalMatchCount(tsHalf2FromGridSize(gridSize), withBronze);
}

/**
 * Эталон TS «N→N/2»: 16→8 (27/28), 32→16 (59/60), 64→32 (111/112).
 * Олимпийка: на 16 — с 1/4; на 32/64 — с 1/8, 1/4 в R5.
 */
export function buildFixedSwissTsTemplateForGridSize(
  gridSize: 16 | 32 | 64,
  withBronze = false,
): FixedSwissTemplate {
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
  return (
    matchCount === 55 ||
    matchCount === 56 ||
    matchCount === 63 ||
    matchCount === 64
  );
}

export function isFixedSwissTsScaledMatchCount(matchCount: number): boolean {
  return (
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
    isOutdatedFixedSwiss32Bracket(matchCount)
  );
}

export function half2FromTsMatchCount(matchCount: number): number {
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
