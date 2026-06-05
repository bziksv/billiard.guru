"use client";

import { describeHandicap, describeHandicapShort } from "@/lib/handicap";
import { teamLabel, teamRating, type TeamWithPlayers } from "@/lib/pair-tournament";
import type { BracketMatchView } from "@/lib/bracket-view";
import { isMatchReadyForResult, matchAutopassBye } from "@/lib/bracket-view";
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
  findFixedSwissLink,
  getFixedSwissLinksForMatchCount,
  inferFixedSwissGridSize,
  isFixedSwiss168LegacyMatchCount,
  isFixedSwiss168MatchCount,
  isFixedSwissTsLegacy27SixRound,
  isFixedSwissTsLegacy29MatchCount,
  isFixedSwissTsMatchCount,
  fixedSwissMatchNo,
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
        "bracket-match-score-slot inline-flex h-[18px] min-w-[18px] items-center justify-center text-[11px] leading-none",
        highlight === "win" && "bracket-match-score-slot--winner",
        highlight === "loss" && "bracket-match-score-slot--loser",
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
    empty && "bracket-match-row bracket-match-row--empty !items-center !px-2 !py-0 text-[12px]",
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
          className="bracket-player-link min-w-0 flex-1 truncate text-left text-[12px] font-medium leading-none"
        >
          {label}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate text-left text-[12px] leading-none">
          {label}
        </span>
      )}
      {rating !== undefined && !empty && (
        <span className="bracket-match-rating shrink-0 font-mono text-[10px] tabular-nums">
          ур. {rating}
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
          onPlayerClick && "bracket-player-link",
        )}
      >
        {team.player1.lastName} {team.player1.firstName}
      </button>
      <span className="shrink-0 text-[10px] text-[var(--bracket-meta-text)]">/</span>
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
          onPlayerClick && team.player2 && "bracket-player-link",
        )}
      >
        {team.player2
          ? `${team.player2.lastName} ${team.player2.firstName}`
          : "—"}
      </button>
      <span className="bracket-match-rating shrink-0 font-mono text-[10px] tabular-nums">
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
  handicapHalfStep = true,
}: {
  match: BracketMatchView;
  matchNumber: number;
  edges: SwissBracketEdge[];
  matchNumbers: Map<string, number>;
  matchById: Map<string, BracketMatchView>;
  onMatchClick?: (match: BracketMatchView) => void;
  onPlayerClick?: (playerId: string, preview?: TeamWithPlayers["player1"]) => void;
  handicapHalfStep?: boolean;
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
  let winnerToNo = winnerTo;
  let loserToNo = loserTo;
  if (isFixedSwiss168MatchCount(matchNumbers.size)) {
    const maxRound = Math.max(
      0,
      ...Array.from(matchById.values()).map((m) => m.round),
    );
    const links = getFixedSwissLinksForMatchCount(matchNumbers.size, maxRound);
    if (winnerToNo === undefined) {
      const winLink = findFixedSwissLink(links, match.round, match.slot, "win");
      if (winLink) {
        const dest = Array.from(matchById.values()).find(
          (m) => m.round === winLink.toRound && m.slot === winLink.toSlot,
        );
        if (dest) {
          winnerToNo =
            matchNumbers.get(dest.id) ??
            fixedSwissMatchNo(
              dest.round,
              dest.slot,
              matchNumbers.size,
              maxRound,
            );
        }
      }
    }
    if (loserToNo === undefined) {
      const loseLink = findFixedSwissLink(links, match.round, match.slot, "loss");
      if (loseLink) {
        const dest = Array.from(matchById.values()).find(
          (m) => m.round === loseLink.toRound && m.slot === loseLink.toSlot,
        );
        if (dest) {
          loserToNo =
            matchNumbers.get(dest.id) ??
            fixedSwissMatchNo(
              dest.round,
              dest.slot,
              matchNumbers.size,
              maxRound,
            );
        }
      }
    }
  }

  const resultReady = isMatchReadyForResult(match);
  const canOpenResult = resultReady || finished;
  const openResult =
    onMatchClick && canOpenResult ? () => onMatchClick(match) : undefined;

  const handicapOpts = { halfStep: handicapHalfStep };
  const handicap =
    match.team1 && match.team2
      ? describeHandicap(
          Math.max(teamRating(match.team1), teamRating(match.team2)),
          Math.min(teamRating(match.team1), teamRating(match.team2)),
          handicapOpts,
        )
      : null;
  const handicapShort =
    match.team1 && match.team2
      ? describeHandicapShort(
          Math.max(teamRating(match.team1), teamRating(match.team2)),
          Math.min(teamRating(match.team1), teamRating(match.team2)),
          handicapOpts,
        )
      : null;
  const showHandicap = handicap && handicap !== "Без форы";
  const byeFinished = roundOneBye && finished && !!winnerId;

  const showScores = resultReady || finished;
  const team1ScoreDisplay =
    !showScores
      ? "—"
      : match.team1Score != null
        ? String(match.team1Score)
        : finished && winnerId
          ? team1Wins
            ? "1"
            : "0"
          : "—";
  const team2ScoreDisplay =
    !showScores
      ? "—"
      : match.team2Score != null
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
    : matchCount === 27 || matchCount === 28
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
  if (loserToNo !== undefined) {
    footerParts.push(
      roundOneBye && phantomRow
        ? `× на #${loserToNo}`
        : `проигравший на #${loserToNo}`,
    );
  }
  if (winnerToNo !== undefined) {
    footerParts.push(
      winnerKind === "bye"
        ? `автопроход на #${winnerToNo}`
        : `победитель на #${winnerToNo}`,
    );
  }

  const footerLineCount = Math.max(
    footerParts.length,
    isFixedSwissGrid ? 2 : 1,
  );
  const footerHeight = gridFooterHeight(
    isFixedSwissGrid ? Math.max(3, footerLineCount) : footerLineCount,
  );

  function handlePlayerClick(playerId: string, preview: TeamWithPlayers["player1"]) {
    onPlayerClick?.(playerId, preview);
  }

  function renderByeSlotRow() {
    const row = (
      <div
        className={cn(
          "bracket-match-bye flex w-full items-center justify-center border-b border-[var(--bracket-row-border)]",
          byeFinished && "bracket-match-bye--done",
        )}
        style={{ height: GRID_ROW_H }}
      >
        {byeFinished ? "Автопроход ✓" : "Автопроход"}
      </div>
    );
    if (openResult) {
      return (
        <button
          type="button"
          data-bracket-interactive
          onClick={openResult}
          className="w-full text-center"
        >
          {row}
        </button>
      );
    }
    return row;
  }

  return (
    <div
      className={cn(
        "llb-bracket-match flex flex-col overflow-hidden rounded-xl border border-[var(--bracket-card-border)] bg-[var(--bracket-card-bg)] shadow-[var(--bracket-card-shadow)]",
        roundOneBye && "llb-bracket-match--round1-bye",
        byeFinished && "llb-bracket-match--round1-bye-done",
        finished && winnerId && "bracket-match-card--finished",
        openResult && "bracket-match-card--interactive",
      )}
      style={{
        width: GRID_CARD_W,
        height: FIXED_SWISS_CARD_H,
      }}
    >
      <MatchArea
        onMatchClick={openResult}
        className={cn(
          "llb-bracket-match__meta flex items-center border-b border-[var(--bracket-row-border)] bg-[var(--bracket-card-bg)] px-2 text-[10px] text-[var(--bracket-meta-text)]",
          isFixedSwissGrid ? "justify-center" : "justify-between",
        )}
        style={{ height: GRID_META_H }}
      >
        {!isFixedSwissGrid ? (
          <>
            <span className="tabular-nums">Тур {match.round}</span>
            <span className="bracket-round-label font-semibold tabular-nums">
              #{matchNumber}
            </span>
            <span className="tabular-nums text-[var(--bracket-meta-text)]">
              сл.{match.slot}
            </span>
          </>
        ) : (
          <span className="bracket-round-label font-semibold tabular-nums">
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
          onMatchClick={openResult}
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
      ) : roundOneBye && phantomRow === 1 && !match.team1 ? (
        renderByeSlotRow()
      ) : (
        <TeamRow
          label={
            match.team1
              ? teamLabel(match.team1)
              : incomingPhantom === 1
                ? "×"
                : "ожидание"
          }
          rating={match.team1 ? teamRating(match.team1) : undefined}
          score={team1ScoreDisplay}
          isWinner={team1Wins}
          isLoser={finished && !!winnerId && !team1Wins && !!match.team1}
          empty={incomingPhantom === 1 && !roundOneBye}
          onMatchClick={openResult}
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
          onMatchClick={openResult}
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
          onMatchClick={openResult}
          onPlayerClick={
            onPlayerClick
              ? () => handlePlayerClick(match.team2!.player1.id, match.team2!.player1)
              : undefined
          }
        />
      ) : roundOneBye && phantomRow === 2 && !match.team2 ? (
        renderByeSlotRow()
      ) : (
        <TeamRow
          label={
            incomingPhantom === 2
              ? "×"
              : "ожидание"
          }
          score="—"
          empty={incomingPhantom === 2 && !roundOneBye}
          onMatchClick={openResult}
        />
      )}

      {showHandicap && handicapShort && (
        openResult ? (
          <button
            type="button"
            data-bracket-interactive
            onClick={openResult}
            className="bracket-match-meta bracket-match-meta--clickable line-clamp-2 min-h-0 shrink"
            title={`Фора: ${handicap}`}
          >
            <span className="bracket-match-meta-label">Фора</span>
            <span className="bracket-match-meta-value">{handicapShort}</span>
          </button>
        ) : (
          <div className="bracket-match-meta line-clamp-2 min-h-0 shrink">
            <span className="bracket-match-meta-label">Фора</span>
            <span className="bracket-match-meta-value">{handicapShort}</span>
          </div>
        )
      )}

      {footerParts.length > 0 ? (
        <MatchArea
          onMatchClick={openResult}
          className="mt-auto flex shrink-0 flex-col justify-center gap-0.5 border-t border-[var(--bracket-row-border)] px-2 py-1 text-[9px] leading-snug text-[var(--bracket-meta-text)]"
          style={{ minHeight: footerHeight }}
        >
          {footerParts.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </MatchArea>
      ) : (
        openResult && (
          <MatchArea
            onMatchClick={openResult}
            className="flex items-center justify-center border-t border-[var(--bracket-row-border)] px-2 py-1 text-[9px] text-[var(--bracket-meta-text)]"
            style={{ minHeight: footerHeight }}
          >
            результат встречи →
          </MatchArea>
        )
      )}
    </div>
  );
}
