"use client";

import { useMemo, useState } from "react";
import {
  type BracketMatchView,
  matchAutopassBye,
  type SwissStandingView,
} from "@/lib/bracket-view";
import { LlbBracketMatch } from "@/components/bracket/llb-bracket-match";
import { BracketScrollCenter } from "@/components/bracket/bracket-scroll-center";
import { bracketMatchHasPlayer } from "@/lib/bracket-display";
import { teamLabel } from "@/lib/pair-tournament";
import { cn } from "@/lib/cn";
import type { TeamPlayer } from "@/lib/pair-tournament";
import {
  buildFixedSwissBracketLayout,
  fixedGridCardLeft,
  fixedGridColLeft,
  fixedSwissColumnLabel,
  fixedSwissForkTrunkYByTarget,
  gridFixedColumnLabel,
  gridFixedConnectorPath,
  gridFixedCrossToQuarterConnectorPath,
  gridFixedForkConnectorPath,
  gridFixedEdgePoints,
  isFixedSwissCrossAtSourceYEdge,
  isFixedSwissForkEdge,
  isFixedSwissR1LowerLossEdge,
  isFixedSwissR23UpperLossEdge,
  isFixedSwissUpperOlympicForkEdge,
  shouldDrawFixedSwissLossEdge,
  shouldDrawFixedSwissWinEdge,
} from "@/lib/fixed-swiss-layout";
import {
  isFixedSwiss168MatchCount,
  isFixedSwissTs32BronzeMatchCount,
  isFixedSwissTs32MatchCount,
  isFixedSwissTs32R8ElimAtEighthFamily,
  isFixedSwissTs64BronzeMatchCount,
  isFixedSwissTs64MatchCount,
  isOutdatedFixedSwiss32Bracket,
} from "@/lib/fixed-swiss-grid";
import {
  buildSwissBracketLayout,
  GRID_COL_W,
  GRID_LABEL_OFFSET,
  GRID_PAD,
  gridCardLeft,
  gridColLeft,
  gridColumnLabel,
  gridConnectorPath,
  gridEdgePoints,
  gridEdgeStroke,
} from "@/lib/swiss-bracket-layout";
import {
  bracketCanvasClassName,
  bracketViewRootClassName,
} from "@/lib/bracket-canvas-class";

export function SwissBracketView({
  matches,
  standings = [],
  showStandings = true,
  fixedGrid = false,
  onMatchClick,
  onPlayerClick,
  highlightedPlayerId: highlightedPlayerIdProp,
  onPlayerHighlight,
  handicapHalfStep = true,
  showCardMatchNumber = true,
  showCardHandicap = true,
  showCardPlacement = true,
  demoPreview = false,
  presentation = false,
}: {
  matches: BracketMatchView[];
  standings?: SwissStandingView[];
  showStandings?: boolean;
  fixedGrid?: boolean;
  onMatchClick?: (match: BracketMatchView) => void;
  onPlayerClick?: (playerId: string, preview?: TeamPlayer) => void;
  highlightedPlayerId?: string | null;
  onPlayerHighlight?: (playerId: string) => void;
  handicapHalfStep?: boolean;
  showCardMatchNumber?: boolean;
  showCardHandicap?: boolean;
  showCardPlacement?: boolean;
  demoPreview?: boolean;
  /** Полноэкранный режим: без подсказок, сетка на всю высоту. */
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
  const layout = useMemo(
    () =>
      fixedGrid
        ? buildFixedSwissBracketLayout(matches, {
            showCardMatchNumber,
            showCardHandicap,
            showCardPlacement,
            handicapHalfStep,
          })
        : buildSwissBracketLayout(matches),
    [fixedGrid, matches, showCardMatchNumber, showCardHandicap, showCardPlacement, handicapHalfStep],
  );
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const fixedMaxRound =
    matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;
  const useFixed168 = fixedGrid && isFixedSwiss168MatchCount(matches.length);

  const colW = layout.colWidth ?? GRID_COL_W;
  const colLeft = fixedGrid
    ? (col: number) => fixedGridColLeft(col, layout.minCol)
    : (col: number) => gridColLeft(col, layout.minCol);
  const cardLeft = fixedGrid
    ? (col: number) => fixedGridCardLeft(col, layout.minCol)
    : (col: number) => gridCardLeft(col, layout.minCol);

  const columns: number[] = [];
  for (let c = layout.minCol; c <= layout.maxCol; c++) {
    columns.push(c);
  }

  const forkTrunkFromY = (
    fromId: string,
    toId: string,
    fromTeamSlot: 1 | 2,
    toTeamSlot: 1 | 2,
    kind: "win" | "loss",
  ) => {
    const fp = layout.positions.get(fromId);
    const tp = layout.positions.get(toId);
    if (!fp || !tp) return undefined;
    return gridFixedEdgePoints(
      fp,
      tp,
      fromTeamSlot,
      toTeamSlot,
      kind,
      layout.minCol,
      layout.cardDisplay,
    ).from.y;
  };

  const trunkMatchCount = matches.length;
  const bracketMaxRound =
    matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : undefined;
  const r12TrunkY =
    fixedGrid && useFixed168
      ? fixedSwissForkTrunkYByTarget(
          1,
          2,
          layout.edges,
          forkTrunkFromY,
          matchById,
          trunkMatchCount,
        )
      : new Map<string, number>();
  const r34TrunkY =
    fixedGrid && useFixed168
      ? fixedSwissForkTrunkYByTarget(
          3,
          4,
          layout.edges,
          forkTrunkFromY,
          matchById,
          trunkMatchCount,
        )
      : new Map<string, number>();
  const is32Grid =
    fixedGrid &&
    useFixed168 &&
    matches.length >= 55 &&
    matches.length <= 64;
  const is64Grid =
    fixedGrid &&
    useFixed168 &&
    (isFixedSwissTs64MatchCount(matches.length) ||
      isFixedSwissTs64BronzeMatchCount(matches.length));
  const is32Current =
    is32Grid &&
    (isFixedSwissTs32MatchCount(matches.length) ||
      isFixedSwissTs32BronzeMatchCount(matches.length) ||
      isFixedSwissTs32R8ElimAtEighthFamily(
        matches.length,
        bracketMaxRound,
      ));
  const is64Current =
    is64Grid &&
    (isFixedSwissTs64MatchCount(matches.length) ||
      isFixedSwissTs64BronzeMatchCount(matches.length));
  const isLargeCurrent = is32Current || is64Current;
  const is32Outdated =
    is32Grid &&
    isOutdatedFixedSwiss32Bracket(matches.length, bracketMaxRound);
  const r23TrunkY =
    is32Outdated || isLargeCurrent
      ? fixedSwissForkTrunkYByTarget(
          2,
          3,
          layout.edges,
          forkTrunkFromY,
          matchById,
          trunkMatchCount,
        )
      : new Map<string, number>();
  const r35TrunkY =
    isLargeCurrent
      ? fixedSwissForkTrunkYByTarget(
          3,
          5,
          layout.edges,
          forkTrunkFromY,
          matchById,
          trunkMatchCount,
        )
      : new Map<string, number>();
  const r45TrunkY =
    fixedGrid && useFixed168
      ? fixedSwissForkTrunkYByTarget(
          4,
          5,
          layout.edges,
          forkTrunkFromY,
          matchById,
          trunkMatchCount,
        )
      : new Map<string, number>();
  const r56TrunkY =
    fixedGrid && useFixed168
      ? fixedSwissForkTrunkYByTarget(
          5,
          6,
          layout.edges,
          forkTrunkFromY,
          matchById,
          trunkMatchCount,
        )
      : new Map<string, number>();
  const r67TrunkY =
    isLargeCurrent
      ? fixedSwissForkTrunkYByTarget(
          6,
          7,
          layout.edges,
          forkTrunkFromY,
          matchById,
          trunkMatchCount,
        )
      : new Map<string, number>();
  const r53TrunkY = is64Current
    ? fixedSwissForkTrunkYByTarget(
        5,
        3,
        layout.edges,
        forkTrunkFromY,
        matchById,
        trunkMatchCount,
      )
    : new Map<string, number>();
  const r36TrunkY = is64Current
    ? fixedSwissForkTrunkYByTarget(
        3,
        6,
        layout.edges,
        forkTrunkFromY,
        matchById,
        trunkMatchCount,
      )
    : new Map<string, number>();

  function fixedSwissTrunkY(
    fromRound: number,
    toRound: number,
    toId: string,
    fallback: number,
  ) {
    const key = `${fromRound}:${toRound}`;
    const maps: Record<string, Map<string, number>> = {
      "1:2": r12TrunkY,
      "2:3": r23TrunkY,
      "3:4": r34TrunkY,
      "3:5": r35TrunkY,
      "3:6": r36TrunkY,
      "4:5": r45TrunkY,
      "5:3": r53TrunkY,
      "5:6": r56TrunkY,
      "6:7": r67TrunkY,
    };
    return maps[key]?.get(toId) ?? fallback;
  }

  return (
    <div className={bracketViewRootClassName(presentation)}>
      {showStandings && !presentation && standings.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Таблица
          </h3>
          <ol className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-zinc-800 bg-zinc-950/80 px-4 py-3">
            {[...standings]
              .sort((a, b) => b.swissPoints - a.swissPoints)
              .map((team, index) => (
                <li
                  key={team.id}
                  className="flex items-center gap-2 text-sm text-zinc-300"
                >
                  <span className="text-zinc-600">{index + 1}.</span>
                  <span>{teamLabel(team)}</span>
                  <span className="font-mono text-emerald-400">
                    {team.swissPoints}
                  </span>
                </li>
              ))}
          </ol>
        </section>
      )}

      <BracketScrollCenter
        centerX={layout.centerX}
        contentHeight={fixedGrid ? layout.totalHeight : undefined}
        contentScrollY={demoPreview || presentation ? "start" : "center"}
        className={bracketCanvasClassName({ presentation, fixedGrid, demoPreview })}
      >
        <div
          className="relative min-w-max"
          data-bracket-capture
          style={{
            width: layout.totalWidth,
            height: layout.totalHeight,
          }}
        >
          {columns.map((col) => {
            const label = fixedGrid
              ? useFixed168
                ? fixedSwissColumnLabel(col, matches.length, fixedMaxRound)
                : gridFixedColumnLabel(col)
              : gridColumnLabel(col, layout.minRound);
            const isStart = fixedGrid ? col === 0 : col === layout.minCol;
            return (
              <div
                key={`col-${col}`}
                className="pointer-events-none absolute top-0 z-20"
                style={{
                  left: colLeft(col),
                  width: colW,
                }}
              >
                <div className="bracket-col-header text-center text-[10px] font-medium uppercase tracking-wider">
                  <span className={isStart ? "text-emerald-700 dark:text-emerald-400" : undefined}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}

          <svg
            className="pointer-events-none absolute left-0 top-0 z-0 overflow-visible"
            width={layout.totalWidth}
            height={layout.totalHeight}
            aria-hidden
          >
            {layout.edges.map((edge) => {
              const fromMatch = matchById.get(edge.fromId);
              const toMatch = matchById.get(edge.toId);
              const fromPos = layout.positions.get(edge.fromId);
              const toPos = layout.positions.get(edge.toId);
              if (!fromMatch || !toMatch || !fromPos || !toPos) return null;
              if (
                fixedGrid &&
                !useFixed168 &&
                Math.abs(fromPos.col - toPos.col) !== 1
              ) {
                return null;
              }

              if (
                fixedGrid &&
                edge.fromTeamSlot != null &&
                edge.toTeamSlot != null
              ) {
                const isFork =
                  isFixedSwissForkEdge(
                    fromMatch.round,
                    toMatch.round,
                    matches.length,
                    fromMatch.slot,
                    toMatch.slot,
                    bracketMaxRound,
                  ) ||
                  isFixedSwissUpperOlympicForkEdge(
                    fromMatch.round,
                    toMatch.round,
                    fromMatch.slot,
                    toMatch.slot,
                    matches.length,
                  );
                const isPhantomLoss =
                  edge.kind === "loss" &&
                  matchAutopassBye(fromMatch).isBye;
                if (
                  edge.kind === "loss" &&
                  useFixed168 &&
                  !shouldDrawFixedSwissLossEdge(
                    fromPos.col,
                    toPos.col,
                    isPhantomLoss,
                    fromMatch.round,
                    toMatch.round,
                  )
                ) {
                  return null;
                }
                const points = gridFixedEdgePoints(
                  fromPos,
                  toPos,
                  edge.fromTeamSlot,
                  edge.toTeamSlot,
                  edge.kind,
                  layout.minCol,
                  layout.cardDisplay,
                );
                if (
                  useFixed168 &&
                  (edge.kind === "win" || edge.kind === "bye") &&
                  !shouldDrawFixedSwissWinEdge(
                    fromPos.col,
                    toPos.col,
                    fromMatch.round,
                    toMatch.round,
                    edge.kind,
                    fromMatch.slot,
                    toMatch.slot,
                    matches.length,
                    bracketMaxRound,
                  )
                ) {
                  return null;
                }
                const isR12Fork =
                  isFork &&
                  fromMatch.round === 1 &&
                  toMatch.round === 2;
                const trunkY = isFork
                  ? fixedSwissTrunkY(
                      fromMatch.round,
                      toMatch.round,
                      edge.toId,
                      points.from.y,
                    )
                  : points.from.y;
                const crossToQuarter =
                  useFixed168 &&
                  isFixedSwissCrossAtSourceYEdge(
                    fromMatch.round,
                    toMatch.round,
                    fromMatch.slot,
                    toMatch.slot,
                    matches.length,
                  );
                const path = isR12Fork
                  ? gridFixedConnectorPath(
                      points.from,
                      points.to,
                      edge.kind,
                      fromPos.col,
                      toPos.col,
                      layout.minCol,
                      colW,
                      toMatch.slot,
                    )
                  : isFork
                    ? gridFixedForkConnectorPath(
                        points.from,
                        points.to,
                        fromPos.col,
                        toPos.col,
                        layout.minCol,
                        colW,
                        trunkY,
                        toMatch.slot,
                      )
                    : crossToQuarter
                    ? gridFixedCrossToQuarterConnectorPath(
                        points.from,
                        points.to,
                        fromPos.col,
                        toPos.col,
                        layout.minCol,
                        colW,
                        edge.fromTeamSlot ?? 0,
                      )
                    : gridFixedConnectorPath(
                        points.from,
                        points.to,
                        edge.kind,
                        fromPos.col,
                        toPos.col,
                        layout.minCol,
                        colW,
                        0,
                      );
                const r1LowerFork = isFixedSwissR1LowerLossEdge(
                  fromPos.col,
                  toPos.col,
                  edge.kind,
                );
                const forkLoss =
                  isFork &&
                  edge.kind === "loss" &&
                  (r1LowerFork ||
                    isFixedSwissR23UpperLossEdge(
                      fromPos.col,
                      toPos.col,
                      edge.kind,
                    ));
                return (
                  <path
                    key={`${edge.fromId}-${edge.kind}-${edge.fromTeamSlot}-${edge.toId}`}
                    d={path}
                    fill="none"
                    stroke={
                      edge.kind === "loss"
                        ? forkLoss
                          ? "var(--bracket-line)"
                          : "rgb(113 113 122 / 0.55)"
                        : "var(--bracket-line)"
                    }
                    strokeWidth={edge.kind === "loss" ? 1.25 : 1.5}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                  />
                );
              }

              const points = gridEdgePoints(
                fromMatch,
                toMatch,
                fromPos,
                toPos,
                edge.teamId,
                edge.kind,
                layout.minCol,
              );
              const path = gridConnectorPath(points.from, points.to, edge.kind);

              return (
                <path
                  key={`${edge.fromId}-${edge.teamId}-${edge.kind}`}
                  d={path}
                  fill="none"
                  stroke={gridEdgeStroke(edge.kind)}
                  strokeWidth={edge.kind === "loss" ? 1.25 : 1.75}
                />
              );
            })}
          </svg>

          {matches.map((match) => {
            const pos = layout.positions.get(match.id);
            const matchNumber = layout.matchNumbers.get(match.id);
            if (!pos || matchNumber === undefined) return null;

            const filterActive = highlightedPlayerId != null;
            const playerInMatch =
              filterActive &&
              bracketMatchHasPlayer(match, highlightedPlayerId);
            const dimmed = filterActive && !playerInMatch;
            const focused = filterActive && playerInMatch;

            return (
              <div
                key={match.id}
                className={cn(
                  "absolute z-10",
                  dimmed && "bracket-match-anchor--dimmed",
                  focused && "bracket-match-anchor--focused",
                )}
                style={{
                  left: cardLeft(pos.col),
                  top: pos.y + GRID_PAD + GRID_LABEL_OFFSET,
                }}
              >
                <LlbBracketMatch
                  match={match}
                  matchNumber={matchNumber}
                  edges={layout.edges}
                  matchNumbers={layout.matchNumbers}
                  matchById={matchById}
                  onMatchClick={onMatchClick}
                  onPlayerClick={handlePlayerHighlight}
                  handicapHalfStep={handicapHalfStep}
                  showCardMatchNumber={showCardMatchNumber}
                  showCardHandicap={showCardHandicap}
                  showCardPlacement={showCardPlacement}
                  highlightedPlayerId={highlightedPlayerId}
                />
              </div>
            );
          })}
        </div>
      </BracketScrollCenter>
    </div>
  );
}
