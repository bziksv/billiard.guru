import assert from "node:assert/strict";
import { eliminatedTeamIdsFromMatches } from "../src/lib/bracket-substitute";

// A beat B in R1; B is eliminated. A is in unfinished R2.
{
  const ids = eliminatedTeamIdsFromMatches([
    {
      team1Id: "A",
      team2Id: "B",
      winnerTeamId: "A",
    },
    {
      team1Id: "A",
      team2Id: "C",
      winnerTeamId: null,
    },
  ]);
  assert.deepEqual([...ids].sort(), ["B"]);
}

// LLB: B lost but still in unfinished lower bracket — not a candidate.
{
  const ids = eliminatedTeamIdsFromMatches([
    {
      team1Id: "A",
      team2Id: "B",
      winnerTeamId: "A",
    },
    {
      team1Id: "B",
      team2Id: "D",
      winnerTeamId: null,
    },
  ]);
  assert.equal(ids.size, 0);
}

// Rewrite scenario helpers: finished keep losers; unfinished active excluded.
{
  const ids = eliminatedTeamIdsFromMatches([
    { team1Id: "G", team2Id: "X", winnerTeamId: "G" },
    { team1Id: "Y", team2Id: "Z", winnerTeamId: "Y" },
    { team1Id: "G", team2Id: "Y", winnerTeamId: null },
  ]);
  assert.deepEqual([...ids].sort(), ["X", "Z"]);
}

console.log("bracket-substitute: ok");
