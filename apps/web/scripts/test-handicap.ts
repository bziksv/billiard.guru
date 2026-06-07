import assert from "node:assert/strict";
import {
  calculateHandicap,
  describeHandicapShort,
  getHandicapForGame,
} from "../src/lib/handicap";

assert.deepEqual(calculateHandicap(3, 1.5, { halfStep: false }), {
  ratingDiff: 2,
  ballsEveryGame: 2,
  extraBallOnOddGames: false,
});
assert.equal(
  describeHandicapShort(3, 1.5, { halfStep: false }),
  "2 в каждой партии",
  "3 vs 1.5 without half step → fora 2",
);

assert.deepEqual(calculateHandicap(3.5, 0, { halfStep: false }), {
  ratingDiff: 3,
  ballsEveryGame: 3,
  extraBallOnOddGames: false,
});

assert.deepEqual(calculateHandicap(3, 1.5, { halfStep: true }), {
  ratingDiff: 1.5,
  ballsEveryGame: 1,
  extraBallOnOddGames: true,
});
assert.equal(getHandicapForGame(3, 1.5, 1, { halfStep: true }), 2);
assert.equal(getHandicapForGame(3, 1.5, 2, { halfStep: true }), 1);

console.log("handicap tests passed");
