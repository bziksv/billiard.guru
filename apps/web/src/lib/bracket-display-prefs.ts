export type BracketCardDisplayPrefs = {
  showMatchNumber: boolean;
  showHandicap: boolean;
  showPlacement: boolean;
};

export const DEFAULT_BRACKET_CARD_DISPLAY: BracketCardDisplayPrefs = {
  showMatchNumber: true,
  showHandicap: true,
  showPlacement: true,
};

export function bracketDisplayStorageKey(tournamentId: string) {
  return `setka:bracket-display:${tournamentId}`;
}

export function readBracketDisplayPrefs(tournamentId: string): BracketCardDisplayPrefs {
  if (typeof window === "undefined") {
    return DEFAULT_BRACKET_CARD_DISPLAY;
  }
  try {
    const raw = localStorage.getItem(bracketDisplayStorageKey(tournamentId));
    if (!raw) return DEFAULT_BRACKET_CARD_DISPLAY;
    const parsed = JSON.parse(raw) as Partial<BracketCardDisplayPrefs>;
    return {
      showMatchNumber: parsed.showMatchNumber !== false,
      showHandicap: parsed.showHandicap !== false,
      showPlacement: parsed.showPlacement !== false,
    };
  } catch {
    return DEFAULT_BRACKET_CARD_DISPLAY;
  }
}
