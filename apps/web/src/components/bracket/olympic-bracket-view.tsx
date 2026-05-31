import {
  groupMatchesByRound,
  olympicBracketHeight,
  olympicMatchTop,
  OLYMPIC_BRACKET_UNIT,
  OLYMPIC_CARD_H,
  OLYMPIC_LABEL_OFFSET,
  type BracketMatchView,
} from "@/lib/bracket-view";
import { BracketMatchCard } from "@/components/bracket/bracket-match-card";
import type { TeamPlayer } from "@/lib/pair-tournament";

const UNIT = OLYMPIC_BRACKET_UNIT;
const CARD_H = OLYMPIC_CARD_H;
const CARD_W = 224;
const CARD_LEFT = 8;
const COL_W = 240;
const LABEL_OFFSET = OLYMPIC_LABEL_OFFSET;

function matchCenterY(
  round: number,
  slot: number,
  maxRound: number,
): number {
  return (
    olympicMatchTop(round, slot, maxRound, UNIT, CARD_H) +
    LABEL_OFFSET +
    CARD_H / 2
  );
}

function lineX(colIndex: number, side: "left" | "right") {
  const base = colIndex * COL_W + CARD_LEFT;
  return side === "right" ? base + CARD_W : base;
}

export function OlympicBracketView({
  matches,
  onMatchClick,
  onPlayerClick,
  showMatchScore = false,
}: {
  matches: BracketMatchView[];
  onMatchClick?: (match: BracketMatchView) => void;
  onPlayerClick?: (playerId: string, preview?: TeamPlayer) => void;
  showMatchScore?: boolean;
}) {
  const rounds = groupMatchesByRound(matches);
  if (rounds.length === 0) return null;

  const maxRound = rounds[rounds.length - 1]!.round;
  const totalHeight = olympicBracketHeight(maxRound, UNIT);

  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="relative flex min-w-max gap-0"
        style={{ height: totalHeight + CARD_H + LABEL_OFFSET }}
      >
        <svg
          className="pointer-events-none absolute inset-0 z-20 overflow-visible"
          width={rounds.length * COL_W}
          height={totalHeight + CARD_H + LABEL_OFFSET}
          aria-hidden
        >
          {Array.from({ length: maxRound - 1 }, (_, i) => i + 1).flatMap((round) => {
            const slotsInRound = 2 ** (maxRound - round);
            const colIndex = round - 1;

            return Array.from({ length: slotsInRound }, (_, j) => {
              const slot = j + 1;
              const nextSlot = Math.ceil(slot / 2);

              const x1 = lineX(colIndex, "right");
              const y1 = matchCenterY(round, slot, maxRound);
              const x2 = lineX(colIndex + 1, "left");
              const y2 = matchCenterY(round + 1, nextSlot, maxRound);
              const midX = x1 + (x2 - x1) / 2;

              return (
                <path
                  key={`r${round}-s${slot}`}
                  d={`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`}
                  fill="none"
                  stroke="var(--bracket-line)"
                  strokeWidth="2"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
              );
            });
          })}
        </svg>

        {rounds.map(({ round, matches: roundMatches }) => (
          <div
            key={round}
            className="relative z-10 shrink-0"
            style={{ width: COL_W, height: totalHeight + CARD_H + LABEL_OFFSET }}
          >
            <p className="bracket-round-label mb-3 text-center text-xs font-semibold uppercase tracking-wider">
              {round === maxRound ? "Финал" : `1/${2 ** (maxRound - round)}`}
            </p>
            {roundMatches.map((match) => (
              <div
                key={match.id}
                className="absolute left-2"
                style={{
                  top:
                    olympicMatchTop(match.round, match.slot, maxRound, UNIT, CARD_H) +
                    LABEL_OFFSET,
                }}
              >
                <BracketMatchCard
                  match={match}
                  onMatchClick={onMatchClick}
                  onPlayerClick={onPlayerClick}
                  showMatchScore={showMatchScore}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
