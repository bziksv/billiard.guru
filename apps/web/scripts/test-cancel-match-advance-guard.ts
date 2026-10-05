import assert from "node:assert/strict";
import { blockingFinishedAdvanceMatch } from "../src/lib/bracket-service";

type Row = {
  round: number;
  slot: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerTeamId: string | null;
};

const butko = "butko";
const razinkov = "razinkov";
const ilyinsky = "ilyinsky";
const vilensky = "vilensky";

const matches: Row[] = [
  {
    round: 3,
    slot: 14,
    team1Id: butko,
    team2Id: razinkov,
    winnerTeamId: butko,
  },
  {
    round: 4,
    slot: 2,
    team1Id: ilyinsky,
    team2Id: razinkov,
    winnerTeamId: razinkov,
  },
  {
    round: 5,
    slot: 1,
    team1Id: vilensky,
    team2Id: butko,
    winnerTeamId: null,
  },
];

{
  const blocking = blockingFinishedAdvanceMatch(matches, [
    { round: 5, slot: 1, teamId: butko },
  ]);
  assert.equal(
    blocking,
    null,
    "R3#14 win → R5S1 (не сыгран); R4S2 с Разиньковым не блокирует",
  );
}

{
  const blocking = blockingFinishedAdvanceMatch(matches, [
    { round: 4, slot: 2, teamId: razinkov },
  ]);
  assert.equal(blocking?.round, 4);
  assert.equal(blocking?.slot, 2);
}

console.log("test-cancel-match-advance-guard ok");
