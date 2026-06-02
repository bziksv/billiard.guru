"use client";

import {
  type BracketMatchView,
  matchAutopassBye,
  type SwissStandingView,
} from "@/lib/bracket-view";
import { LlbBracketMatch } from "@/components/bracket/llb-bracket-match";
import { BracketScrollCenter } from "@/components/bracket/bracket-scroll-center";
import { teamLabel } from "@/lib/pair-tournament";
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
  isFixedSwissCrossToQuarterEdge,
  isFixedSwissForkEdge,
  isFixedSwissR1LowerLossEdge,
  isFixedSwissR23UpperLossEdge,
  shouldDrawFixedSwissLossEdge,
  shouldDrawFixedSwissWinEdge,
} from "@/lib/fixed-swiss-layout";
import {
  isFixedSwiss168MatchCount,
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

export function SwissBracketView({
  matches,
  standings = [],
  showStandings = true,
  fixedGrid = false,
  onMatchClick,
  onPlayerClick,
}: {
  matches: BracketMatchView[];
  standings?: SwissStandingView[];
  showStandings?: boolean;
  fixedGrid?: boolean;
  onMatchClick?: (match: BracketMatchView) => void;
  onPlayerClick?: (playerId: string, preview?: TeamPlayer) => void;
}) {
  const layout = fixedGrid
    ? buildFixedSwissBracketLayout(matches)
    : buildSwissBracketLayout(matches);
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
    ).from.y;
  };

  const r12TrunkY =
    fixedGrid && useFixed168
      ? fixedSwissForkTrunkYByTarget(1, 2, layout.edges, forkTrunkFromY, matchById)
      : new Map<string, number>();
  const r34TrunkY =
    fixedGrid && useFixed168
      ? fixedSwissForkTrunkYByTarget(3, 4, layout.edges, forkTrunkFromY, matchById)
      : new Map<string, number>();
  const r45TrunkY =
    fixedGrid && useFixed168
      ? fixedSwissForkTrunkYByTarget(4, 5, layout.edges, forkTrunkFromY, matchById)
      : new Map<string, number>();

  function fixedSwissTrunkY(fromRound: number, toId: string, fallback: number) {
    if (fromRound === 1) return r12TrunkY.get(toId) ?? fallback;
    if (fromRound === 3) return r34TrunkY.get(toId) ?? fallback;
    if (fromRound === 4) return r45TrunkY.get(toId) ?? fallback;
    return fallback;
  }

  return (
    <div className="flex flex-col gap-6">
      {showStandings && standings.length > 0 && (
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

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-500">
        {onMatchClick && (
          <>
            <span>Имя — карточка · счёт, # или «результат» — встреча</span>
            <span className="text-zinc-600">|</span>
          </>
        )}
        {fixedGrid ? (
          <>
            <span>проигравшие ←</span>
            <span className="text-emerald-600/80">Старт</span>
            <span>победители →</span>
            <span className="text-zinc-600">|</span>
            <span>Номера переходов (#) заданы заранее</span>
          </>
        ) : (
          <>
            <span>Колонки — туры слева направо</span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-px w-8 bg-emerald-400/80" />
              победитель
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-px w-8 bg-zinc-500/60" />
              проигравший
            </span>
          </>
        )}
        <span className="text-zinc-600">|</span>
        <span>Зажмите фон и тащите сетку</span>
      </div>

      <BracketScrollCenter
        centerX={layout.centerX}
        contentHeight={fixedGrid ? layout.totalHeight : undefined}
        className={
          fixedGrid
            ? "bracket-canvas max-h-[min(90vh,1400px)] overflow-x-auto overflow-y-auto pb-6 pt-2"
            : "bracket-canvas max-h-[75vh] overflow-x-auto overflow-y-auto pb-6 pt-2"
        }
      >
        <div
          className="relative min-w-max"
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
                const isFork = isFixedSwissForkEdge(
                  fromMatch.round,
                  toMatch.round,
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
                  )
                ) {
                  return null;
                }
                const trunkY = isFork
                  ? fixedSwissTrunkY(fromMatch.round, edge.toId, points.from.y)
                  : points.from.y;
                const crossToQuarter =
                  useFixed168 &&
                  isFixedSwissCrossToQuarterEdge(
                    fromMatch.round,
                    toMatch.round,
                  );
                const path = isFork
                  ? gridFixedForkConnectorPath(
                      points.from,
                      points.to,
                      fromPos.col,
                      toPos.col,
                      layout.minCol,
                      colW,
                      trunkY,
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

            return (
              <div
                key={match.id}
                className="absolute z-10"
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
                  onPlayerClick={onPlayerClick}
                />
              </div>
            );
          })}
        </div>
      </BracketScrollCenter>
    </div>
  );
}
