export const COACH_REVIEW_MIN = 1;
export const COACH_REVIEW_MAX = 5;

export function formatCoachReviewAvg(avg: number | null | undefined, count: number): string {
  if (!count || avg == null) return "—";
  const rounded = Math.round(avg * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function coachReviewLabel(count: number): string {
  if (count === 0) return "Нет оценок";
  const n = count % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return `${count} оценок`;
  if (n1 === 1) return `${count} оценка`;
  if (n1 >= 2 && n1 <= 4) return `${count} оценки`;
  return `${count} оценок`;
}
