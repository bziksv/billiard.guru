export interface TeamPlayer {
  firstName: string;
  lastName: string;
  rating: number;
}

export interface TeamWithPlayers {
  id: string;
  name?: string | null;
  player1: TeamPlayer;
  player2: TeamPlayer;
}

export function isSwissPairFormat(format: string): boolean {
  return format === "PAIR_SWISS";
}

export function isOlympicPairFormat(format: string): boolean {
  return format === "PAIR_OLYMPIC";
}

export function isPairFormat(format: string): boolean {
  return isOlympicPairFormat(format) || isSwissPairFormat(format);
}

export function normalizePlayerPair(id1: string, id2: string): [string, string] {
  if (id1 === id2) {
    throw new Error("Игрок не может быть партнёром сам себе");
  }
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

export function teamRating(team: TeamWithPlayers): number {
  return team.player1.rating + team.player2.rating;
}

export function teamLabel(team: TeamWithPlayers): string {
  if (team.name?.trim()) return team.name.trim();
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

export function buildOlympicBracket(seededTeamIds: string[]): BracketMatchInput[] {
  const n = seededTeamIds.length;
  const size = nextPowerOfTwo(n);
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
