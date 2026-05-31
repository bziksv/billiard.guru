"use client";

import {
  type BracketMatchView,
  type SwissStandingView,
} from "@/lib/bracket-view";
import { LlbBracketMatch } from "@/components/bracket/llb-bracket-match";
import { BracketScrollCenter } from "@/components/bracket/bracket-scroll-center";
import { teamLabel } from "@/lib/pair-tournament";
import type { TeamPlayer } from "@/lib/pair-tournament";
import {
  buildFixedSwissBracketLayout,
  gridFixedColumnLabel,
  gridFixedConnectorPath,
  gridFixedEdgePoints,
} from "@/lib/fixed-swiss-layout";
import {
  buildSwissBracketLayout,
  GRID_COL_W,
  GRID_PAD,
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

  const columns: number[] = [];
  for (let c = layout.minCol; c <= layout.maxCol; c++) {
    columns.push(c);
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
        className="max-h-[75vh] overflow-x-auto overflow-y-auto rounded-lg border border-zinc-700/60 bg-zinc-900/20 pb-6 pt-2"
      >
        <div
          className="relative mx-auto min-w-max"
          style={{
            width: layout.totalWidth,
            height: layout.totalHeight,
            minWidth: "100%",
          }}
        >
          {columns.map((col) => {
            const label = fixedGrid
              ? gridFixedColumnLabel(col)
              : gridColumnLabel(col, layout.minRound);
            const isStart = fixedGrid ? col === 0 : col === layout.minCol;
            return (
              <div
                key={`col-${col}`}
                className="pointer-events-none absolute top-0 z-20 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-600"
                style={{
                  left: gridColLeft(col, layout.minCol),
                  width: GRID_COL_W,
                }}
              >
                <span className={isStart ? "text-emerald-600/80" : undefined}>
                  {label}
                </span>
              </div>
            );
          })}

          <svg
            className="pointer-events-none absolute inset-0 z-0"
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

              const points = fixedGrid
                ? gridFixedEdgePoints(
                    fromMatch,
                    toMatch,
                    fromPos,
                    toPos,
                    edge.teamId,
                    edge.kind,
                    layout.minCol,
                  )
                : gridEdgePoints(
                    fromMatch,
                    toMatch,
                    fromPos,
                    toPos,
                    edge.teamId,
                    edge.kind,
                    layout.minCol,
                  );
              const path = fixedGrid
                ? gridFixedConnectorPath(points.from, points.to, edge.kind)
                : gridConnectorPath(points.from, points.to, edge.kind);

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
                  left: gridColLeft(pos.col, layout.minCol),
                  top: pos.y + GRID_PAD + 18,
                }}
              >
                <LlbBracketMatch
                  match={match}
                  matchNumber={matchNumber}
                  edges={layout.edges}
                  matchNumbers={layout.matchNumbers}
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
