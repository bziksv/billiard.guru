import {
  groupMatchesByRound,
  olympicBracketHeight,
  olympicMatchTop,
  type BracketMatchView,
} from "@/lib/bracket-view";
import { BracketMatchCard } from "@/components/bracket/bracket-match-card";

const UNIT = 88;
const CARD_H = 76;
const COL_W = 240;

export function OlympicBracketView({
  matches,
  onMatchClick,
}: {
  matches: BracketMatchView[];
  onMatchClick?: (match: BracketMatchView) => void;
}) {
  const rounds = groupMatchesByRound(matches);
  if (rounds.length === 0) return null;

  const maxRound = rounds[rounds.length - 1]!.round;
  const totalHeight = olympicBracketHeight(maxRound, UNIT);

  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="relative flex min-w-max gap-0"
        style={{ height: totalHeight + CARD_H }}
      >
        <svg
          className="pointer-events-none absolute inset-0 z-0"
          width={(rounds.length - 1) * COL_W + COL_W}
          height={totalHeight + CARD_H}
          aria-hidden
        >
          {rounds.slice(0, -1).map(({ round, matches: roundMatches }) => {
            const nextRound = rounds.find((r) => r.round === round + 1);
            if (!nextRound) return null;

            return roundMatches.map((match) => {
              if (!match.team1 && !match.team2) return null;
              const next = getNextMatchSlot(match.round, match.slot);
              const nextMatch = nextRound.matches.find((m) => m.slot === next.slot);
              if (!nextMatch) return null;

              const colIndex = rounds.findIndex((r) => r.round === round);
              const x1 = colIndex * COL_W + 224;
              const y1 =
                olympicMatchTop(match.round, match.slot, maxRound, UNIT, CARD_H) +
                CARD_H / 2;
              const x2 = (colIndex + 1) * COL_W + 16;
              const y2 =
                olympicMatchTop(
                  nextMatch.round,
                  nextMatch.slot,
                  maxRound,
                  UNIT,
                  CARD_H,
                ) +
                CARD_H / 2;
              const midX = x1 + (x2 - x1) / 2;

              return (
                <path
                  key={`${match.id}-line`}
                  d={`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`}
                  fill="none"
                  stroke="rgb(16 185 129 / 0.35)"
                  strokeWidth="2"
                />
              );
            });
          })}
        </svg>

        {rounds.map(({ round, matches: roundMatches }) => (
          <div
            key={round}
            className="relative z-10 shrink-0"
            style={{ width: COL_W, height: totalHeight + CARD_H }}
          >
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-emerald-500/80">
              {round === maxRound ? "Финал" : `1/${2 ** (maxRound - round)}`}
            </p>
            {roundMatches.map((match) => (
              <div
                key={match.id}
                className="absolute left-2"
                style={{
                  top:
                    olympicMatchTop(match.round, match.slot, maxRound, UNIT, CARD_H) +
                    28,
                }}
              >
                <BracketMatchCard match={match} onMatchClick={onMatchClick} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function getNextMatchSlot(round: number, slot: number) {
  return {
    round: round + 1,
    slot: Math.ceil(slot / 2),
  };
}
