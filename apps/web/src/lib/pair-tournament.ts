export interface TeamPlayer {
  id: string;
  firstName: string;
  lastName: string;
  rating: number;
}

export interface TeamWithPlayers {
  id: string;
  name?: string | null;
  player1: TeamPlayer;
  player2?: TeamPlayer | null;
}

export function isExcelRef64Format(format: string): boolean {
  return format === "EXCEL_REF_64";
}

/** FIXED_SWISS_* и EXCEL_REF_64 — одна топология/переходы в БД. */
export function usesFixedSwissGridEngine(format: string): boolean {
  return isFixedSwissFormat(format) || isExcelRef64Format(format);
}

export function isFixedSwiss64BronzeFormat(format: string): boolean {
  return (
    format === "FIXED_SWISS_64_BRONZE" || format === "FIXED_PAIR_SWISS_64_BRONZE"
  );
}

export function isFixedSwiss128Format(format: string): boolean {
  return (
    format === "FIXED_SWISS_128R8_2_3_mesta" ||
    format === "FIXED_SWISS_128R8_1_3_mesto" ||
    format === "FIXED_SWISS_256R8_1_3_mesto"
  );
}

export function isFixedSwiss64Format(format: string): boolean {
  return (
    format === "FIXED_SWISS_64R8_2_3_mesta" ||
    format === "FIXED_SWISS_64R8_1_3_mesto" ||
    format === "FIXED_SWISS_64" ||
    format === "FIXED_PAIR_SWISS_64" ||
    isFixedSwiss64BronzeFormat(format)
  );
}

export function isFixedSwiss32BronzeFormat(format: string): boolean {
  return (
    format === "FIXED_SWISS_32_BRONZE" ||
    format === "FIXED_SWISS_32R4_1_3_mesto" ||
    format === "FIXED_SWISS_32R8_1_3_mesto" ||
    format === "FIXED_SWISS_32R8_BRONZE" ||
    format === "FIXED_PAIR_SWISS_32_BRONZE"
  );
}

export function isFixedSwiss32Format(format: string): boolean {
  return (
    format === "FIXED_SWISS_32" ||
    format === "FIXED_SWISS_32R4_2_3_mesta" ||
    format === "FIXED_SWISS_32R8" ||
    format === "FIXED_SWISS_32R8_2_3_mesta" ||
    format === "FIXED_PAIR_SWISS_32" ||
    isFixedSwiss32BronzeFormat(format)
  );
}

export function isFixedSwiss16BronzeFormat(format: string): boolean {
  return (
    format === "FIXED_SWISS_16_BRONZE" ||
    format === "FIXED_SWISS_16R4_1_3_mesto" ||
    format === "FIXED_SWISS_16R2_1_3_mesto" ||
    format === "FIXED_PAIR_SWISS_16_BRONZE" ||
    format === "FIXED_PAIR_SWISS_16R4_1_3_mesto" ||
    format === "FIXED_PAIR_SWISS_16R2_1_3_mesto"
  );
}

export function isFixedSwiss8BronzeFormat(format: string): boolean {
  return (
    format === "FIXED_SWISS_8R4_1_3_mesto" ||
    format === "FIXED_PAIR_SWISS_8R4_1_3_mesto"
  );
}

export function isFixedSwiss8Format(format: string): boolean {
  return isFixedSwiss8BronzeFormat(format);
}

export function isFixedSwiss16Format(format: string): boolean {
  return (
    format === "FIXED_SWISS" ||
    format === "FIXED_SWISS_16R4_2_3_mesta" ||
    format === "FIXED_PAIR_SWISS" ||
    format === "FIXED_PAIR_SWISS_16R4_2_3_mesto" ||
    isFixedSwiss16BronzeFormat(format)
  );
}

export function isSwissFormat(format: string): boolean {
  return (
    format === "SWISS" ||
    format === "PAIR_SWISS" ||
    isFixedSwiss8Format(format) ||
    isFixedSwiss16Format(format) ||
    isFixedSwiss32Format(format) ||
    isFixedSwiss64Format(format) ||
    isFixedSwiss128Format(format) ||
    isExcelRef64Format(format)
  );
}

export function isFixedSwissFormat(format: string): boolean {
  return (
    isFixedSwiss8Format(format) ||
    isFixedSwiss16Format(format) ||
    isFixedSwiss32Format(format) ||
    isFixedSwiss64Format(format) ||
    isFixedSwiss128Format(format)
  );
}

export function isDynamicSwissFormat(format: string): boolean {
  return format === "SWISS" || format === "PAIR_SWISS";
}

export function isSoloFormat(format: string): boolean {
  return (
    format === "SWISS" ||
    format === "FIXED_SWISS" ||
    format === "FIXED_SWISS_8R4_1_3_mesto" ||
    format === "FIXED_SWISS_16_BRONZE" ||
    format === "FIXED_SWISS_16R4_1_3_mesto" ||
    format === "FIXED_SWISS_16R2_1_3_mesto" ||
    format === "FIXED_SWISS_16R4_2_3_mesta" ||
    format === "FIXED_SWISS_32" ||
    format === "FIXED_SWISS_32_BRONZE" ||
    format === "FIXED_SWISS_32R4_2_3_mesta" ||
    format === "FIXED_SWISS_32R4_1_3_mesto" ||
    format === "FIXED_SWISS_32R8" ||
    format === "FIXED_SWISS_32R8_2_3_mesta" ||
    format === "FIXED_SWISS_32R8_1_3_mesto" ||
    format === "FIXED_SWISS_32R8_BRONZE" ||
    format === "FIXED_SWISS_64R8_2_3_mesta" ||
    format === "FIXED_SWISS_64R8_1_3_mesto" ||
    format === "FIXED_SWISS_128R8_2_3_mesta" ||
    format === "FIXED_SWISS_128R8_1_3_mesto" ||
    format === "FIXED_SWISS_256R8_1_3_mesto" ||
    format === "FIXED_SWISS_64" ||
    format === "FIXED_SWISS_64_BRONZE" ||
    format === "EXCEL_REF_64" ||
    format === "OLYMPIC" ||
    format === "OLYMPIC_1L_BRONZE"
  );
}

export function isSwissPairFormat(format: string): boolean {
  return (
    format === "PAIR_SWISS" ||
    format === "FIXED_PAIR_SWISS" ||
    format === "FIXED_PAIR_SWISS_8R4_1_3_mesto" ||
    format === "FIXED_PAIR_SWISS_16_BRONZE" ||
    format === "FIXED_PAIR_SWISS_16R4_1_3_mesto" ||
    format === "FIXED_PAIR_SWISS_16R2_1_3_mesto" ||
    format === "FIXED_PAIR_SWISS_16R4_2_3_mesto"
  );
}

export function isOlympicFormat(format: string): boolean {
  return (
    format === "OLYMPIC" ||
    format === "OLYMPIC_1L_BRONZE" ||
    format === "PAIR_OLYMPIC" ||
    format === "PAIR_OLYMPIC_1L_BRONZE"
  );
}

/** Олимпийская сетка с отдельным матчем за 3–4 место (проигравшие полуфиналов). */
export function isOlympicBronzeFormat(format: string): boolean {
  return format === "OLYMPIC_1L_BRONZE" || format === "PAIR_OLYMPIC_1L_BRONZE";
}

export function isOlympicPairFormat(format: string): boolean {
  return format === "PAIR_OLYMPIC" || format === "PAIR_OLYMPIC_1L_BRONZE";
}

export function isPairFormat(format: string): boolean {
  return (
    isOlympicPairFormat(format) ||
    isSwissPairFormat(format)
  );
}

export function normalizePlayerPair(id1: string, id2: string): [string, string] {
  if (id1 === id2) {
    throw new Error("Игрок не может быть партнёром сам себе");
  }
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

export function teamRating(team: TeamWithPlayers): number {
  if (!team.player2) return team.player1.rating;
  return team.player1.rating + team.player2.rating;
}

export function teamLabel(team: TeamWithPlayers): string {
  if (team.name?.trim()) return team.name.trim();
  if (!team.player2) {
    return `${team.player1.lastName} ${team.player1.firstName}`;
  }
  return `${team.player1.lastName} / ${team.player2.lastName}`;
}

export function playerShortName(player: TeamPlayer): string {
  return `${player.lastName} ${player.firstName}`;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Standard bracket seed order for size N (power of 2). */
function bracketSeedOrder(size: number): number[] {
  if (size === 1) return [1];
  const half = bracketSeedOrder(size / 2);
  const result: number[] = [];
  for (const seed of half) {
    result.push(seed);
    result.push(size + 1 - seed);
  }
  return result;
}

export interface BracketMatchInput {
  round: number;
  slot: number;
  team1Id: string | null;
  team2Id: string | null;
}

export interface SwissTeamInput {
  teamId: string;
  rating: number;
  points: number;
  opponents: string[];
}

export function buildSwissPairings(
  teams: SwissTeamInput[],
  round: number,
): BracketMatchInput[] {
  const sorted = [...teams].sort((a, b) =>
    round === 1
      ? b.rating - a.rating
      : b.points - a.points || b.rating - a.rating,
  );

  const paired = new Set<string>();
  const result: BracketMatchInput[] = [];
  let slot = 1;

  for (let i = 0; i < sorted.length; i++) {
    const team1 = sorted[i]!;
    if (paired.has(team1.teamId)) continue;

    let team2: SwissTeamInput | undefined;
    for (let j = i + 1; j < sorted.length; j++) {
      const candidate = sorted[j]!;
      if (paired.has(candidate.teamId)) continue;
      if (!team1.opponents.includes(candidate.teamId)) {
        team2 = candidate;
        break;
      }
    }
    if (!team2) {
      for (let j = i + 1; j < sorted.length; j++) {
        const candidate = sorted[j]!;
        if (!paired.has(candidate.teamId)) {
          team2 = candidate;
          break;
        }
      }
    }

    if (team2) {
      result.push({
        round,
        slot: slot++,
        team1Id: team1.teamId,
        team2Id: team2.teamId,
      });
      paired.add(team1.teamId);
      paired.add(team2.teamId);
    } else {
      result.push({
        round,
        slot: slot++,
        team1Id: team1.teamId,
        team2Id: null,
      });
      paired.add(team1.teamId);
    }
  }

  return result;
}

export function buildOlympicBracket(
  seededTeamIds: string[],
  bracketSize?: number,
): BracketMatchInput[] {
  const n = seededTeamIds.length;
  const size = bracketSize ?? nextPowerOfTwo(n);
  if (size < n) {
    throw new Error(
      `Размер сетки ${size} меньше числа участников ${n}`,
    );
  }
  const order = bracketSeedOrder(size);
  const slots: (string | null)[] = order.map((seed) =>
    seed <= n ? seededTeamIds[seed - 1]! : null,
  );

  const matches: BracketMatchInput[] = [];
  const rounds = Math.log2(size);

  for (let i = 0; i < size / 2; i++) {
    matches.push({
      round: 1,
      slot: i + 1,
      team1Id: slots[i * 2] ?? null,
      team2Id: slots[i * 2 + 1] ?? null,
    });
  }

  for (let r = 2; r <= rounds; r++) {
    const count = size / 2 ** r;
    for (let s = 1; s <= count; s++) {
      matches.push({ round: r, slot: s, team1Id: null, team2Id: null });
    }
  }

  return matches;
}

/** Слот матча за 3–4 место в финальном туре (рядом с финалом, slot 1). */
export const OLYMPIC_BRONZE_MATCH_SLOT = 2;

/**
 * Олимпийская сетка + матч за 3–4 (тот же тур, что финал, слот 2).
 * Нужно минимум 4 участника (полуфиналы).
 */
export function buildOlympicBracketWithBronze(
  seededTeamIds: string[],
): BracketMatchInput[] {
  const matches = buildOlympicBracket(seededTeamIds);
  const size = nextPowerOfTwo(seededTeamIds.length);
  const rounds = Math.log2(size);
  if (rounds < 2) return matches;

  matches.push({
    round: rounds,
    slot: OLYMPIC_BRONZE_MATCH_SLOT,
    team1Id: null,
    team2Id: null,
  });
  return matches;
}

export function getOlympicBronzeMatch(
  matches: Array<{ round: number; slot: number }>,
): { round: number; slot: number } | null {
  if (matches.length === 0) return null;
  const maxRound = Math.max(...matches.map((m) => m.round));
  const bronze = matches.find(
    (m) => m.round === maxRound && m.slot === OLYMPIC_BRONZE_MATCH_SLOT,
  );
  return bronze
    ? { round: bronze.round, slot: bronze.slot }
    : null;
}

export function getNextMatchSlot(
  round: number,
  slot: number,
): { round: number; slot: number; teamSlot: 1 | 2 } {
  return {
    round: round + 1,
    slot: Math.ceil(slot / 2),
    teamSlot: slot % 2 === 1 ? 1 : 2,
  };
}
