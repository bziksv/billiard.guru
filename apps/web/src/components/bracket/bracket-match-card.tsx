import type { CSSProperties } from "react";
import { describeHandicap } from "@/lib/handicap";
import { teamLabel, teamRating } from "@/lib/pair-tournament";
import type { BracketMatchView } from "@/lib/bracket-view";
import { cn } from "@/lib/cn";

function TeamLine({
  team,
  isWinner,
  isLoser,
}: {
  team: BracketMatchView["team1"];
  isWinner: boolean;
  isLoser: boolean;
}) {
  if (!team) {
    return (
      <div className="px-3 py-2 text-sm italic text-zinc-600">—</div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b border-zinc-800/80 px-3 py-2 last:border-b-0",
        isWinner && "bg-emerald-950/50 text-emerald-100",
        isLoser && "text-zinc-500 line-through decoration-zinc-600",
        !isWinner && !isLoser && "text-zinc-200",
      )}
    >
      <span className="truncate text-sm font-medium">{teamLabel(team)}</span>
      <span className="shrink-0 font-mono text-xs text-zinc-500">
        {teamRating(team)}
      </span>
    </div>
  );
}

export function BracketMatchCard({
  match,
  className,
  style,
  onMatchClick,
}: {
  match: BracketMatchView;
  className?: string;
  style?: CSSProperties;
  onMatchClick?: (match: BracketMatchView) => void;
}) {
  const finished = match.status === "FINISHED" || !!match.winnerTeamId;
  const winnerId = match.winnerTeamId;
  const team1Wins = winnerId === match.team1?.id;
  const team2Wins = winnerId === match.team2?.id;
  const bye = match.team1 && !match.team2;
  const byeFinished = bye && finished && !!winnerId;

  const handicap =
    match.team1 && match.team2
      ? describeHandicap(
          Math.max(teamRating(match.team1), teamRating(match.team2)),
          Math.min(teamRating(match.team1), teamRating(match.team2)),
        )
      : null;

  return (
    <div
      role={onMatchClick ? "button" : undefined}
      tabIndex={onMatchClick ? 0 : undefined}
      onClick={onMatchClick ? () => onMatchClick(match) : undefined}
      onKeyDown={
        onMatchClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onMatchClick(match);
              }
            }
          : undefined
      }
      className={cn(
        "w-56 overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-950 shadow-lg shadow-black/20",
        finished && winnerId && "border-emerald-900/60",
        onMatchClick && "cursor-pointer transition hover:border-emerald-700/60",
        className,
      )}
      style={style}
    >
      <TeamLine
        team={match.team1}
        isWinner={team1Wins}
        isLoser={finished && !!winnerId && !team1Wins && !!match.team1}
      />
      {match.team2 ? (
        <TeamLine
          team={match.team2}
          isWinner={team2Wins}
          isLoser={finished && !!winnerId && !team2Wins}
        />
      ) : (
        <div
          className={cn(
            "px-3 py-1.5 text-center text-xs",
            byeFinished ? "text-emerald-400" : "text-emerald-500/90",
          )}
        >
          {bye ? (byeFinished ? "Автопроход ✓" : "Автопроход") : "Ожидание"}
        </div>
      )}
      {handicap && handicap !== "Без форы" && (
        <div className="border-t border-zinc-800/80 px-3 py-1 text-[10px] leading-snug text-zinc-500">
          Фора: {handicap}
        </div>
      )}
    </div>
  );
}
