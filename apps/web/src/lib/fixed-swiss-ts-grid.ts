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

  links.push({ fromRound: 4, fromSlot: 1, kind: "win", toRound: 3, toSlot: 13, toTeam: 1 });
  links.push({ fromRound: 4, fromSlot: 2, kind: "win", toRound: 3, toSlot: 14, toTeam: 1 });
  links.push({ fromRound: 4, fromSlot: 3, kind: "win", toRound: 6, toSlot: 2, toTeam: 2 });
  links.push({ fromRound: 4, fromSlot: 4, kind: "win", toRound: 6, toSlot: 1, toTeam: 2 });

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

/** 1/8 + нижняя тур 4 → 1/4: по одному входу в #53–#56 (LLB). */
export function fixedSwissTs32OlympicToQuarterTarget(
  r3Slot: number,
): { toSlot: number; toTeam: 1 | 2 } | null {
  const map: Record<number, { toSlot: number; toTeam: 1 | 2 }> = {
    9: { toSlot: 1, toTeam: 1 },
    10: { toSlot: 2, toTeam: 1 },
    11: { toSlot: 3, toTeam: 1 },
    12: { toSlot: 4, toTeam: 1 },
    13: { toSlot: 3, toTeam: 2 },
    14: { toSlot: 4, toTeam: 2 },
    15: { toSlot: 1, toTeam: 2 },
    16: { toSlot: 2, toTeam: 2 },
  };
  return map[r3Slot] ?? null;
}

/** Этап по номеру встречи (32→16): 1/8 только #41–#44. */
export function fixedSwissTs32StageByMatchNo(no: number): string | null {
  if (no >= 41 && no <= 44) return "1/8 финала";
  if (no >= 45 && no <= 48) return "Нижняя, тур 3";
  if (no >= 49 && no <= 52) return "Нижняя, тур 4";
  return null;
}

/** 32→16: 7 туров, 59 встреч (+1 бронза), нижняя тур 3–4 в R4. */
export function tsMaxRoundForGridSize(gridSize: 16 | 32): number {
  if (gridSize === 32) return 7;
  return tsMaxRound(tsHalf2FromGridSize(gridSize));
}

export function tsTotalMatchCountForGridSize(
  gridSize: 16 | 32,
  withBronze: boolean,
): number {
  if (gridSize === 32) return withBronze ? 60 : 59;
  return tsTotalMatchCount(tsHalf2FromGridSize(gridSize), withBronze);
}

/**
 * Эталон TS «N→N/2»: 16→8 (27/28) и 32→16 (59/60).
 * Олимпийка: на 16 — с 1/4 (слоты R3 5–8); на 32 — с 1/8 (слоты R3 9–16), 1/4 в R5.
 */
export function buildFixedSwissTsTemplateForGridSize(
  gridSize: 16 | 32,
  withBronze = false,
): FixedSwissTemplate {
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

export function isFixedSwissTs32MatchCount(matchCount: number): boolean {
  return matchCount === 59;
}

export function isFixedSwissTs32BronzeMatchCount(matchCount: number): boolean {
  return matchCount === 60;
}

/** Устаревшие 32→16: 55/56 (без нижней тур 3–4), 63/64 (лишний 1/8 в R4). */
export function isOutdatedFixedSwiss32Bracket(matchCount: number): boolean {
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
