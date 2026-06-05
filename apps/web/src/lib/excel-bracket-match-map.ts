import type { BracketMatchView } from "@/lib/bracket-view";
import { fixedSwissMatchNo } from "@/lib/fixed-swiss-grid";

export function mapBracketMatchesByExcelNo(
  matches: BracketMatchView[],
): Map<number, BracketMatchView> {
  if (matches.length === 0) return new Map();
  const maxRound = matches.reduce((max, m) => Math.max(max, m.round), 0);
  const matchCount = matches.length;
  const byNo = new Map<number, BracketMatchView>();
  for (const m of matches) {
    const no = fixedSwissMatchNo(m.round, m.slot, matchCount, maxRound);
    byNo.set(no, m);
  }
  return byNo;
}
