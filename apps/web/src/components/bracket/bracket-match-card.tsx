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
import { BracketStreamLink } from "@/components/bracket/bracket-stream-link";
import { isMatchResolved } from "@/lib/match-result";
import { GRID_FOOTER_LINE_H, GRID_META_H } from "@/lib/swiss-bracket-layout";
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
  scoreDisplay,
  showScoreColumn,
  onPlayerClick,
  onMatchClick,
  highlightedPlayerId,
}: {
  team: BracketMatchView["team1"];
  isWinner: boolean;
  isLoser: boolean;
  scoreDisplay: string;
  showScoreColumn: boolean;
  onPlayerClick?: (playerId: string, preview?: TeamPlayer) => void;
  onMatchClick?: () => void;
  highlightedPlayerId?: string | null;
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
            title="Подсветить встречи игрока"
          >
            {bracketTeamLabel(team)}
          </button>
        ) : (
          <span className="block truncate text-sm font-medium">
            {bracketTeamLabel(team)}
          </span>
        )}
        <span className="bracket-match-rating mt-0.5 block font-mono text-[10px] leading-none tabular-nums">
          ур. {teamRating(team)}
        </span>
      </div>
      {showScoreColumn && (
        <ScoreSlot
          value={scoreDisplay}
          isWinner={isWinner}
          isLoser={isLoser}
          onMatchClick={onMatchClick}
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
          className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-1 text-left text-[8.5px]"
          title={row.left}
        >
          {row.left}
        </span>
        <span
          className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap border-l border-[var(--bracket-row-border)] px-1 text-left text-[8.5px]"
          title={row.right}
        >
          {row.right}
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
        className="bracket-match-meta bracket-match-meta--clickable shrink-0 overflow-hidden border-t border-[var(--bracket-row-border)] p-0 text-[var(--bracket-meta-text)]"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="bracket-match-meta shrink-0 overflow-hidden border-t border-[var(--bracket-row-border)] p-0 text-[var(--bracket-meta-text)]">
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
}: {
  match: BracketMatchView;
  /** Как в эталоне LlbBracketMatch — только #{номер} в шапке */
  matchNumber?: number;
  /** Подвал: «матч за 3–4», «место 1–2» и т.п. */
  placementLabel?: string | null;
  /** Подвал с «проигравший / победитель на #…» (олимпийка). */
  footerRows?: BracketCardFooterRow[];
  className?: string;
  style?: CSSProperties;
  onMatchClick?: (match: BracketMatchView) => void;
  onPlayerClick?: (playerId: string, preview?: TeamPlayer) => void;
  showMatchScore?: boolean;
  /** Учитывать шаг рейтинга 0,5 в форе (из настроек турнира). */
  handicapHalfStep?: boolean;
  showCardHandicap?: boolean;
  highlightedPlayerId?: string | null;
}) {
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

  const interactiveAdmin = Boolean(onMatchClick || onPlayerClick);

  return (
    <div
      className={cn(
        "bracket-match-card",
        (!handicap || handicap === "Без форы") && !matchNumber && "bracket-match-card--compact",
        finished && winnerId && "bracket-match-card--finished",
        active && "bracket-match-card--active",
        interactiveAdmin && onMatchClick && "bracket-match-card--interactive",
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
            className="llb-bracket-match__meta bracket-match-meta--clickable flex w-full items-center justify-center gap-1.5 border-b border-[var(--bracket-row-border)] bg-[var(--bracket-card-bg)] px-2 text-[10px]"
            style={{ height: GRID_META_H }}
            title="Результат встречи"
          >
            <span className="bracket-round-label font-semibold tabular-nums">
              №{matchNumber}
            </span>
            {match.streamUrl && <BracketStreamLink url={match.streamUrl} />}
          </button>
        ) : (
          <div
            className="llb-bracket-match__meta flex items-center justify-center gap-1.5 border-b border-[var(--bracket-row-border)] bg-[var(--bracket-card-bg)] px-2 text-[10px]"
            style={{ height: GRID_META_H }}
          >
            <span className="bracket-round-label font-semibold tabular-nums">
              №{matchNumber}
            </span>
            {match.streamUrl && <BracketStreamLink url={match.streamUrl} />}
          </div>
        ))}
      <TeamLine
        team={soloSide === 2 ? null : match.team1}
        isWinner={team1Wins}
        isLoser={finished && !!winnerId && !team1Wins && !!match.team1}
        scoreDisplay={team1ScoreDisplay}
        showScoreColumn={showScoreColumn}
        onPlayerClick={onPlayerClick}
        onMatchClick={openMatch}
        highlightedPlayerId={highlightedPlayerId}
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
        />
      ) : openMatch ? (
        <button
          type="button"
          data-bracket-interactive
          onClick={openMatch}
          className="bracket-match-row bracket-match-row--empty flex w-full items-center justify-center text-[12px]"
          style={{ height: 28 }}
        >
          {roundOneBye ? "×" : "Ожидание"}
        </button>
      ) : (
        <div
          className="bracket-match-row bracket-match-row--empty flex items-center justify-center text-[12px]"
          style={{ height: 28 }}
        >
          {roundOneBye ? "×" : "Ожидание"}
        </div>
      )}
      {showCardHandicap && handicap && handicap !== "Без форы" && handicapShort && (
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
