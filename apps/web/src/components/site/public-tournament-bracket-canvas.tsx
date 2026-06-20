"use client";

import { TournamentBracket } from "@/components/bracket/tournament-bracket";
import type { BracketMatchView, SwissStandingView } from "@/lib/bracket-view";
import type { BracketCardDisplayPrefs } from "@/lib/bracket-display-prefs";

type Props = {
  format: string;
  matches: BracketMatchView[];
  standings: SwissStandingView[];
  handicapHalfStep: boolean;
  display: BracketCardDisplayPrefs;
  presentation?: boolean;
};

export function PublicTournamentBracketCanvas({
  format,
  matches,
  standings,
  handicapHalfStep,
  display,
  presentation = false,
}: Props) {
  return (
    <TournamentBracket
      format={format}
      matches={matches}
      standings={standings}
      handicapHalfStep={handicapHalfStep}
      showStandings={false}
      showCardMatchNumber={display.showMatchNumber}
      showCardHandicap={display.showHandicap}
      showCardPlacement={display.showPlacement}
      presentation={presentation}
    />
  );
}
