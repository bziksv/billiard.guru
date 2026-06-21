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
    | "ts168r2elim"
    | "ts168r2elimbronze"
    | "ts3216"
    | "ts3216bronze"
    | "ts3216r8elim"
    | "ts3216r8elimbronze"
    | "ts6432"
    | "ts6432bronze"
    | "ts6432r8elim"
    | "ts6432r8elimbronze"
    | "ts12864"
    | "ts12864bronze"
    | "ts12864r8elim"
    | "ts12864r8elimbronze"
    | "ts256128"
    | "ts256128bronze"
    | "ts256128r8elim"
    | "ts256128r8elimbronze"
    | "ts256128r16"
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
