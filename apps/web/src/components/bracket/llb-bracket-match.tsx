"use client";

import { describeHandicap, describeHandicapShort } from "@/lib/handicap";
import {
  bracketPlayerLabel,
  bracketTeamLabel,
} from "@/lib/bracket-display";
import { teamRating, type TeamWithPlayers } from "@/lib/pair-tournament";
import { cn } from "@/lib/cn";
import type { BracketMatchView } from "@/lib/bracket-view";
import { BracketMatchNumberRow } from "@/components/bracket/bracket-match-number-row";
import {
  isActiveBracketMatch,
  isMatchReadyForResult,
  matchAutopassBye,
} from "@/lib/bracket-view";
import { isMatchResolved } from "@/lib/match-result";
import {
  getMatchDestinations,
  GRID_CARD_W,
  GRID_FOOTER_LINE_H,
  gridFooterHeight,
  GRID_META_H,
  GRID_ROW_H,
  isIncomingAutopassPhantomForTeam,
  type SwissBracketEdge,
} from "@/lib/swiss-bracket-layout";
import {
  FIXED_SWISS_CARD_H,
  FIXED_SWISS_CARD_W,
  FIXED_SWISS_COMPACT_ROW_H,
  fixedSwissDestSplit,
  fixedSwissMatchCardHeight,
  fixedSwissMatchColForCount,
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
    empty &&
      "bracket-match-row bracket-match-row--empty !items-center !justify-center !px-2 !py-0 text-[12px]",
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
  playerHighlighted,
}: {
  label: string;
  rating?: number;
  score: string;
  isWinner?: boolean;
  isLoser?: boolean;
  empty?: boolean;
  onPlayerClick?: () => void;
  onMatchClick?: () => void;
  playerHighlighted?: boolean;
}) {
  const rowClass = playerRowClass(isWinner, isLoser, empty);

  if (empty) {
    const content = (
      <span className="w-full text-center text-[12px] leading-none">{label}</span>
    );
    if (onMatchClick) {
      return (
        <button
          type="button"
          data-bracket-interactive
          onClick={onMatchClick}
          className={rowClass}
          style={{ height: GRID_ROW_H, minHeight: GRID_ROW_H, maxHeight: GRID_ROW_H }}
        >
          {content}
        </button>
      );
    }
    return (
      <div className={rowClass} style={{ height: GRID_ROW_H, minHeight: GRID_ROW_H, maxHeight: GRID_ROW_H }}>
        {content}
      </div>
    );
  }

  return (
    <div className={cn(rowClass, "shrink-0")} style={{ height: GRID_ROW_H, minHeight: GRID_ROW_H, maxHeight: GRID_ROW_H }}>
      {onPlayerClick && !empty ? (
        <button
          type="button"
          data-bracket-interactive
          onClick={(e) => {
            e.stopPropagation();
            onPlayerClick();
          }}
          className={cn(
            "bracket-player-link min-w-0 flex-1 truncate text-left text-[12px] font-medium leading-none",
            playerHighlighted && "bracket-player-link--selected",
          )}
          title="Подсветить встречи игрока"
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
  highlightedPlayerId,
}: {
  team: TeamWithPlayers;
  score: string;
  isWinner?: boolean;
  isLoser?: boolean;
  onPlayerClick?: (playerId: string) => void;
  onMatchClick?: () => void;
  highlightedPlayerId?: string | null;
}) {
  const rowClass = playerRowClass(isWinner, isLoser);

  return (
    <div className={cn(rowClass, "shrink-0")} style={{ height: GRID_ROW_H, minHeight: GRID_ROW_H, maxHeight: GRID_ROW_H }}>
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
          highlightedPlayerId === team.player1.id && "bracket-player-link--selected",
        )}
        title={onPlayerClick ? "Подсветить встречи игрока" : undefined}
      >
        {bracketPlayerLabel(team.player1)}
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
          team.player2 &&
            highlightedPlayerId === team.player2.id &&
            "bracket-player-link--selected",
        )}
        title={onPlayerClick && team.player2 ? "Подсветить встречи игрока" : undefined}
      >
        {team.player2 ? bracketPlayerLabel(team.player2) : "—"}
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
  showCardMatchNumber = true,
  showCardHandicap = true,
  showCardPlacement = true,
  highlightedPlayerId = null,
}: {
  match: BracketMatchView;
  matchNumber: number;
  edges: SwissBracketEdge[];
  matchNumbers: Map<string, number>;
  matchById: Map<string, BracketMatchView>;
  onMatchClick?: (match: BracketMatchView) => void;
  onPlayerClick?: (playerId: string, preview?: TeamWithPlayers["player1"]) => void;
  handicapHalfStep?: boolean;
  showCardMatchNumber?: boolean;
  showCardHandicap?: boolean;
  showCardPlacement?: boolean;
  highlightedPlayerId?: string | null;
}) {
  const finished = isMatchResolved(match.status, match.winnerTeamId);
  const active = isActiveBracketMatch(match);
  const winnerId = match.winnerTeamId;
  const team1Wins = winnerId === match.team1?.id;
  const team2Wins = winnerId === match.team2?.id;
  const { isBye: roundOneBye, phantomRow } = matchAutopassBye(match);
  const incomingPhantom1 = isIncomingAutopassPhantomForTeam(
    match.id,
    1,
    edges,
    matchById,
  );
  const incomingPhantom2 = isIncomingAutopassPhantomForTeam(
    match.id,
    2,
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

  const matchCount = matchNumbers.size;
  const bracketMaxRound =
    matchById.size > 0
      ? Math.max(...Array.from(matchById.values()).map((m) => m.round))
      : 0;
  const isFixedSwissGrid = isFixedSwiss168MatchCount(matchCount);
  const roundOneCount = Array.from(matchById.values()).filter(
    (m) => m.round === 1,
  ).length;
  const gridSize = isFixedSwissGrid
    ? inferFixedSwissGridSize(matchCount)
    : Math.max(4, (roundOneCount || 1) * 2);
  const matchesPerRound = gridSize / 2;
  const maxRound = isFixedSwissGrid
    ? isFixedSwissTsLegacy29MatchCount(matchCount)
      ? bracketMaxRound || 6
      : matchCount === 27 || matchCount === 28
        ? bracketMaxRound ||
          (isFixedSwissTsLegacy27SixRound(matchCount, 6) ? 6 : 5)
        : isFixedSwiss168LegacyMatchCount(matchCount, bracketMaxRound)
          ? bracketMaxRound || 5
          : Math.max(bracketMaxRound, Math.log2(gridSize) + 1)
    : bracketMaxRound || 1;
  const bracketCol = isFixedSwissGrid
    ? fixedSwissMatchColForCount(match.round, match.slot, matchCount, maxRound)
    : 0;
  const placementLabel = fixedSwissPlacementLabel(
    match.round,
    match.slot,
    maxRound,
    matchesPerRound,
    matchCount,
    matchNumber,
  );
  const placement = showCardPlacement ? placementLabel : null;
  const winnerLine =
    showCardPlacement && winnerToNo !== undefined
      ? winnerKind === "bye"
        ? `автопроход на #${winnerToNo}`
        : `победитель на #${winnerToNo}`
      : null;
  const terminalLoserPlacement =
    finished &&
    loserToNo === undefined &&
    placement != null &&
    placement.startsWith("место ");
  const loserLine =
    showCardPlacement && loserToNo !== undefined
      ? roundOneBye && phantomRow
        ? `× на #${loserToNo}`
        : `проигравший на #${loserToNo}`
      : terminalLoserPlacement
        ? placement
        : null;

  type FooterRow =
    | { kind: "text"; text: string }
    | { kind: "split"; left: string; right: string };

  const footerRows: FooterRow[] = [];

  if (showCardPlacement) {
    if (winnerLine && loserLine) {
      if (placement && !terminalLoserPlacement) {
        footerRows.push({ kind: "text", text: placement });
      }
      const dest = fixedSwissDestSplit(bracketCol, loserLine, winnerLine);
      footerRows.push({ kind: "split", left: dest.left, right: dest.right });
    } else if (placement && winnerLine) {
      const dest = fixedSwissDestSplit(bracketCol, placement, winnerLine);
      footerRows.push({ kind: "split", left: dest.left, right: dest.right });
    } else if (placement && loserLine) {
      const dest = fixedSwissDestSplit(bracketCol, loserLine, placement);
      footerRows.push({ kind: "split", left: dest.left, right: dest.right });
    } else if (placement) {
      footerRows.push({ kind: "text", text: placement });
    } else if (winnerLine) {
      const dest = fixedSwissDestSplit(bracketCol, null, winnerLine);
      footerRows.push({ kind: "split", left: dest.left, right: dest.right });
    } else if (loserLine) {
      const dest = fixedSwissDestSplit(bracketCol, loserLine, null);
      footerRows.push({ kind: "split", left: dest.left, right: dest.right });
    }
  }
  if (match.status === "WALKOVER") {
    footerRows.push({ kind: "text", text: "тех. поражение" });
  }

  const footerRowH = isFixedSwissGrid ? FIXED_SWISS_COMPACT_ROW_H : GRID_FOOTER_LINE_H;
  const footerHeight = isFixedSwissGrid
    ? footerRows.length * footerRowH
    : gridFooterHeight(Math.max(footerRows.length, 1));
  const showHandicapRow = showCardHandicap && showHandicap && handicapShort;
  const showMatchNumberRow = showCardMatchNumber;
  const cardHeight = fixedSwissMatchCardHeight(
    Boolean(showHandicapRow),
    footerRows.length,
    showMatchNumberRow,
  );

  function handlePlayerClick(playerId: string, preview: TeamWithPlayers["player1"]) {
    onPlayerClick?.(playerId, preview);
  }

  return (
    <div
      className={cn(
        "llb-bracket-match flex flex-col overflow-hidden rounded-xl border border-[var(--bracket-card-border)] bg-[var(--bracket-card-bg)] shadow-[var(--bracket-card-shadow)]",
        finished && winnerId && "bracket-match-card--finished",
        active && "bracket-match-card--active",
        openResult && "bracket-match-card--interactive",
      )}
      style={{
        width: isFixedSwissGrid ? FIXED_SWISS_CARD_W : GRID_CARD_W,
        height: cardHeight,
        maxHeight: cardHeight,
      }}
    >
      {showMatchNumberRow && (
        <BracketMatchNumberRow
          matchNumber={matchNumber}
          tableLabel={match.tableLabel}
          streamUrl={match.streamUrl}
          onClick={openResult}
          style={{ height: GRID_META_H }}
        />
      )}

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
          highlightedPlayerId={highlightedPlayerId}
        />
      ) : roundOneBye && phantomRow === 1 && !match.team1 ? (
        <TeamRow label="×" score="—" empty onMatchClick={openResult} />
      ) : (
        <TeamRow
          label={
            match.team1
              ? bracketTeamLabel(match.team1)
              : incomingPhantom1
                ? "×"
                : "ожидание"
          }
          rating={match.team1 ? teamRating(match.team1) : undefined}
          score={team1ScoreDisplay}
          isWinner={team1Wins}
          isLoser={finished && !!winnerId && !team1Wins && !!match.team1}
          empty={incomingPhantom1 && !roundOneBye}
          onMatchClick={openResult}
          onPlayerClick={
            match.team1 && onPlayerClick
              ? () => handlePlayerClick(match.team1!.player1.id, match.team1!.player1)
              : undefined
          }
          playerHighlighted={
            highlightedPlayerId != null &&
            match.team1?.player1.id === highlightedPlayerId
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
          highlightedPlayerId={highlightedPlayerId}
        />
      ) : match.team2 ? (
        <TeamRow
          label={bracketTeamLabel(match.team2)}
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
          playerHighlighted={
            highlightedPlayerId != null &&
            match.team2.player1.id === highlightedPlayerId
          }
        />
      ) : roundOneBye && phantomRow === 2 && !match.team2 ? (
        <TeamRow label="×" score="—" empty onMatchClick={openResult} />
      ) : (
        <TeamRow
          label={
            incomingPhantom2
              ? "×"
              : "ожидание"
          }
          score="—"
          empty={incomingPhantom2 && !roundOneBye}
          onMatchClick={openResult}
        />
      )}

      {showHandicapRow && (
        openResult ? (
          <button
            type="button"
            data-bracket-interactive
            onClick={openResult}
            className="shrink-0 overflow-hidden border-t border-[var(--bracket-row-border)] px-2 text-left text-[9px] leading-[18px] text-[var(--bracket-meta-text)] transition-colors hover:bg-emerald-950/25"
            style={{ height: FIXED_SWISS_COMPACT_ROW_H, maxHeight: FIXED_SWISS_COMPACT_ROW_H }}
            title={`Фора: ${handicap}`}
          >
            <span className="block truncate">
              <span className="font-semibold uppercase tracking-wide opacity-85">
                Фора{" "}
              </span>
              {handicapShort}
            </span>
          </button>
        ) : (
          <div
            className="shrink-0 overflow-hidden border-t border-[var(--bracket-row-border)] px-2 text-[9px] leading-[18px] text-[var(--bracket-meta-text)]"
            style={{ height: FIXED_SWISS_COMPACT_ROW_H, maxHeight: FIXED_SWISS_COMPACT_ROW_H }}
            title={`Фора: ${handicap}`}
          >
            <span className="block truncate">
              <span className="font-semibold uppercase tracking-wide opacity-85">
                Фора{" "}
              </span>
              {handicapShort}
            </span>
          </div>
        )
      )}

      {footerRows.length > 0 ? (
        <MatchArea
          onMatchClick={openResult}
          className="shrink-0 overflow-hidden border-t border-[var(--bracket-row-border)] text-[8.5px] leading-[18px] text-[var(--bracket-meta-text)]"
          style={{ height: footerHeight, maxHeight: footerHeight }}
        >
          {footerRows.map((row) =>
            row.kind === "split" ? (
              <div
                key={`${row.left}|${row.right}`}
                className="grid grid-cols-2 leading-[18px]"
                style={{ height: footerRowH, maxHeight: footerRowH }}
              >
                <span
                  className="flex min-h-0 min-w-0 items-center justify-center overflow-hidden border-r border-[var(--bracket-row-border)] px-1"
                  title={row.left}
                >
                  <span className="truncate">{row.left}</span>
                </span>
                <span
                  className="flex min-h-0 min-w-0 items-center justify-end overflow-hidden px-1"
                  title={row.right}
                >
                  <span className="min-w-0 truncate text-right">{row.right}</span>
                </span>
              </div>
            ) : (
              <div
                key={row.text}
                className="truncate px-2 text-left leading-[18px]"
                style={{ height: footerRowH, maxHeight: footerRowH }}
                title={row.text}
              >
                {row.text}
              </div>
            ),
          )}
        </MatchArea>
      ) : null}
    </div>
  );
}
