import assert from "node:assert/strict";
import type { BracketMatchView } from "../src/lib/bracket-view";
import { buildSwissBracketLayout } from "../src/lib/swiss-bracket-layout";

function mkMatch(
  id: string,
  round: number,
  slot: number,
  team1Id: string,
  team2Id: string | null,
  winnerTeamId: string | null,
): BracketMatchView {
  const team = (tid: string) => ({
    id: tid,
    player1: { id: tid, firstName: "A", lastName: tid, rating: 1000 },
    player2: null,
  });
  return {
    id,
    round,
    slot,
    status: winnerTeamId ? "FINISHED" : "SCHEDULED",
    winnerTeamId,
    team1: team(team1Id),
    team2: team2Id ? team(team2Id) : null,
  };
}

// 4 players, 2 rounds — each round in its own column
const matches: BracketMatchView[] = [
  mkMatch("m1", 1, 1, "a", "b", "a"),
  mkMatch("m2", 1, 2, "c", "d", "c"),
  mkMatch("m3", 2, 1, "a", "c", null),
  mkMatch("m4", 2, 2, "b", "d", null),
];

const layout = buildSwissBracketLayout(matches);

assert.equal(layout.positions.get("m1")?.col, 0, "round 1 col 0");
assert.equal(layout.positions.get("m2")?.col, 0, "round 1 col 0");
assert.equal(layout.positions.get("m3")?.col, 1, "round 2 col 1");
assert.equal(layout.positions.get("m4")?.col, 1, "round 2 col 1");

const winEdge = layout.edges.find((e) => e.fromId === "m1" && e.kind === "win");
const lossEdge = layout.edges.find((e) => e.fromId === "m1" && e.kind === "loss");
assert.equal(winEdge?.toId, "m3");
assert.equal(lossEdge?.toId, "m4");

console.log("swiss layout tests passed");
