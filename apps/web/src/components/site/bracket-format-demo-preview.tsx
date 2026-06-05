"use client";

import { TournamentBracket } from "@/components/bracket/tournament-bracket";
import type { BracketMatchView } from "@/lib/bracket-view";

export function BracketFormatDemoPreview({
  format,
  matches,
}: {
  format: string;
  matches: BracketMatchView[];
}) {
  return (
    <div className="bracket-format-demo">
      <div className="bracket-format-demo-badge" aria-hidden>
        Демо-схема
      </div>
      <div className="bracket-format-demo-scroll">
        <TournamentBracket format={format} matches={matches} handicapHalfStep />
      </div>
      <p className="bracket-format-demo-note">
        Пример заполнения первого тура с вымышленными игроками. В вашем турнире — реальные
        участники и актуальные результаты.
      </p>
    </div>
  );
}
