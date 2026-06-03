import type { BracketParticipantRules } from "@/lib/bracket-participant-rules";
import {
  participantCapacity,
  slotsRemaining,
  tournamentParticipantFit,
} from "@/lib/tournament-participant-limit";

export function TournamentParticipantLimitNotice({
  rules,
  activeCount,
  className,
}: {
  rules: BracketParticipantRules;
  activeCount: number;
  className?: string;
}) {
  const fit = tournamentParticipantFit(rules, activeCount);
  const remaining = slotsRemaining(rules, activeCount);
  const capacity = participantCapacity(rules);

  if (fit.fits && activeCount > 0) {
    return (
      <p className={`text-sm text-emerald-700 dark:text-emerald-300 ${className ?? ""}`}>
        Участников: {activeCount} — подходит для сетки ({rules.label}).
        {rules.exact === undefined && remaining > 0 && remaining < capacity && (
          <> Можно добавить ещё {remaining}.</>
        )}
      </p>
    );
  }

  if (fit.fits && activeCount === 0) {
    return (
      <p className={`text-sm text-zinc-500 ${className ?? ""}`}>
        Лимит сетки: {rules.label}.
      </p>
    );
  }

  if (fit.overLimit) {
    return (
      <p
        className={`rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200 ${className ?? ""}`}
        role="alert"
      >
        {fit.message}
        {" "}
        Откройте <strong>Настройки турнира</strong> и выберите сетку с подходящим лимитом
        или снимите лишних участников.
      </p>
    );
  }

  if (fit.underMin) {
    return (
      <p
        className={`rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100 ${className ?? ""}`}
      >
        {fit.message}
      </p>
    );
  }

  return null;
}
