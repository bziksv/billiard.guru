import type { BracketMatchInput } from "@/lib/pair-tournament";

export type FixedSwissLink = {
  fromRound: number;
  fromSlot: number;
  kind: "win" | "loss";
  toRound: number;
  toSlot: number;
  toTeam: 1 | 2;
};

export type FixedSwissTemplate = {
  gridSize: number;
  rounds: number;
  matchesPerRound: number;
  matches: BracketMatchInput[];
  links: FixedSwissLink[];
};

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Фикс. швейцарская сетка: все туры и переходы победитель/проигравший заданы заранее. */
export function buildFixedSwissTemplate(participantCount: number): FixedSwissTemplate {
  const gridSize = nextPowerOfTwo(participantCount);
  if (gridSize < 4) {
    throw new Error("Фиксированная швейцарская сетка: минимум 4 участника");
  }
  if (gridSize > 64) {
    throw new Error("Фиксированная швейцарская сетка: максимум 64 участника");
  }

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
      const toTeam: 1 | 2 = slot % 2 === 1 ? 1 : 2;
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

  return { gridSize, rounds, matchesPerRound, matches, links };
}

export function inferFixedSwissGridSize(matchCount: number): number {
  for (let size = 4; size <= 64; size *= 2) {
    const rounds = Math.log2(size) + 1;
    if (size / 2 * rounds === matchCount) return size;
  }
  throw new Error("Не удалось определить размер фиксированной сетки");
}

export function getFixedSwissLinksForGrid(gridSize: number): FixedSwissLink[] {
  return buildFixedSwissTemplate(gridSize).links;
}

export function findFixedSwissLink(
  links: FixedSwissLink[],
  round: number,
  slot: number,
  kind: "win" | "loss",
): FixedSwissLink | undefined {
  return links.find(
    (link) =>
      link.fromRound === round && link.fromSlot === slot && link.kind === kind,
  );
}
