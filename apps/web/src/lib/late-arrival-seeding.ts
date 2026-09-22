/**
 * Перестановка семян с учётом опоздавших при генерации olympic / fixed swiss.
 *
 * Вход: команды уже отсортированы по рейтингу (сильный первый).
 * Выход: новый порядок для buildOlympicBracket / assignSeeds.
 *
 * - 0 late → без изменений
 * - чётное число late → пары late–late в R1 (complementary seeds), остальное — on-time по рейтингу
 * - нечёт / один → late–late пары + «лишний» на слабый посев (seed N → vs #1 при степени 2)
 */

export type LateSeedable = {
  id: string;
  isLate?: boolean | null;
};

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Пары семян, которые встречаются в R1: seed s ↔ size+1−s. */
function r1ComplementPairs(n: number): [number, number][] {
  const size = nextPowerOfTwo(n);
  const pairs: [number, number][] = [];
  for (let s = 1; s <= size / 2; s++) {
    const other = size + 1 - s;
    if (s <= n && other <= n && s !== other) {
      pairs.push([s, other]);
    }
  }
  // Сначала «средние» пары (8↔9 при 16), чтобы топ оставался для пришедших вовремя
  pairs.sort(
    (a, b) => Math.min(b[0], b[1]) - Math.min(a[0], a[1]),
  );
  return pairs;
}

export function applyLateArrivalSeeding<T extends LateSeedable>(
  seededOrderedByRating: T[],
): T[] {
  const n = seededOrderedByRating.length;
  if (n === 0) return seededOrderedByRating;

  const late = seededOrderedByRating.filter((t) => Boolean(t.isLate));
  if (late.length === 0) return seededOrderedByRating;

  const onTime = seededOrderedByRating.filter((t) => !t.isLate);

  const latePairs: [T, T][] = [];
  let leftover: T | undefined;
  for (let i = 0; i < late.length; ) {
    if (i + 1 < late.length) {
      latePairs.push([late[i]!, late[i + 1]!]);
      i += 2;
    } else {
      leftover = late[i];
      i += 1;
    }
  }

  const seeds: (T | null)[] = Array.from({ length: n }, () => null);
  const used = new Set<number>();

  // Один «лишний» опоздавший — слабый посев (высокий номер)
  if (leftover) {
    seeds[n - 1] = leftover;
    used.add(n);
  }

  const complementPairs = r1ComplementPairs(n);
  let pairIdx = 0;
  for (const [stronger, weaker] of latePairs) {
    while (pairIdx < complementPairs.length) {
      const [s1, s2] = complementPairs[pairIdx]!;
      pairIdx += 1;
      if (used.has(s1) || used.has(s2)) continue;
      const lo = Math.min(s1, s2);
      const hi = Math.max(s1, s2);
      // Выше по рейтингу — меньший номер семени (выше в карточке после bracketSeedOrder)
      seeds[lo - 1] = stronger;
      seeds[hi - 1] = weaker;
      used.add(s1);
      used.add(s2);
      break;
    }
  }

  let onTimeIdx = 0;
  for (let seedNum = 1; seedNum <= n; seedNum++) {
    if (seeds[seedNum - 1] !== null) continue;
    const next = onTime[onTimeIdx++];
    if (!next) {
      throw new Error("applyLateArrivalSeeding: не хватает участников для посева");
    }
    seeds[seedNum - 1] = next;
  }

  if (onTimeIdx !== onTime.length) {
    throw new Error("applyLateArrivalSeeding: остались непристроенные участники");
  }

  return seeds as T[];
}
