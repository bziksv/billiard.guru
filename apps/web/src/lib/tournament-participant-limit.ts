import type { BracketParticipantRules } from "@/lib/bracket-participant-rules";
import { validateBracketParticipantCount } from "@/lib/bracket-participant-rules";
import { isPairFormat } from "@/lib/pair-tournament";

/** Участники/команды, занимающие слот (не отменены и не отклонены). */
export function countActiveTournamentSlots(tournament: {
  format: string;
  registrations?: { status: string }[];
  teams?: { status: string }[];
}): number {
  if (isPairFormat(tournament.format)) {
    return (tournament.teams ?? []).filter(
      (t) => t.status !== "CANCELLED" && t.status !== "REJECTED",
    ).length;
  }
  return (tournament.registrations ?? []).filter(
    (r) => r.status !== "CANCELLED" && r.status !== "REJECTED",
  ).length;
}

export function participantCapacity(rules: BracketParticipantRules): number {
  return rules.exact ?? rules.max;
}

export function slotsRemaining(
  rules: BracketParticipantRules,
  currentCount: number,
): number {
  return Math.max(0, participantCapacity(rules) - currentCount);
}

export function validateCanAddParticipants(
  rules: BracketParticipantRules,
  currentCount: number,
  adding: number,
): { ok: true } | { ok: false; error: string } {
  if (adding <= 0) return { ok: true };
  const capacity = participantCapacity(rules);
  const next = currentCount + adding;
  if (next <= capacity) return { ok: true };

  const remaining = slotsRemaining(rules, currentCount);
  if (rules.exact !== undefined) {
    return {
      ok: false,
      error:
        remaining === 0
          ? `Лимит сетки — ${rules.exact} участников (сейчас ${currentCount}). Смените тип сетки в настройках или снимите лишних.`
          : `Можно добавить ещё ${remaining} (лимит — ${rules.exact}, сейчас ${currentCount}).`,
    };
  }
  return {
    ok: false,
    error:
      remaining === 0
        ? `Лимит сетки — не более ${rules.max} участников (сейчас ${currentCount}). Смените тип сетки или снимите лишних.`
        : `Можно добавить ещё ${remaining} (максимум ${rules.max}, сейчас ${currentCount}).`,
  };
}

export function tournamentParticipantFit(
  rules: BracketParticipantRules,
  count: number,
): {
  fits: boolean;
  overLimit: boolean;
  underMin: boolean;
  message: string | null;
} {
  const check = validateBracketParticipantCount("format", count, rules);
  if (check.ok) {
    return { fits: true, overLimit: false, underMin: false, message: null };
  }
  return {
    fits: false,
    overLimit: count > participantCapacity(rules),
    underMin: count < rules.min,
    message: check.error.replace("формата", "сетки"),
  };
}
