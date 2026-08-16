import assert from "node:assert/strict";
import { applyMatchStartRatingsToTeam } from "../src/lib/tournament-rating-display";

const team = {
  id: "t1",
  player1: { id: "p1", firstName: "A", lastName: "G", rating: 3.45 },
  player2: null as null,
  ratingOverride: null as number | null,
};

const map = {
  m1: { p1: 3.3 },
  m2: { p1: 3.4 },
};

assert.equal(
  applyMatchStartRatingsToTeam(team, "m1", map, "SYSTEM")?.player1.rating,
  3.3,
);
assert.equal(
  applyMatchStartRatingsToTeam(team, "m2", map, "SYSTEM")?.player1.rating,
  3.4,
);
assert.equal(
  applyMatchStartRatingsToTeam(team, "m3", map, "SYSTEM")?.player1.rating,
  3.45,
  "unfinished / no history → current",
);
assert.equal(
  applyMatchStartRatingsToTeam(team, "m1", map, "CLUB")?.player1.rating,
  3.45,
  "CLUB source unchanged",
);

console.log("match-start rating display tests passed");
