"use client";

import { describeHandicap } from "@/lib/handicap";
import { teamLabel, teamRating, type TeamWithPlayers } from "@/lib/pair-tournament";
import type { BracketMatchView } from "@/lib/bracket-view";
import {
  getMatchDestinations,
  gridCardHeight,
  GRID_CARD_W,
  GRID_FOOTER_H,
  GRID_META_H,
  GRID_ROW_H,
  type SwissBracketEdge,
} from "@/lib/swiss-bracket-layout";
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
        highlight === "win" && "border-sky-600 bg-sky-950 text-sky-100",
        highlight === "loss" && "border-zinc-700 bg-zinc-900 text-zinc-500",
        highlight === "none" && "border-zinc-600 bg-zinc-950 text-zinc-500",
      )}
    >
      {value}
    </span>
  );
}

function playerRowClass(isWinner?: boolean, isLoser?: boolean, empty?: boolean) {
  return cn(
    "flex w-full items-center gap-1.5 border-b border-zinc-600/80 px-2 last:border-b-0",
    isWinner && "bg-sky-900/80 text-sky-50",
    isLoser && "bg-zinc-950 text-zinc-500",
    empty && "bg-rose-950/30 text-rose-200/70",
    !isWinner && !isLoser && !empty && "bg-zinc-900 text-zinc-100",
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
          className={cn(
            "min-w-0 flex-1 truncate text-left text-[12px] leading-none hover:text-sky-200",
            isLoser && "line-through decoration-zinc-600",
          )}
        >
          {label}
        </button>
      ) : (
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left text-[12px] leading-none",
            isLoser && "line-through decoration-zinc-600",
          )}
        >
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
          isLoser && "line-through decoration-zinc-600",
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
          isLoser && "line-through decoration-zinc-600",
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
  onMatchClick,
  onPlayerClick,
}: {
  match: BracketMatchView;
  matchNumber: number;
  edges: SwissBracketEdge[];
  matchNumbers: Map<string, number>;
  onMatchClick?: (match: BracketMatchView) => void;
  onPlayerClick?: (playerId: string, preview?: TeamWithPlayers["player1"]) => void;
}) {
  const finished = match.status === "FINISHED" || !!match.winnerTeamId;
  const winnerId = match.winnerTeamId;
  const team1Wins = winnerId === match.team1?.id;
  const team2Wins = winnerId === match.team2?.id;
  const bye = Boolean(match.team1 && !match.team2);
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
  if (loserTo !== undefined) footerParts.push(`проигравший на #${loserTo}`);
  if (winnerTo !== undefined) {
    footerParts.push(
      winnerKind === "bye"
        ? `автопроход на #${winnerTo}`
        : `победитель на #${winnerTo}`,
    );
  }

  function handlePlayerClick(playerId: string, preview: TeamWithPlayers["player1"]) {
    onPlayerClick?.(playerId, preview);
  }

  return (
    <div
      className="overflow-hidden border border-zinc-500/70 bg-zinc-100/[0.03] shadow-lg shadow-black/30"
      style={{
        width: GRID_CARD_W,
        height: gridCardHeight(Boolean(showHandicap)),
      }}
    >
      <MatchArea
        onMatchClick={openMatch}
        className="flex items-center justify-between border-b border-zinc-600/80 bg-zinc-900/90 px-2 text-[10px] text-zinc-400"
        style={{ height: GRID_META_H }}
      >
        <span className="tabular-nums">Тур {match.round}</span>
        <span className="font-semibold tabular-nums text-emerald-300/90">
          #{matchNumber}
        </span>
        <span className="tabular-nums text-zinc-600">сл.{match.slot}</span>
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
          label={match.team1 ? teamLabel(match.team1) : "—"}
          rating={match.team1 ? teamRating(match.team1) : undefined}
          score={team1ScoreDisplay}
          isWinner={team1Wins}
          isLoser={finished && !!winnerId && !team1Wins && !!match.team1}
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
          label={bye ? "×" : "ожидание"}
          score="—"
          empty={bye}
          isWinner={bye && finished && !!winnerId}
          onMatchClick={openMatch}
        />
      )}

      {showHandicap && (
        <MatchArea
          onMatchClick={openMatch}
          className="border-t border-zinc-700/60 px-2 py-0.5 text-[9px] leading-tight text-zinc-500"
        >
          фора: {handicap}
        </MatchArea>
      )}

      {footerParts.length > 0 ? (
        <MatchArea
          onMatchClick={openMatch}
          className="flex flex-col justify-center border-t border-zinc-700/50 px-2 text-[9px] leading-tight text-zinc-500"
          style={{ minHeight: GRID_FOOTER_H }}
        >
          {footerParts.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </MatchArea>
      ) : (
        openMatch && (
          <MatchArea
            onMatchClick={openMatch}
            className="flex items-center justify-center border-t border-zinc-700/40 px-2 text-[9px] text-zinc-600"
            style={{ minHeight: GRID_FOOTER_H }}
          >
            результат встречи →
          </MatchArea>
        )
      )}
    </div>
  );
}
