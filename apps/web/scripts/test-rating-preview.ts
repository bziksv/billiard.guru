import assert from "node:assert/strict";
import {
  calculateRatingChangeMildAll,
  calculateRatingChangeSoft,
  calculateRatingChangeTinyEqual,
  calculateRatingChangeUpsetMild,
  calculateRatingChangeUpsetOnly,
} from "../src/lib/rating";
import {
  buildClubRatingTimelines,
  ratingAtTime,
} from "../src/lib/rating-history";
import { simulateRatingPreview } from "../src/lib/rating-preview";

const day = (n: number) => new Date(`2026-01-${String(n).padStart(2, "0")}T12:00:00Z`);

assert.deepEqual(calculateRatingChangeSoft(1, 1), {
  winnerDelta: 0.25,
  loserDelta: -0.25,
  winnerNew: 1.25,
  loserNew: 0.75,
});

// Фаворит над слабее — в soft ±0.1, в upset_only нули
assert.equal(calculateRatingChangeSoft(2.5, 2).winnerDelta, 0.1);
assert.deepEqual(calculateRatingChangeUpsetOnly(2.5, 2), {
  winnerDelta: 0,
  loserDelta: 0,
  winnerNew: 2.5,
  loserNew: 2,
});
assert.equal(calculateRatingChangeUpsetOnly(2, 2.5).winnerDelta, 0.25);
assert.equal(calculateRatingChangeUpsetOnly(2.5, 2.5).winnerDelta, 0.25);

const timelines = buildClubRatingTimelines({
  audits: [
    {
      action: "club.player_rating.set",
      createdAt: day(1),
      entityId: "cpr1",
      payload: { playerId: "a", rating: 2.5, clubId: "c" },
    },
    {
      action: "club.player_rating.update",
      createdAt: day(5),
      entityId: "cpr1",
      payload: { rating: 3 },
    },
  ],
  currentRows: [
    {
      id: "cpr1",
      playerId: "a",
      rating: 3,
      updatedAt: day(5),
    },
  ],
});
assert.equal(ratingAtTime(timelines.get("a"), day(3), 99), 2.5);
assert.equal(ratingAtTime(timelines.get("a"), day(6), 99), 3);

const base = (id: string, lastName: string, currentRating: number) => ({
  id,
  lastName,
  firstName: "X",
  middleName: null as string | null,
  currentRating,
  tournamentIds: new Set(["t1", "t2", "t3"]),
});

const solo = (
  id: string,
  dayN: number,
  winnerPlayerId: string,
  loserPlayerId: string,
  winnerRatingAtMatch: number,
  loserRatingAtMatch: number,
) => ({
  id,
  tournamentId: `t${((dayN - 1) % 3) + 1}`,
  finishedAt: day(dayN),
  createdAt: day(dayN),
  isPair: false,
  winners: [{ playerId: winnerPlayerId, ratingAtMatch: winnerRatingAtMatch }],
  losers: [{ playerId: loserPlayerId, ratingAtMatch: loserRatingAtMatch }],
});

const fromHist = simulateRatingPreview({
  players: [base("a", "Файницкий", 4), base("b", "Куклин", 2)],
  matches: [solo("m1", 1, "b", "a", 2, 2.5)],
  minTournaments: 3,
  ratingSource: "CLUB",
  usedHistoricalRatings: true,
});
const a = fromHist.players.find((p) => p.playerId === "a")!;
assert.equal(a.steps[0]?.ratingBefore, 2.5);
assert.equal(a.steps[0]?.opponentRatingBefore, 2);
assert.equal(a.steps[0]?.delta, -0.25);

// Пара: сила = среднее (2.5+2.5=2.5 vs 2+2=2) → фаворит ±0.1 каждому
const pairs = simulateRatingPreview({
  players: [
    base("a", "A", 2.5),
    base("b", "B", 2.5),
    base("c", "C", 2),
    base("d", "D", 2),
  ],
  matches: [
    {
      id: "p1",
      tournamentId: "t1",
      finishedAt: day(1),
      createdAt: day(1),
      isPair: true,
      winners: [
        { playerId: "a", ratingAtMatch: 2.5 },
        { playerId: "b", ratingAtMatch: 2.5 },
      ],
      losers: [
        { playerId: "c", ratingAtMatch: 2 },
        { playerId: "d", ratingAtMatch: 2 },
      ],
    },
  ],
  minTournaments: 3,
  ratingSource: "CLUB",
  usedHistoricalRatings: true,
});
assert.equal(pairs.matchesPairSimulated, 1);
assert.equal(pairs.players.find((p) => p.playerId === "a")!.steps[0]?.delta, 0.1);
assert.equal(pairs.players.find((p) => p.playerId === "c")!.steps[0]?.delta, -0.1);
assert.equal(
  pairs.players.find((p) => p.playerId === "a")!.steps[0]?.opponentName,
  "C / D",
);

const newbie = simulateRatingPreview({
  players: [base("a", "Колганов", 0), base("b", "X", 1)],
  matches: [solo("m1", 1, "b", "a", 1, 0)],
  minTournaments: 3,
  ratingSource: "SYSTEM",
});
assert.equal(newbie.players.find((p) => p.playerId === "a")!.proposedRating, 0);

// Формула 2: победа 2.5 над 2 → дельта 0
const upsetOnly = simulateRatingPreview({
  players: [base("a", "A", 2.5), base("b", "B", 2)],
  matches: [solo("m1", 1, "a", "b", 2.5, 2)],
  minTournaments: 3,
  ratingSource: "CLUB",
  usedHistoricalRatings: true,
  formula: "upset_only",
});
assert.equal(upsetOnly.players.find((p) => p.playerId === "a")!.steps[0]?.delta, 0);
assert.equal(upsetOnly.players.find((p) => p.playerId === "a")!.proposedRating, 2.5);

assert.deepEqual(calculateRatingChangeUpsetMild(2.5, 2.5), {
  winnerDelta: 0.1,
  loserDelta: -0.1,
  winnerNew: 2.6,
  loserNew: 2.4,
});
assert.deepEqual(calculateRatingChangeUpsetMild(2, 2.6), {
  winnerDelta: 0.15,
  loserDelta: -0.15,
  winnerNew: 2.15,
  loserNew: 2.45,
});
// ровно 0,5 — ещё равные
assert.equal(calculateRatingChangeUpsetMild(2.5, 2).winnerDelta, 0.1);
assert.equal(calculateRatingChangeUpsetMild(2, 2.5).winnerDelta, 0.1);
// сильнее заметно — нули
assert.deepEqual(calculateRatingChangeUpsetMild(3, 2), {
  winnerDelta: 0,
  loserDelta: 0,
  winnerNew: 3,
  loserNew: 2,
});

const upsetMild = simulateRatingPreview({
  players: [base("a", "A", 2), base("b", "B", 2.6)],
  matches: [solo("m1", 1, "a", "b", 2, 2.6)],
  minTournaments: 3,
  ratingSource: "CLUB",
  usedHistoricalRatings: true,
  formula: "upset_mild",
});
assert.equal(upsetMild.players.find((p) => p.playerId === "a")!.steps[0]?.delta, 0.15);

assert.deepEqual(calculateRatingChangeMildAll(3, 2), {
  winnerDelta: 0.1,
  loserDelta: -0.1,
  winnerNew: 3.1,
  loserNew: 1.9,
});
assert.equal(calculateRatingChangeMildAll(2, 2.6).winnerDelta, 0.15);
assert.equal(calculateRatingChangeMildAll(2.5, 2.5).winnerDelta, 0.1);

const mildAll = simulateRatingPreview({
  players: [base("a", "Галустов", 3), base("b", "Виленский", 2)],
  matches: [solo("m1", 1, "a", "b", 3, 2)],
  minTournaments: 3,
  ratingSource: "CLUB",
  usedHistoricalRatings: true,
  formula: "mild_all",
});
assert.equal(mildAll.players.find((p) => p.playerId === "a")!.steps[0]?.delta, 0.1);

assert.deepEqual(calculateRatingChangeTinyEqual(2.5, 2.5), {
  winnerDelta: 0.05,
  loserDelta: -0.05,
  winnerNew: 2.55,
  loserNew: 2.45,
});
assert.equal(calculateRatingChangeTinyEqual(3, 2).winnerDelta, 0.1);
assert.equal(calculateRatingChangeTinyEqual(2, 2.6).winnerDelta, 0.15);

console.log("rating-preview tests passed");
