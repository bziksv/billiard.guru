"use client";

import { useEffect, useState } from "react";
import { BracketPresentationShell } from "@/components/bracket/bracket-presentation-shell";
import { BracketCardDisplayToggles } from "@/components/bracket/bracket-card-display-toggles";
import { TournamentBracket } from "@/components/bracket/tournament-bracket";
import type { BracketMatchView, SwissStandingView } from "@/lib/bracket-view";
import {
  bracketDisplayStorageKey,
  readBracketDisplayPrefs,
  type BracketCardDisplayPrefs,
} from "@/lib/bracket-display-prefs";

type Props = {
  tournamentId: string;
  tournamentName: string;
  format: string;
  matches: BracketMatchView[];
  standings: SwissStandingView[];
  handicapHalfStep: boolean;
};

export function PublicTournamentBracketPanel({
  tournamentId,
  tournamentName,
  format,
  matches,
  standings,
  handicapHalfStep,
}: Props) {
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [display, setDisplay] = useState<BracketCardDisplayPrefs>(() =>
    readBracketDisplayPrefs(tournamentId),
  );

  useEffect(() => {
    localStorage.setItem(bracketDisplayStorageKey(tournamentId), JSON.stringify(display));
  }, [tournamentId, display]);

  const toggles = (
    <BracketCardDisplayToggles
      variant="site"
      showMatchNumber={display.showMatchNumber}
      showHandicap={display.showHandicap}
      showPlacement={display.showPlacement}
      onShowMatchNumberChange={(showMatchNumber) =>
        setDisplay((prefs) => ({ ...prefs, showMatchNumber }))
      }
      onShowHandicapChange={(showHandicap) =>
        setDisplay((prefs) => ({ ...prefs, showHandicap }))
      }
      onShowPlacementChange={(showPlacement) =>
        setDisplay((prefs) => ({ ...prefs, showPlacement }))
      }
    />
  );

  function renderBracket(presentation: boolean) {
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

  if (matches.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Сетка ещё не сформирована. Следите за обновлениями на странице турнира.
      </p>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-3">
        {toggles}
        <button
          type="button"
          onClick={() => setPresentationOpen(true)}
          className="site-btn-secondary shrink-0 px-4 py-2 text-sm"
        >
          На весь экран
        </button>
      </div>
      <div className="min-w-0">{renderBracket(false)}</div>

      <BracketPresentationShell
        open={presentationOpen}
        title={tournamentName}
        onClose={() => setPresentationOpen(false)}
        variant="site"
        toolbar={toggles}
        contentClassName="flex flex-col"
      >
        {renderBracket(true)}
      </BracketPresentationShell>
    </>
  );
}
