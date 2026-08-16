import assert from "node:assert/strict";
import {
  calculateHandicap,
  describeHandicapShort,
  getHandicapForGame,
} from "../src/lib/handicap";

assert.deepEqual(calculateHandicap(3, 1.5, { halfStep: false }), {
  ratingDiff: 2,
  ballsEveryGame: 2,
  extraBallOnEvenGames: false,
});
assert.equal(
  describeHandicapShort(3, 1.5, { halfStep: false }),
  "2 в каждой партии",
  "3 vs 1.5 without half step → fora 2",
);

assert.deepEqual(calculateHandicap(3.5, 0, { halfStep: false }), {
  ratingDiff: 3,
  ballsEveryGame: 3,
  extraBallOnEvenGames: false,
});

assert.deepEqual(calculateHandicap(3, 1.5, { halfStep: true }), {
  ratingDiff: 1.5,
  ballsEveryGame: 1,
  extraBallOnEvenGames: true,
});
assert.equal(getHandicapForGame(3, 1.5, 1, { halfStep: true }), 1);
assert.equal(getHandicapForGame(3, 1.5, 2, { halfStep: true }), 2);
assert.equal(
  describeHandicapShort(3, 1.5, { halfStep: true }),
  "1 в каждой партии, +1 в чётных",
);

// Без округления вверх: 2.35 − 1.9 = 0.45 → без форы
assert.deepEqual(calculateHandicap(2.35, 1.9, { halfStep: true }), {
  ratingDiff: 0,
  ballsEveryGame: 0,
  extraBallOnEvenGames: false,
});
assert.equal(
  describeHandicapShort(2.35, 1.9, { halfStep: true }),
  "Без форы",
);

// Ровно 0,5 → только +1 в чётных
assert.deepEqual(calculateHandicap(2.4, 1.9, { halfStep: true }), {
  ratingDiff: 0.5,
  ballsEveryGame: 0,
  extraBallOnEvenGames: true,
});
assert.equal(getHandicapForGame(2.4, 1.9, 1, { halfStep: true }), 0);
assert.equal(getHandicapForGame(2.4, 1.9, 2, { halfStep: true }), 1);

console.log("handicap tests passed");
