import assert from "node:assert/strict";
import {
  buildOlympicBracketLayout,
  estimateOlympicCardHeight,
  olympicMatchFooterRows,
  type BracketMatchView,
} from "../src/lib/bracket-view";
import { teamRating } from "../src/lib/pair-tournament";

function mkTeam(id: string, rating: number) {
  return {
    id: `t-${id}`,
    player1: { id, firstName: "Тест", lastName: id, rating },
  };
}

function mkMatch(
  round: number,
  slot: number,
  r1 = 6,
  r2 = 5,
): BracketMatchView {
  return {
    id: `r${round}s${slot}`,
    round,
    slot,
    status: "SCHEDULED",
    team1: mkTeam(`a-${round}-${slot}`, r1) as BracketMatchView["team1"],
    team2: mkTeam(`b-${round}-${slot}`, r2) as BracketMatchView["team2"],
    winnerTeamId: null,
  };
}

function mkOlympic16(): BracketMatchView[] {
  const matches: BracketMatchView[] = [];
  for (let round = 1; round <= 4; round++) {
    const slots = 2 ** (4 - round);
    for (let slot = 1; slot <= slots; slot++) {
      matches.push(mkMatch(round, slot, 6 - (slot % 3), 4 + (slot % 4)));
    }
  }
  return matches;
}

const matches = mkOlympic16();
const maxRound = 4;
const matchNumbers = new Map(matches.map((m, i) => [m.id, i + 1]));
const opts = {
  showCardMatchNumber: true,
  showCardHandicap: true,
  showCardPlacement: true,
  handicapHalfStep: true,
  withBronzeMatch: false,
};

const layout = buildOlympicBracketLayout(
  matches,
  matchNumbers,
  maxRound,
  opts,
);

const r1 = matches.filter((m) => m.round === 1).sort((a, b) => a.slot - b.slot);
let prevBottom = -Infinity;
for (const m of r1) {
  const top = layout.tops.get(m.id)!;
  const h = layout.heights.get(m.id)!;
  assert.ok(top >= prevBottom + 4 - 0.01, `R1 slot ${m.slot}: overlap`);
  const footerRows = olympicMatchFooterRows(
    m,
    matches,
    matchNumbers,
    maxRound,
    false,
  ).length;
  const est = estimateOlympicCardHeight(m, footerRows, opts);
  assert.equal(h, est, `height estimate slot ${m.slot}`);
  prevBottom = top + h;
}

for (let round = 1; round <= maxRound; round++) {
  const roundMatches = matches
    .filter((m) => m.round === round)
    .sort((a, b) => (layout.tops.get(a.id) ?? 0) - (layout.tops.get(b.id) ?? 0));
  prevBottom = -Infinity;
  for (const m of roundMatches) {
    const top = layout.tops.get(m.id)!;
    const h = layout.heights.get(m.id)!;
    assert.ok(top >= prevBottom + 4 - 0.01, `round ${round} slot ${m.slot}: overlap`);
    prevBottom = top + h;
  }
}

console.log("test-olympic-layout: ok");
