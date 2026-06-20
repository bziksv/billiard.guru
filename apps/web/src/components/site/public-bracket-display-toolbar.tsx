"use client";

import { BracketCardDisplayToggles } from "@/components/bracket/bracket-card-display-toggles";
import type { BracketCardDisplayPrefs } from "@/lib/bracket-display-prefs";

type Props = {
  display: BracketCardDisplayPrefs;
  onDisplayChange: (next: BracketCardDisplayPrefs | ((prev: BracketCardDisplayPrefs) => BracketCardDisplayPrefs)) => void;
  onFullscreen?: () => void;
  className?: string;
};

export function PublicBracketDisplayToolbar({
  display,
  onDisplayChange,
  onFullscreen,
  className,
}: Props) {
  return (
    <div className={className ?? "mb-3 flex flex-wrap items-center justify-end gap-3"}>
      <BracketCardDisplayToggles
        variant="site"
        showMatchNumber={display.showMatchNumber}
        showHandicap={display.showHandicap}
        showPlacement={display.showPlacement}
        onShowMatchNumberChange={(showMatchNumber) =>
          onDisplayChange((prefs) => ({ ...prefs, showMatchNumber }))
        }
        onShowHandicapChange={(showHandicap) =>
          onDisplayChange((prefs) => ({ ...prefs, showHandicap }))
        }
        onShowPlacementChange={(showPlacement) =>
          onDisplayChange((prefs) => ({ ...prefs, showPlacement }))
        }
      />
      {onFullscreen && (
        <button
          type="button"
          onClick={onFullscreen}
          className="site-btn-secondary shrink-0 px-4 py-2 text-sm"
        >
          На весь экран
        </button>
      )}
    </div>
  );
}
