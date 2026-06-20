"use client";

import { useEffect, useState } from "react";
import { BracketPresentationShell } from "@/components/bracket/bracket-presentation-shell";
import type { BracketMatchView, SwissStandingView } from "@/lib/bracket-view";
import {
  bracketDisplayStorageKey,
  readBracketDisplayPrefs,
  type BracketCardDisplayPrefs,
} from "@/lib/bracket-display-prefs";
import { PublicBracketDisplayToolbar } from "@/components/site/public-bracket-display-toolbar";
import { PublicTournamentBracketCanvas } from "@/components/site/public-tournament-bracket-canvas";

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

  if (matches.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Сетка ещё не сформирована. Следите за обновлениями на странице турнира.
      </p>
    );
  }

  return (
    <>
      <PublicBracketDisplayToolbar
        display={display}
        onDisplayChange={setDisplay}
        onFullscreen={() => setPresentationOpen(true)}
      />
      <div className="min-w-0">
        <PublicTournamentBracketCanvas
          format={format}
          matches={matches}
          standings={standings}
          handicapHalfStep={handicapHalfStep}
          display={display}
        />
      </div>

      <BracketPresentationShell
        open={presentationOpen}
        title={tournamentName}
        onClose={() => setPresentationOpen(false)}
        variant="site"
        toolbar={
          <PublicBracketDisplayToolbar
            display={display}
            onDisplayChange={setDisplay}
            className="flex flex-wrap items-center gap-3"
          />
        }
        contentClassName="flex flex-col"
      >
        <PublicTournamentBracketCanvas
          format={format}
          matches={matches}
          standings={standings}
          handicapHalfStep={handicapHalfStep}
          display={display}
          presentation
        />
      </BracketPresentationShell>
    </>
  );
}
