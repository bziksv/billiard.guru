"use client";

import { useMemo, useState } from "react";
import {
  buildOlympicBracketLayout,
  groupMatchesByRound,
  olympicConnectorY,
  olympicMatchFooterRows,
  OLYMPIC_LABEL_OFFSET,
  type BracketMatchView,
  type OlympicDisplayOpts,
} from "@/lib/bracket-view";
import { BracketMatchCard } from "@/components/bracket/bracket-match-card";
import { BracketScrollCenter } from "@/components/bracket/bracket-scroll-center";
import { GRID_CARD_W } from "@/lib/swiss-bracket-layout";
import { bracketMatchHasPlayer } from "@/lib/bracket-display";
import type { TeamPlayer } from "@/lib/pair-tournament";
import { cn } from "@/lib/cn";
import {
  bracketCanvasClassName,
  bracketViewRootClassName,
} from "@/lib/bracket-canvas-class";

const CARD_W = GRID_CARD_W;
const COL_W = 248;
const CARD_LEFT = (COL_W - CARD_W) / 2;
const LABEL_OFFSET = OLYMPIC_LABEL_OFFSET;

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
  highlightedPlayerId: highlightedPlayerIdProp,
  onPlayerHighlight,
  showMatchScore = false,
  withBronzeMatch = false,
  handicapHalfStep = true,
  showCardMatchNumber = true,
  showCardHandicap = true,
  showCardPlacement = true,
  presentation = false,
}: {
  matches: BracketMatchView[];
  matchNumbers?: Map<string, number>;
  onMatchClick?: (match: BracketMatchView) => void;
  onPlayerClick?: (playerId: string, preview?: TeamPlayer) => void;
  highlightedPlayerId?: string | null;
  onPlayerHighlight?: (playerId: string) => void;
  showMatchScore?: boolean;
  /** Матч за 3–4 в финальном туре (слот 2). */
  withBronzeMatch?: boolean;
  handicapHalfStep?: boolean;
  showCardMatchNumber?: boolean;
  showCardHandicap?: boolean;
  showCardPlacement?: boolean;
  presentation?: boolean;
}) {
  const [localHighlightedPlayerId, setLocalHighlightedPlayerId] = useState<
    string | null
  >(null);
  const highlightedPlayerId =
    highlightedPlayerIdProp !== undefined
      ? highlightedPlayerIdProp
      : localHighlightedPlayerId;

  function handlePlayerHighlight(playerId: string, preview?: TeamPlayer) {
    if (onPlayerHighlight) {
      onPlayerHighlight(playerId);
    } else {
      setLocalHighlightedPlayerId((prev) =>
        prev === playerId ? null : playerId,
      );
    }
    onPlayerClick?.(playerId, preview);
  }

  const rounds = groupMatchesByRound(matches);
  const maxRound = rounds.length > 0 ? rounds[rounds.length - 1]!.round : 0;

  const layout = useMemo(
    () =>
      maxRound > 0
        ? buildOlympicBracketLayout(
            matches,
            matchNumbers ?? new Map(),
            maxRound,
            {
              showCardMatchNumber,
              showCardHandicap,
              showCardPlacement: showCardPlacement && !!matchNumbers,
              handicapHalfStep,
              withBronzeMatch,
            },
          )
        : { tops: new Map(), heights: new Map(), totalHeight: 0 },
    [
      matches,
      matchNumbers,
      maxRound,
      showCardMatchNumber,
      showCardHandicap,
      showCardPlacement,
      handicapHalfStep,
      withBronzeMatch,
    ],
  );

  const layoutOpts = useMemo(
    (): OlympicDisplayOpts => ({
      showCardMatchNumber,
      showCardHandicap,
      showCardPlacement: showCardPlacement && !!matchNumbers,
      handicapHalfStep,
      withBronzeMatch,
    }),
    [
      showCardMatchNumber,
      showCardHandicap,
      showCardPlacement,
      matchNumbers,
      handicapHalfStep,
      withBronzeMatch,
    ],
  );

  const matchByKey = useMemo(() => {
    const map = new Map<string, BracketMatchView>();
    for (const m of matches) map.set(`${m.round}:${m.slot}`, m);
    return map;
  }, [matches]);

  if (rounds.length === 0) return null;

  const canvasWidth = rounds.length * COL_W;
  const canvasHeight = layout.totalHeight + LABEL_OFFSET + 8;
  const centerX = canvasWidth / 2;

  return (
    <div className={bracketViewRootClassName(presentation)}>
    <BracketScrollCenter
      centerX={centerX}
      contentHeight={canvasHeight}
      contentScrollY={presentation ? "start" : "center"}
      enablePinchZoom={presentation}
      className={bracketCanvasClassName({ presentation })}
    >
      <div
        className="relative min-w-max"
        data-bracket-capture
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
              const from = matchByKey.get(`${round}:${slot}`);
              const to = matchByKey.get(`${round + 1}:${nextSlot}`);
              if (!from || !to) return null;

              const x1 = lineX(colIndex, "right");
              const y1 = olympicConnectorY(from.id, layout, layoutOpts);
              const x2 = lineX(colIndex + 1, "left");
              const y2 = olympicConnectorY(to.id, layout, layoutOpts);
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

        {rounds.map(({ round }) => (
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
          roundMatches.map((match) => {
            const filterActive = highlightedPlayerId != null;
            const playerInMatch =
              filterActive &&
              bracketMatchHasPlayer(match, highlightedPlayerId);
            const dimmed = filterActive && !playerInMatch;
            const focused = filterActive && playerInMatch;
            const cardTop = layout.tops.get(match.id) ?? 0;

            return (
            <div
              key={match.id}
              className={cn(
                "absolute z-10",
                dimmed && "bracket-match-anchor--dimmed",
                focused && "bracket-match-anchor--focused",
              )}
              style={{
                left: (round - 1) * COL_W + CARD_LEFT,
                top: cardTop + LABEL_OFFSET,
              }}
            >
              <BracketMatchCard
                match={match}
                matchNumber={
                  showCardMatchNumber ? matchNumbers?.get(match.id) : undefined
                }
                footerRows={
                  showCardPlacement && matchNumbers
                    ? olympicMatchFooterRows(
                        match,
                        matches,
                        matchNumbers,
                        maxRound,
                        withBronzeMatch,
                      )
                    : undefined
                }
                onMatchClick={onMatchClick}
                onPlayerClick={handlePlayerHighlight}
                showMatchScore={showMatchScore}
                handicapHalfStep={handicapHalfStep}
                showCardHandicap={showCardHandicap}
                highlightedPlayerId={highlightedPlayerId}
              />
            </div>
            );
          }),
        )}
      </div>
    </BracketScrollCenter>
    </div>
  );
}
