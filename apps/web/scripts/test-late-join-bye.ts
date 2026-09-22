import assert from "node:assert/strict";
import { vacantRoundOneSlotsFromMatches } from "../src/lib/bracket-late-place-display";

const slots = vacantRoundOneSlotsFromMatches([
  {
    id: "m1",
    round: 1,
    slot: 1,
    status: "FINISHED",
    team1Id: "t1",
    team2Id: null,
    winnerTeamId: "t1",
    team1: {
      id: "t1",
      player1: { firstName: "Иван", lastName: "Иванов" },
      player2: null,
    },
    team2: null,
  },
  {
    id: "m2",
    round: 1,
    slot: 2,
    status: "SCHEDULED",
    team1Id: "t2",
    team2Id: "t3",
    winnerTeamId: null,
    team1: {
      id: "t2",
      player1: { firstName: "Пётр", lastName: "Петров" },
      player2: null,
    },
    team2: {
      id: "t3",
      player1: { firstName: "Сидор", lastName: "Сидоров" },
      player2: null,
    },
  },
  {
    id: "m3",
    round: 2,
    slot: 1,
    status: "SCHEDULED",
    team1Id: "t1",
    team2Id: null,
    winnerTeamId: null,
    team1: {
      id: "t1",
      player1: { firstName: "Иван", lastName: "Иванов" },
      player2: null,
    },
    team2: null,
  },
]);

assert.equal(slots.length, 1, "only R1 half-empty");
assert.equal(slots[0]!.matchId, "m1");
assert.equal(slots[0]!.emptyTeamSlot, 2);
assert.equal(slots[0]!.opponentTeamId, "t1");
assert.equal(slots[0]!.byeFinished, true);
assert.match(slots[0]!.opponentLabel, /Иванов/);

console.log("bracket-late-place-display: ok");
