import type { CSSProperties } from "react";
import { describeHandicap, describeHandicapShort } from "@/lib/handicap";
import { teamLabel, teamRating, type TeamPlayer } from "@/lib/pair-tournament";
import { isMatchReadyForResult, type BracketMatchView } from "@/lib/bracket-view";
import { isMatchResolved } from "@/lib/match-result";
import { GRID_META_H } from "@/lib/swiss-bracket-layout";
import { cn } from "@/lib/cn";

function ScoreSlot({
  value,
  isWinner,
  isLoser,
  onMatchClick,
}: {
  value: string;
  isWinner?: boolean;
  isLoser?: boolean;
  onMatchClick?: () => void;
}) {
  const className = cn(
    "bracket-match-score-slot font-mono text-xs font-semibold tabular-nums",
    isWinner && "bracket-match-score-slot--winner",
    isLoser && "bracket-match-score-slot--loser",
    onMatchClick && "bracket-match-score-slot--clickable",
  );

  if (onMatchClick) {
    return (
      <button
        type="button"
        data-bracket-interactive
        onClick={(e) => {
          e.stopPropagation();
          onMatchClick();
        }}
        className={className}
        title="Результат встречи"
        aria-label="Результат встречи"
      >
        {value}
      </button>
    );
  }

  return <span className={className}>{value}</span>;
}

function TeamLine({
  team,
  isWinner,
  isLoser,
  score,
  showScore,
  onPlayerClick,
  onMatchClick,
}: {
  team: BracketMatchView["team1"];
  isWinner: boolean;
  isLoser: boolean;
  score?: number | null;
  showScore?: boolean;
  onPlayerClick?: (playerId: string, preview?: TeamPlayer) => void;
  onMatchClick?: () => void;
}) {
  if (!team) {
    return <div className="bracket-match-row bracket-match-row--empty">—</div>;
  }

  const scoreValue =
    showScore && score != null ? String(score) : showScore ? "—" : "·";
  const showScoreSlot = Boolean(onMatchClick || showScore);

  return (
    <div
      className={cn(
        "bracket-match-row",
        isWinner && "bracket-match-row--winner",
        isLoser && "bracket-match-row--loser",
      )}
    >
      <div className="min-w-0 flex-1">
        {onPlayerClick ? (
          <button
            type="button"
            data-bracket-interactive
            onClick={(e) => {
              e.stopPropagation();
              onPlayerClick(team.player1.id, team.player1);
            }}
            className="bracket-player-link block max-w-full truncate text-left text-sm font-medium"
            title="Профиль игрока"
          >
            {teamLabel(team)}
          </button>
        ) : (
          <span className="block truncate text-sm font-medium">{teamLabel(team)}</span>
        )}
        <span className="bracket-match-rating mt-0.5 block font-mono text-[10px] leading-none tabular-nums">
          ур. {teamRating(team)}
        </span>
      </div>
      {showScoreSlot && (
        <ScoreSlot
          value={scoreValue}
          isWinner={isWinner}
          isLoser={isLoser}
          onMatchClick={onMatchClick}
        />
      )}
    </div>
  );
}

export function BracketMatchCard({
  match,
  matchNumber,
  placementLabel,
  className,
  style,
  onMatchClick,
  onPlayerClick,
  showMatchScore = false,
}: {
  match: BracketMatchView;
  /** Как в эталоне LlbBracketMatch — только #{номер} в шапке */
  matchNumber?: number;
  /** Подвал: «матч за 3–4», «место 1–2» и т.п. */
  placementLabel?: string | null;
  className?: string;
  style?: CSSProperties;
  onMatchClick?: (match: BracketMatchView) => void;
  onPlayerClick?: (playerId: string, preview?: TeamPlayer) => void;
  showMatchScore?: boolean;
}) {
  const finished = isMatchResolved(match.status, match.winnerTeamId);
  const winnerId = match.winnerTeamId;
  const team1Wins = winnerId === match.team1?.id;
  const team2Wins = winnerId === match.team2?.id;
  const soloSide =
    match.team1 && !match.team2
      ? 1
      : !match.team1 && match.team2
        ? 2
        : null;
  const roundOneBye = soloSide !== null && match.round === 1;
  const byeFinished = roundOneBye && finished && !!winnerId;
  const showScore =
    showMatchScore &&
    finished &&
    !!match.team2 &&
    (match.team1Score != null || match.team2Score != null);

  const openMatch =
    onMatchClick && (isMatchReadyForResult(match) || finished)
      ? () => onMatchClick(match)
      : undefined;

  const handicap =
    match.team1 && match.team2
      ? describeHandicap(
          Math.max(teamRating(match.team1), teamRating(match.team2)),
          Math.min(teamRating(match.team1), teamRating(match.team2)),
        )
      : null;
  const handicapShort =
    match.team1 && match.team2
      ? describeHandicapShort(
          Math.max(teamRating(match.team1), teamRating(match.team2)),
          Math.min(teamRating(match.team1), teamRating(match.team2)),
        )
      : null;

  const interactiveAdmin = Boolean(onMatchClick || onPlayerClick);

  return (
    <div
      className={cn(
        "bracket-match-card",
        (!handicap || handicap === "Без форы") && !matchNumber && "bracket-match-card--compact",
        finished && winnerId && "bracket-match-card--finished",
        interactiveAdmin && onMatchClick && "bracket-match-card--interactive",
        roundOneBye && "llb-bracket-match--round1-bye",
        roundOneBye && byeFinished && "llb-bracket-match--round1-bye-done",
        className,
      )}
      style={style}
    >
      {matchNumber !== undefined &&
        (openMatch ? (
          <button
            type="button"
            data-bracket-interactive
            onClick={openMatch}
            className="llb-bracket-match__meta bracket-match-meta--clickable flex w-full items-center justify-center border-b border-[var(--bracket-row-border)] bg-[var(--bracket-card-bg)] px-2 text-[10px]"
            style={{ height: GRID_META_H }}
            title="Результат встречи"
          >
            <span className="bracket-round-label font-semibold tabular-nums">
              #{matchNumber}
            </span>
          </button>
        ) : (
          <div
            className="llb-bracket-match__meta flex items-center justify-center border-b border-[var(--bracket-row-border)] bg-[var(--bracket-card-bg)] px-2 text-[10px]"
            style={{ height: GRID_META_H }}
          >
            <span className="bracket-round-label font-semibold tabular-nums">
              #{matchNumber}
            </span>
          </div>
        ))}
      <TeamLine
        team={soloSide === 2 ? null : match.team1}
        isWinner={team1Wins}
        isLoser={finished && !!winnerId && !team1Wins && !!match.team1}
        score={match.team1Score}
        showScore={showScore}
        onPlayerClick={onPlayerClick}
        onMatchClick={openMatch}
      />
      {match.team2 ? (
        <TeamLine
          team={match.team2}
          isWinner={team2Wins}
          isLoser={finished && !!winnerId && !team2Wins}
          score={match.team2Score}
          showScore={showScore}
          onPlayerClick={onPlayerClick}
          onMatchClick={openMatch}
        />
      ) : openMatch ? (
        <button
          type="button"
          data-bracket-interactive
          onClick={openMatch}
          className={cn(
            roundOneBye ? "bracket-match-bye" : "bracket-match-row bracket-match-row--empty",
            roundOneBye && byeFinished && "bracket-match-bye--done",
            "w-full text-left",
          )}
        >
          {roundOneBye
            ? byeFinished
              ? "Автопроход ✓"
              : "Автопроход"
            : "Ожидание"}
        </button>
      ) : (
        <div
          className={cn(
            roundOneBye ? "bracket-match-bye" : "bracket-match-row bracket-match-row--empty",
            roundOneBye && byeFinished && "bracket-match-bye--done",
          )}
        >
          {roundOneBye
            ? byeFinished
              ? "Автопроход ✓"
              : "Автопроход"
            : "Ожидание"}
        </div>
      )}
      {handicap && handicap !== "Без форы" && handicapShort && (
        openMatch ? (
          <button
            type="button"
            data-bracket-interactive
            onClick={openMatch}
            className="bracket-match-meta bracket-match-meta--clickable"
            title={`Фора: ${handicap}`}
          >
            <span className="bracket-match-meta-label">Фора</span>
            <span className="bracket-match-meta-value">{handicapShort}</span>
          </button>
        ) : (
          <div className="bracket-match-meta" title={`Фора: ${handicap}`}>
            <span className="bracket-match-meta-label">Фора</span>
            <span className="bracket-match-meta-value">{handicapShort}</span>
          </div>
        )
      )}
      {placementLabel ? (
        openMatch ? (
          <button
            type="button"
            data-bracket-interactive
            onClick={openMatch}
            className="bracket-match-meta bracket-match-meta--clickable text-center"
          >
            {placementLabel}
          </button>
        ) : (
          <div className="bracket-match-meta text-center">{placementLabel}</div>
        )
      ) : null}
    </div>
  );
}
