import assert from "node:assert/strict";
import {
  applyMatchStartRatingsToTeam,
  fillMissingMatchStartRatings,
} from "../src/lib/tournament-rating-display";

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

// Bye/автопроход до первой rated-встречи → oldRating первой rated
{
  const filled = fillMissingMatchStartRatings(
    [
      { id: "bye15", atMs: 1000, playerIds: ["p1"] },
      { id: "m32", atMs: 2000, playerIds: ["p1", "p2"] },
    ],
    [
      {
        matchId: "m32",
        playerId: "p1",
        oldRating: 2.25,
        newRating: 2.55,
        atMs: 2000,
      },
    ],
    { m32: { p1: 2.25, p2: 1.95 } },
  );
  assert.equal(filled.bye15?.p1, 2.25, "bye before first rated → first oldRating");
  assert.equal(filled.m32?.p1, 2.25, "direct RatingChange preserved");
}

// Bye после rated-встречи → newRating предыдущей
{
  const filled = fillMissingMatchStartRatings(
    [
      { id: "m1", atMs: 1000, playerIds: ["p1"] },
      { id: "bye", atMs: 1500, playerIds: ["p1"] },
      { id: "m2", atMs: 2000, playerIds: ["p1"] },
    ],
    [
      {
        matchId: "m1",
        playerId: "p1",
        oldRating: 2.0,
        newRating: 2.1,
        atMs: 1000,
      },
      {
        matchId: "m2",
        playerId: "p1",
        oldRating: 2.1,
        newRating: 2.2,
        atMs: 2000,
      },
    ],
    { m1: { p1: 2.0 }, m2: { p1: 2.1 } },
  );
  assert.equal(filled.bye?.p1, 2.1, "bye after rated → prior newRating");
}

// Как у Ильенко: bye без finishedAt (порядок по туру) после поражения 3.2→3.05
{
  const filled = fillMissingMatchStartRatings(
    [
      { id: "r2loss", atMs: 2_000_015, playerIds: ["p1"] },
      { id: "r3bye", atMs: 3_000_002, playerIds: ["p1"] },
      { id: "r4next", atMs: 4_000_001, playerIds: ["p1"] },
    ],
    [
      {
        matchId: "r2loss",
        playerId: "p1",
        oldRating: 3.2,
        newRating: 3.05,
        atMs: 2_000_015,
      },
      {
        matchId: "r4next",
        playerId: "p1",
        oldRating: 3.05,
        newRating: 2.9,
        atMs: 4_000_001,
      },
    ],
    { r2loss: { p1: 3.2 }, r4next: { p1: 3.05 } },
  );
  assert.equal(
    filled.r3bye?.p1,
    3.05,
    "lower-bracket bye after loss → rating after that loss",
  );
}

console.log("match-start rating display tests passed");
