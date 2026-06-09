import { TOURNAMENT_FORMAT_LABELS } from "@/lib/validators";

/** Подпись формата: переопределение из /admin/brackets → validators → код. */
export function tournamentFormatDisplayLabel(tournament: {
  format: string;
  formatLabel?: string | null;
}): string {
  const custom = tournament.formatLabel?.trim();
  if (custom) return custom;
  return TOURNAMENT_FORMAT_LABELS[tournament.format] ?? tournament.format;
}
