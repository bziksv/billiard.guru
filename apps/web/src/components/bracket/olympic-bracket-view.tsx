import {
  groupMatchesByRound,
  olympicBracketHeight,
  olympicMatchPlacementLabel,
  olympicMatchTop,
  olympicStackedCardHeight,
  OLYMPIC_BRACKET_UNIT,
  OLYMPIC_CARD_H,
  OLYMPIC_LABEL_OFFSET,
  type BracketMatchView,
} from "@/lib/bracket-view";
import { BracketMatchCard } from "@/components/bracket/bracket-match-card";
import { BracketScrollCenter } from "@/components/bracket/bracket-scroll-center";
import { GRID_CARD_W } from "@/lib/swiss-bracket-layout";
import type { TeamPlayer } from "@/lib/pair-tournament";

const UNIT = OLYMPIC_BRACKET_UNIT;
const CARD_H = OLYMPIC_CARD_H;
const CARD_W = GRID_CARD_W;
const COL_W = 248;
const CARD_LEFT = (COL_W - CARD_W) / 2;
const LABEL_OFFSET = OLYMPIC_LABEL_OFFSET;

function matchCenterY(
  round: number,
  slot: number,
  maxRound: number,
  withBronzeMatch: boolean,
): number {
  const top = olympicMatchTop(
    round,
    slot,
    maxRound,
    UNIT,
    CARD_H,
    withBronzeMatch,
  );
  const cardH =
    withBronzeMatch && round === maxRound
      ? olympicStackedCardHeight()
      : CARD_H;
  return top + LABEL_OFFSET + cardH / 2;
}

function lineX(colIndex: number, side: "left" | "right") {
  const base = colIndex * COL_W + CARD_LEFT;
  return side === "right" ? base + CARD_W : base;
}

function roundColumnLabel(
  round: number,
  maxRound: number,
  withBronzeMatch: boolean,
) {
  if (round === maxRound) {
    return withBronzeMatch ? "Финал / 3–4" : "Финал";
  }
  if (round === maxRound - 1) return "Полуфинал";
  return `1/${2 ** (maxRound - round)}`;
}

export function OlympicBracketView({
  matches,
  matchNumbers,
  onMatchClick,
  onPlayerClick,
  showMatchScore = false,
  withBronzeMatch = false,
  handicapHalfStep = true,
}: {
  matches: BracketMatchView[];
  matchNumbers?: Map<string, number>;
  onMatchClick?: (match: BracketMatchView) => void;
  onPlayerClick?: (playerId: string, preview?: TeamPlayer) => void;
  showMatchScore?: boolean;
  /** Матч за 3–4 в финальном туре (слот 2). */
  withBronzeMatch?: boolean;
  handicapHalfStep?: boolean;
}) {
  const rounds = groupMatchesByRound(matches);
  if (rounds.length === 0) return null;

  const maxRound = rounds[rounds.length - 1]!.round;
  const totalHeight = olympicBracketHeight(maxRound, UNIT, withBronzeMatch);
  const canvasWidth = rounds.length * COL_W;
  const canvasHeight = totalHeight + CARD_H + LABEL_OFFSET;
  const centerX = canvasWidth / 2;

  return (
    <BracketScrollCenter
      centerX={centerX}
      contentHeight={canvasHeight}
      className="bracket-canvas max-h-[min(90vh,1400px)] overflow-x-auto overflow-y-auto pb-6 pt-2"
    >
      <div
        className="relative min-w-max"
        style={{ width: canvasWidth, height: canvasHeight }}
      >
        <svg
          className="pointer-events-none absolute inset-0 z-0 overflow-visible"
          width={canvasWidth}
          height={canvasHeight}
          aria-hidden
        >
          {Array.from({ length: maxRound - 1 }, (_, i) => i + 1).flatMap((round) => {
            const slotsInRound = 2 ** (maxRound - round);
            const colIndex = round - 1;

            return Array.from({ length: slotsInRound }, (_, j) => {
              const slot = j + 1;
              const nextSlot = Math.ceil(slot / 2);

              const x1 = lineX(colIndex, "right");
              const y1 = matchCenterY(round, slot, maxRound, withBronzeMatch);
              const x2 = lineX(colIndex + 1, "left");
              const y2 = matchCenterY(round + 1, nextSlot, maxRound, withBronzeMatch);
              const midX = x1 + (x2 - x1) / 2;

              return (
                <path
                  key={`r${round}-s${slot}`}
                  d={`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`}
                  fill="none"
                  stroke="var(--bracket-line)"
                  strokeWidth="1.75"
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
            className="pointer-events-none absolute top-0 z-20"
            style={{ left: (round - 1) * COL_W, width: COL_W }}
          >
            <div className="bracket-col-header text-center text-[10px] font-medium uppercase tracking-wider">
              <span className={round === 1 ? "text-emerald-700 dark:text-emerald-400" : undefined}>
                {roundColumnLabel(round, maxRound, withBronzeMatch)}
              </span>
            </div>
          </div>
        ))}

        {rounds.map(({ round, matches: roundMatches }) =>
          roundMatches.map((match) => (
            <div
              key={match.id}
              className="absolute z-10"
              style={{
                left: (round - 1) * COL_W + CARD_LEFT,
                top:
                  olympicMatchTop(
                    match.round,
                    match.slot,
                    maxRound,
                    UNIT,
                    CARD_H,
                    withBronzeMatch,
                  ) + LABEL_OFFSET,
              }}
            >
              <BracketMatchCard
                match={match}
                matchNumber={matchNumbers?.get(match.id)}
                placementLabel={olympicMatchPlacementLabel(
                  match.round,
                  match.slot,
                  maxRound,
                  withBronzeMatch,
                )}
                onMatchClick={onMatchClick}
                onPlayerClick={onPlayerClick}
                showMatchScore={showMatchScore}
                handicapHalfStep={handicapHalfStep}
              />
            </div>
          )),
        )}
      </div>
    </BracketScrollCenter>
  );
}
