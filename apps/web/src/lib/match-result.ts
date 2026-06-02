import type { MatchStatus } from "@/generated/prisma/enums";

export function defaultScoreInput(value: number | null | undefined): string {
  if (value == null) return "0";
  return String(value);
}

export function parseMatchScoreInputs(
  team1Score: string,
  team2Score: string,
): { ok: true; s1: number; s2: number } | { ok: false; error: string } {
  const s1 = team1Score === "" ? 0 : Number(team1Score);
  const s2 = team2Score === "" ? 0 : Number(team2Score);
  if (Number.isNaN(s1) || Number.isNaN(s2)) {
    return { ok: false, error: "Счёт должен быть числом" };
  }
  if (s1 < 0 || s2 < 0) {
    return { ok: false, error: "Счёт не может быть отрицательным" };
  }
  return { ok: true, s1, s2 };
}

/** Нельзя зафиксировать результат при 0:0 или ничьей. */
export function validateMatchScoresForFinish(s1: number, s2: number): string | null {
  if (s1 === 0 && s2 === 0) {
    return "Укажите счёт: минимум 1–0";
  }
  if (s1 === s2) {
    return "Ничья не допускается";
  }
  return null;
}

/** 1:0 и 0:1 — техническое поражение. */
export function matchStatusFromScores(s1: number, s2: number): MatchStatus {
  if ((s1 === 1 && s2 === 0) || (s1 === 0 && s2 === 1)) {
    return "WALKOVER";
  }
  return "FINISHED";
}

export function isMatchResolved(
  status: string,
  winnerTeamId?: string | null,
): boolean {
  return status === "FINISHED" || status === "WALKOVER" || !!winnerTeamId;
}

export function winnerTeamIdFromScores(
  team1Id: string,
  team2Id: string,
  s1: number,
  s2: number,
): string | undefined {
  if (s1 > s2) return team1Id;
  if (s2 > s1) return team2Id;
  return undefined;
}
