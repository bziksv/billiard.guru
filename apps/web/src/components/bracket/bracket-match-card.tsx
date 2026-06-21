import type { CSSProperties } from "react";
import { describeHandicap, describeHandicapShort } from "@/lib/handicap";
import { bracketTeamLabel } from "@/lib/bracket-display";
import { teamRating, type TeamPlayer } from "@/lib/pair-tournament";
import {
  isActiveBracketMatch,
  isMatchReadyForResult,
  type BracketCardFooterRow,
  type BracketMatchView,
} from "@/lib/bracket-view";
import { BracketMatchNumberRow } from "@/components/bracket/bracket-match-number-row";
import { isMatchResolved } from "@/lib/match-result";
import { GRID_FOOTER_LINE_H, GRID_META_H } from "@/lib/swiss-bracket-layout";
import { getBracketUILabels, type BracketUILabels } from "@/lib/bracket-view-labels";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

function ScoreSlot({
  value,
  isWinner,
  isLoser,
  onMatchClick,
  labels,
}: {
  value: string;
  isWinner?: boolean;
  isLoser?: boolean;
  onMatchClick?: () => void;
  labels: BracketUILabels;
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
        title={labels.matchResult}
        aria-label={labels.matchResult}
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
  scoreDisplay,
  showScoreColumn,
  onPlayerClick,
  onMatchClick,
  highlightedPlayerId,
  labels,
}: {
  team: BracketMatchView["team1"];
  isWinner: boolean;
  isLoser: boolean;
  scoreDisplay: string;
  showScoreColumn: boolean;
  onPlayerClick?: (playerId: string, preview?: TeamPlayer) => void;
  onMatchClick?: () => void;
  highlightedPlayerId?: string | null;
  labels: BracketUILabels;
}) {
  if (!team) {
    return <div className="bracket-match-row bracket-match-row--empty">—</div>;
  }

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
            className={cn(
              "bracket-player-link block max-w-full truncate text-left text-sm font-medium",
              highlightedPlayerId === team.player1.id &&
                "bracket-player-link--selected",
            )}
            title={labels.highlightPlayer}
          >
            {bracketTeamLabel(team)}
          </button>
        ) : (
          <span className="block truncate text-sm font-medium">
            {bracketTeamLabel(team)}
          </span>
        )}
        <span className="bracket-match-rating mt-0.5 block font-mono text-[10px] leading-none tabular-nums">
          {labels.ratingPrefix} {teamRating(team)}
        </span>
      </div>
      {showScoreColumn && (
        <ScoreSlot
          value={scoreDisplay}
          isWinner={isWinner}
          isLoser={isLoser}
          onMatchClick={onMatchClick}
          labels={labels}
        />
      )}
    </div>
  );
}

function CardFooter({
  rows,
  onMatchClick,
}: {
  rows: BracketCardFooterRow[];
  onMatchClick?: () => void;
}) {
  if (rows.length === 0) return null;

  const content = rows.map((row) =>
    row.kind === "split" ? (
      <div
        key={`${row.left}|${row.right}`}
        className="grid grid-cols-2 leading-[18px]"
        style={{ height: GRID_FOOTER_LINE_H, maxHeight: GRID_FOOTER_LINE_H }}
      >
        <span
          className="flex min-h-0 min-w-0 items-center justify-center overflow-hidden border-r border-[var(--bracket-row-border)] px-1 text-[8.5px]"
          title={row.left}
        >
          <span className="truncate">{row.left}</span>
        </span>
        <span
          className="flex min-h-0 min-w-0 items-center justify-end overflow-hidden px-1 text-[8.5px]"
          title={row.right}
        >
          <span className="min-w-0 truncate text-right">{row.right}</span>
        </span>
      </div>
    ) : (
      <div
        key={row.text}
        className="truncate px-2 text-left text-[8.5px] leading-[18px]"
        style={{ height: GRID_FOOTER_LINE_H, maxHeight: GRID_FOOTER_LINE_H }}
        title={row.text}
      >
        {row.text}
      </div>
    ),
  );

  if (onMatchClick) {
    return (
      <button
        type="button"
        data-bracket-interactive
        onClick={onMatchClick}
        className="bracket-match-meta bracket-match-meta--footer bracket-match-meta--clickable shrink-0 overflow-hidden border-t border-[var(--bracket-row-border)] text-[var(--bracket-meta-text)]"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="bracket-match-meta bracket-match-meta--footer shrink-0 overflow-hidden border-t border-[var(--bracket-row-border)] text-[var(--bracket-meta-text)]">
      {content}
    </div>
  );
}

function teamScoreDisplay(
  showScores: boolean,
  score: number | null | undefined,
  isWinner: boolean,
  hasTeam: boolean,
  finished: boolean,
  hasWinner: boolean,
): string {
  if (!showScores) return "—";
  if (score != null) return String(score);
  if (finished && hasWinner && hasTeam) return isWinner ? "1" : "0";
  return "—";
}

export function BracketMatchCard({
  match,
  matchNumber,
  placementLabel,
  footerRows,
  className,
  style,
  onMatchClick,
  onPlayerClick,
  showMatchScore = false,
  handicapHalfStep = true,
  showCardHandicap = true,
  highlightedPlayerId = null,
  uiLocale = "ru",
}: {
  match: BracketMatchView;
  matchNumber?: number;
  placementLabel?: string | null;
  footerRows?: BracketCardFooterRow[];
  className?: string;
  style?: CSSProperties;
  onMatchClick?: (match: BracketMatchView) => void;
  onPlayerClick?: (playerId: string, preview?: TeamPlayer) => void;
  showMatchScore?: boolean;
  handicapHalfStep?: boolean;
  showCardHandicap?: boolean;
  highlightedPlayerId?: string | null;
  uiLocale?: AppLocale;
}) {
  const labels = getBracketUILabels(uiLocale);
  const finished = isMatchResolved(match.status, match.winnerTeamId);
  const active = isActiveBracketMatch(match);
  const resultReady = isMatchReadyForResult(match);
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
  const showScores =
    Boolean(onMatchClick || showMatchScore) && (resultReady || finished);
  const showScoreColumn = Boolean(onMatchClick || showMatchScore);
  const team1ScoreDisplay = teamScoreDisplay(
    showScores,
    match.team1Score,
    team1Wins,
    !!match.team1,
    finished,
    !!winnerId,
  );
  const team2ScoreDisplay = teamScoreDisplay(
    showScores,
    match.team2Score,
    team2Wins,
    !!match.team2,
    finished,
    !!winnerId,
  );

  const openMatch =
    onMatchClick && (isMatchReadyForResult(match) || finished)
      ? () => onMatchClick(match)
      : undefined;

  const handicapOpts = { halfStep: handicapHalfStep, locale: uiLocale };
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

  const showHandicapBlock =
    showCardHandicap && handicap && handicap !== labels.noHandicap && handicapShort;

  const interactiveAdmin = Boolean(onMatchClick || onPlayerClick);

  return (
    <div
      className={cn(
        "bracket-match-card",
        !matchNumber && !showHandicapBlock && "bracket-match-card--compact",
        finished && winnerId && "bracket-match-card--finished",
        active && "bracket-match-card--active",
        interactiveAdmin && onMatchClick && "bracket-match-card--interactive",
        className,
      )}
      style={style}
    >
      {matchNumber !== undefined && (
        <BracketMatchNumberRow
          matchNumber={matchNumber}
          tableLabel={match.tableLabel}
          streamUrl={match.streamUrl}
          onClick={openMatch}
          style={{ height: GRID_META_H }}
        />
      )}
      <TeamLine
        team={soloSide === 2 ? null : match.team1}
        isWinner={team1Wins}
        isLoser={finished && !!winnerId && !team1Wins && !!match.team1}
        scoreDisplay={team1ScoreDisplay}
        showScoreColumn={showScoreColumn}
        onPlayerClick={onPlayerClick}
        onMatchClick={openMatch}
        highlightedPlayerId={highlightedPlayerId}
        labels={labels}
      />
      {match.team2 ? (
        <TeamLine
          team={match.team2}
          isWinner={team2Wins}
          isLoser={finished && !!winnerId && !team2Wins}
          scoreDisplay={team2ScoreDisplay}
          showScoreColumn={showScoreColumn}
          onPlayerClick={onPlayerClick}
          onMatchClick={openMatch}
          highlightedPlayerId={highlightedPlayerId}
          labels={labels}
        />
      ) : openMatch ? (
        <button
          type="button"
          data-bracket-interactive
          onClick={openMatch}
          className="bracket-match-row bracket-match-row--empty w-full text-[12px]"
        >
          {roundOneBye ? "×" : labels.waiting}
        </button>
      ) : (
        <div className="bracket-match-row bracket-match-row--empty text-[12px]">
          {roundOneBye ? "×" : labels.waiting}
        </div>
      )}
      {showHandicapBlock && (
        openMatch ? (
          <button
            type="button"
            data-bracket-interactive
            onClick={openMatch}
            className="bracket-match-meta bracket-match-meta--clickable"
            title={labels.handicapTitle(handicap!)}
          >
            <span className="bracket-match-meta-label">{labels.handicap}</span>
            <span className="bracket-match-meta-value">{handicapShort}</span>
          </button>
        ) : (
          <div className="bracket-match-meta" title={labels.handicapTitle(handicap!)}>
            <span className="bracket-match-meta-label">{labels.handicap}</span>
            <span className="bracket-match-meta-value">{handicapShort}</span>
          </div>
        )
      )}
      {footerRows && footerRows.length > 0 ? (
        <CardFooter rows={footerRows} onMatchClick={openMatch} />
      ) : placementLabel ? (
        <CardFooter
          rows={[{ kind: "text", text: placementLabel }]}
          onMatchClick={openMatch}
        />
      ) : null}
    </div>
  );
}
