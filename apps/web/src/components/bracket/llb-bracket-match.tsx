"use client";

import { describeHandicap } from "@/lib/handicap";
import { teamLabel, teamRating, type TeamWithPlayers } from "@/lib/pair-tournament";
import type { BracketMatchView } from "@/lib/bracket-view";
import { matchAutopassBye } from "@/lib/bracket-view";
import { isMatchResolved } from "@/lib/match-result";
import {
  getMatchDestinations,
  GRID_CARD_W,
  gridFooterHeight,
  GRID_META_H,
  GRID_ROW_H,
  incomingAutopassPhantomSlot,
  type SwissBracketEdge,
} from "@/lib/swiss-bracket-layout";
import {
  FIXED_SWISS_CARD_H,
  fixedSwissPlacementLabel,
} from "@/lib/fixed-swiss-layout";
import {
  inferFixedSwissGridSize,
  isFixedSwiss168LegacyMatchCount,
  isFixedSwiss168MatchCount,
  isFixedSwissTsLegacy27SixRound,
  isFixedSwissTsLegacy29MatchCount,
  isFixedSwissTsMatchCount,
} from "@/lib/fixed-swiss-grid";
import { cn } from "@/lib/cn";

function ScoreBox({
  value,
  highlight,
}: {
  value: string;
  highlight?: "win" | "loss" | "none";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center border font-mono text-[11px] leading-none",
        highlight === "win" && "border-sky-400 bg-sky-100 text-sky-900 dark:border-sky-600 dark:bg-sky-950 dark:text-sky-100",
        highlight === "loss" && "border-[var(--bracket-row-border)] bg-[var(--bracket-card-bg)] text-[var(--bracket-row-loser-text)]",
        highlight === "none" && "border-[var(--bracket-row-border)] bg-[var(--bracket-card-bg)] text-[var(--bracket-meta-text)]",
      )}
    >
      {value}
    </span>
  );
}

function playerRowClass(isWinner?: boolean, isLoser?: boolean, empty?: boolean) {
  return cn(
    "flex w-full items-center gap-1.5 border-b border-[var(--bracket-row-border)] px-2 last:border-b-0",
    isWinner && "bg-[var(--bracket-row-winner-bg)] text-[var(--bracket-row-winner-text)]",
    isLoser && "text-[var(--bracket-row-loser-text)]",
    empty && "bg-rose-50 text-rose-400 dark:bg-rose-950/30 dark:text-rose-200/70",
    !isWinner && !isLoser && !empty && "bg-[var(--bracket-card-bg)] text-[var(--bracket-row-text)]",
  );
}

function TeamRow({
  label,
  rating,
  score,
  isWinner,
  isLoser,
  empty,
  onPlayerClick,
  onMatchClick,
}: {
  label: string;
  rating?: number;
  score: string;
  isWinner?: boolean;
  isLoser?: boolean;
  empty?: boolean;
  onPlayerClick?: () => void;
  onMatchClick?: () => void;
}) {
  const rowClass = playerRowClass(isWinner, isLoser, empty);

  return (
    <div className={rowClass} style={{ height: GRID_ROW_H }}>
      {onPlayerClick && !empty ? (
        <button
          type="button"
          data-bracket-interactive
          onClick={(e) => {
            e.stopPropagation();
            onPlayerClick();
          }}
          className="min-w-0 flex-1 truncate text-left text-[12px] leading-none hover:text-sky-200"
        >
          {label}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate text-left text-[12px] leading-none">
          {label}
        </span>
      )}
      {rating !== undefined && !empty && (
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-500">
          {rating}
        </span>
      )}
      {onMatchClick ? (
        <button
          type="button"
          data-bracket-interactive
          onClick={(e) => {
            e.stopPropagation();
            onMatchClick();
          }}
          className="shrink-0 rounded hover:ring-1 hover:ring-inset hover:ring-emerald-500/50"
          aria-label="Открыть встречу"
        >
          <ScoreBox
            value={score}
            highlight={isWinner ? "win" : isLoser ? "loss" : "none"}
          />
        </button>
      ) : (
        <ScoreBox
          value={score}
          highlight={isWinner ? "win" : isLoser ? "loss" : "none"}
        />
      )}
    </div>
  );
}

function PairTeamRow({
  team,
  score,
  isWinner,
  isLoser,
  onPlayerClick,
  onMatchClick,
}: {
  team: TeamWithPlayers;
  score: string;
  isWinner?: boolean;
  isLoser?: boolean;
  onPlayerClick?: (playerId: string) => void;
  onMatchClick?: () => void;
}) {
  const rowClass = playerRowClass(isWinner, isLoser);

  return (
    <div className={rowClass} style={{ height: GRID_ROW_H }}>
      <button
        type="button"
        data-bracket-interactive
        disabled={!onPlayerClick}
        onClick={(e) => {
          e.stopPropagation();
          onPlayerClick?.(team.player1.id);
        }}
        className={cn(
          "min-w-0 flex-1 truncate text-left text-[12px] leading-none",
          onPlayerClick && "hover:text-sky-200",
        )}
      >
        {team.player1.lastName} {team.player1.firstName}
      </button>
      <span className="shrink-0 text-[10px] text-zinc-600">/</span>
      <button
        type="button"
        data-bracket-interactive
        disabled={!onPlayerClick || !team.player2}
        onClick={(e) => {
          e.stopPropagation();
          if (team.player2) onPlayerClick?.(team.player2.id);
        }}
        className={cn(
          "min-w-0 flex-1 truncate text-left text-[12px] leading-none",
          onPlayerClick && team.player2 && "hover:text-sky-200",
        )}
      >
        {team.player2
          ? `${team.player2.lastName} ${team.player2.firstName}`
          : "—"}
      </button>
      <span className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-500">
        {teamRating(team)}
      </span>
      {onMatchClick ? (
        <button
          type="button"
          data-bracket-interactive
          onClick={(e) => {
            e.stopPropagation();
            onMatchClick();
          }}
          className="shrink-0 rounded hover:ring-1 hover:ring-inset hover:ring-emerald-500/50"
          aria-label="Открыть встречу"
        >
          <ScoreBox
            value={score}
            highlight={isWinner ? "win" : isLoser ? "loss" : "none"}
          />
        </button>
      ) : (
        <ScoreBox
          value={score}
          highlight={isWinner ? "win" : isLoser ? "loss" : "none"}
        />
      )}
    </div>
  );
}

function MatchArea({
  children,
  onMatchClick,
  className,
  style,
}: {
  children: React.ReactNode;
  onMatchClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!onMatchClick) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-bracket-interactive
      onClick={(e) => {
        e.stopPropagation();
        onMatchClick();
      }}
      className={cn(
        className,
        "w-full cursor-pointer text-left transition-colors hover:bg-emerald-950/25",
      )}
      style={style}
    >
      {children}
    </button>
  );
}

export function LlbBracketMatch({
  match,
  matchNumber,
  edges,
  matchNumbers,
  matchById,
  onMatchClick,
  onPlayerClick,
}: {
  match: BracketMatchView;
  matchNumber: number;
  edges: SwissBracketEdge[];
  matchNumbers: Map<string, number>;
  matchById: Map<string, BracketMatchView>;
  onMatchClick?: (match: BracketMatchView) => void;
  onPlayerClick?: (playerId: string, preview?: TeamWithPlayers["player1"]) => void;
}) {
  const finished = isMatchResolved(match.status, match.winnerTeamId);
  const winnerId = match.winnerTeamId;
  const team1Wins = winnerId === match.team1?.id;
  const team2Wins = winnerId === match.team2?.id;
  const { isBye: roundOneBye, phantomRow } = matchAutopassBye(match);
  const incomingPhantom = incomingAutopassPhantomSlot(
    match.id,
    edges,
    matchById,
  );
  const { winnerTo, loserTo, winnerKind } = getMatchDestinations(
    match.id,
    edges,
    matchNumbers,
  );

  const openMatch = onMatchClick ? () => onMatchClick(match) : undefined;

  const handicap =
    match.team1 && match.team2
      ? describeHandicap(
          Math.max(teamRating(match.team1), teamRating(match.team2)),
          Math.min(teamRating(match.team1), teamRating(match.team2)),
        )
      : null;
  const showHandicap = handicap && handicap !== "Без форы";

  const team1ScoreDisplay =
    match.team1Score != null
      ? String(match.team1Score)
      : finished && winnerId
        ? team1Wins
          ? "1"
          : "0"
        : "—";
  const team2ScoreDisplay =
    match.team2Score != null
      ? String(match.team2Score)
      : finished && winnerId && match.team2
        ? team2Wins
          ? "1"
          : "0"
        : "—";

  const footerParts: string[] = [];
  const matchCount = matchNumbers.size;
  const gridSize = inferFixedSwissGridSize(matchCount);
  const matchesPerRound = gridSize / 2;
  const bracketMaxRound =
    matchById.size > 0
      ? Math.max(...Array.from(matchById.values()).map((m) => m.round))
      : 0;
  const maxRound = isFixedSwissTsLegacy29MatchCount(matchCount)
    ? bracketMaxRound || 6
    : matchCount === 27
      ? bracketMaxRound ||
        (isFixedSwissTsLegacy27SixRound(matchCount, 6) ? 6 : 5)
      : isFixedSwiss168LegacyMatchCount(matchCount, bracketMaxRound)
        ? bracketMaxRound || 5
        : Math.log2(gridSize) + 1;
  const isFixedSwissGrid = isFixedSwiss168MatchCount(matchCount);
  const placement = fixedSwissPlacementLabel(
    match.round,
    match.slot,
    maxRound,
    matchesPerRound,
    matchCount,
    matchNumber,
  );
  if (placement) {
    footerParts.push(placement);
  }
  if (match.status === "WALKOVER") {
    footerParts.push("тех. поражение");
  }
  if (loserTo !== undefined) {
    footerParts.push(
      roundOneBye && phantomRow
        ? `× на #${loserTo}`
        : `проигравший на #${loserTo}`,
    );
  }
  if (winnerTo !== undefined) {
    footerParts.push(
      winnerKind === "bye"
        ? `автопроход на #${winnerTo}`
        : `победитель на #${winnerTo}`,
    );
  }

  const footerHeight = gridFooterHeight(
    isFixedSwissGrid ? 3 : Math.max(footerParts.length, 1),
  );

  function handlePlayerClick(playerId: string, preview: TeamWithPlayers["player1"]) {
    onPlayerClick?.(playerId, preview);
  }

  return (
    <div
      className="llb-bracket-match overflow-hidden border border-[var(--bracket-card-border)] bg-[var(--bracket-card-bg)] shadow-[var(--bracket-card-shadow)]"
      style={{
        width: GRID_CARD_W,
        height: FIXED_SWISS_CARD_H,
      }}
    >
      <MatchArea
        onMatchClick={openMatch}
        className={cn(
          "flex items-center border-b border-[var(--bracket-row-border)] bg-[var(--bracket-card-bg)] px-2 text-[10px] text-[var(--bracket-meta-text)]",
          isFixedSwissGrid ? "justify-center" : "justify-between",
        )}
        style={{ height: GRID_META_H }}
      >
        {!isFixedSwissGrid ? (
          <>
            <span className="tabular-nums">Тур {match.round}</span>
            <span className="font-semibold tabular-nums text-emerald-300/90">
              #{matchNumber}
            </span>
            <span className="tabular-nums text-zinc-600">сл.{match.slot}</span>
          </>
        ) : (
          <span className="font-semibold tabular-nums text-emerald-300/90">
            #{matchNumber}
          </span>
        )}
      </MatchArea>

      {match.team1?.player2 ? (
        <PairTeamRow
          team={match.team1}
          score={team1ScoreDisplay}
          isWinner={team1Wins}
          isLoser={finished && !!winnerId && !team1Wins}
          onMatchClick={openMatch}
          onPlayerClick={
            onPlayerClick
              ? (id) =>
                  handlePlayerClick(
                    id,
                    id === match.team1!.player1.id
                      ? match.team1!.player1
                      : match.team1!.player2!,
                  )
              : undefined
          }
        />
      ) : (
        <TeamRow
          label={
            match.team1
              ? teamLabel(match.team1)
              : incomingPhantom === 1
                ? "×"
                : roundOneBye && phantomRow === 1
                  ? "—"
                  : "ожидание"
          }
          rating={match.team1 ? teamRating(match.team1) : undefined}
          score={team1ScoreDisplay}
          isWinner={team1Wins}
          isLoser={finished && !!winnerId && !team1Wins && !!match.team1}
          empty={incomingPhantom === 1}
          onMatchClick={openMatch}
          onPlayerClick={
            match.team1 && onPlayerClick
              ? () => handlePlayerClick(match.team1!.player1.id, match.team1!.player1)
              : undefined
          }
        />
      )}

      {match.team2?.player2 ? (
        <PairTeamRow
          team={match.team2}
          score={team2ScoreDisplay}
          isWinner={team2Wins}
          isLoser={finished && !!winnerId && !team2Wins}
          onMatchClick={openMatch}
          onPlayerClick={
            onPlayerClick
              ? (id) =>
                  handlePlayerClick(
                    id,
                    id === match.team2!.player1.id
                      ? match.team2!.player1
                      : match.team2!.player2!,
                  )
              : undefined
          }
        />
      ) : match.team2 ? (
        <TeamRow
          label={teamLabel(match.team2)}
          rating={teamRating(match.team2)}
          score={team2ScoreDisplay}
          isWinner={team2Wins}
          isLoser={finished && !!winnerId && !team2Wins}
          onMatchClick={openMatch}
          onPlayerClick={
            onPlayerClick
              ? () => handlePlayerClick(match.team2!.player1.id, match.team2!.player1)
              : undefined
          }
        />
      ) : (
        <TeamRow
          label={
            incomingPhantom === 2
              ? "×"
              : roundOneBye && phantomRow === 2
                ? "—"
                : "ожидание"
          }
          score="—"
          empty={incomingPhantom === 2}
          onMatchClick={openMatch}
        />
      )}

      {showHandicap && (
        <MatchArea
          onMatchClick={openMatch}
          className="border-t border-zinc-700/60 px-2 py-1 text-[9px] leading-snug text-zinc-500"
        >
          фора: {handicap}
        </MatchArea>
      )}

      {footerParts.length > 0 ? (
        <MatchArea
          onMatchClick={openMatch}
          className="flex flex-col justify-center gap-0.5 border-t border-[var(--bracket-row-border)] px-2 py-1 text-[9px] leading-snug text-[var(--bracket-meta-text)]"
          style={{ minHeight: footerHeight }}
        >
          {footerParts.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </MatchArea>
      ) : (
        openMatch && (
          <MatchArea
            onMatchClick={openMatch}
            className="flex items-center justify-center border-t border-zinc-700/40 px-2 py-1 text-[9px] text-zinc-600"
            style={{ minHeight: footerHeight }}
          >
            результат встречи →
          </MatchArea>
        )
      )}
    </div>
  );
}
