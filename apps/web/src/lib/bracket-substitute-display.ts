/**
 * Клиент-безопасные типы и хелперы отображения замен (без Prisma).
 */

export type TournamentSubstitutionView = {
  id: string;
  matchId: string;
  side: 1 | 2;
  outgoingPlayerId: string;
  outgoingLabel: string;
  incomingPlayerId: string;
  incomingLabel: string;
  rewrittenMatchIds: string[];
  createdAt: string;
};

export function parseRewrittenIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

/** Матчи, затронутые заменой (основная + переписанные). */
export function matchIdsAffectedBySubstitutions(
  rows: TournamentSubstitutionView[],
): Set<string> {
  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.matchId);
    for (const id of r.rewrittenMatchIds) ids.add(id);
  }
  return ids;
}

export function substitutionsForMatch(
  rows: TournamentSubstitutionView[],
  matchId: string,
): TournamentSubstitutionView[] {
  return rows.filter(
    (r) => r.matchId === matchId || r.rewrittenMatchIds.includes(matchId),
  );
}

export function attachSubstitutionsToMatches<T extends { id: string }>(
  matches: T[],
  rows: TournamentSubstitutionView[],
): (T & { substitutions: TournamentSubstitutionView[] })[] {
  if (rows.length === 0) {
    return matches.map((m) => ({ ...m, substitutions: [] }));
  }
  return matches.map((m) => ({
    ...m,
    substitutions: substitutionsForMatch(rows, m.id),
  }));
}

export function formatSubstitutionNotice(
  row: TournamentSubstitutionView,
  matchNumber?: number | null,
): string {
  const meet =
    matchNumber != null ? `во встрече №${matchNumber}` : "во встрече";
  return `${row.outgoingLabel} ${meet} заменён на ${row.incomingLabel}`;
}
