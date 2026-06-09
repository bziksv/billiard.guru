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
  /** TS «16-8»: ts168 = 27 встреч; ts168bronze = 28 (+ матч за 3–4); ts3216 = 55; ts3216bronze = 56 */
  variant?:
    | "ts168"
    | "ts168bronze"
    | "ts3216"
    | "ts3216bronze"
    | "ts3216r8elim"
    | "ts3216r8elimbronze"
    | "ts6432"
    | "ts6432bronze"
    | "ts168legacy29"
    | "168legacy"
    | "classic";
};

export function findFixedSwissLink(
  links: FixedSwissLink[],
  fromRound: number,
  fromSlot: number,
  kind: "win" | "loss",
): FixedSwissLink | undefined {
  return links.find(
    (l) =>
      l.fromRound === fromRound &&
      l.fromSlot === fromSlot &&
      l.kind === kind,
  );
}
