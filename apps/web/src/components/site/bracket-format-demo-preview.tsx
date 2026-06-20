"use client";

import { TournamentBracket } from "@/components/bracket/tournament-bracket";
import type { BracketMatchView } from "@/lib/bracket-view";
import { isLargeBracketDemo } from "@/lib/bracket-formats/demo-bracket";

export function BracketFormatDemoPreview({
  format,
  matches,
  structureDiagram,
  compactDemoMatches,
  compactDemoFormat = "FIXED_SWISS",
}: {
  format: string;
  matches: BracketMatchView[];
  /** Схема колонок для сеток 32/64 */
  structureDiagram?: string | null;
  /** Интерактивный фрагмент 16→8 для больших сеток */
  compactDemoMatches?: BracketMatchView[] | null;
  compactDemoFormat?: string;
}) {
  const useStructure = isLargeBracketDemo(matches) && Boolean(structureDiagram);

  return (
    <div className="bracket-format-demo">
      <div className="bracket-format-demo-toolbar">
        <span className="bracket-format-demo-badge" aria-hidden>
          Демо-схема
        </span>
      </div>

      {useStructure ? (
        <div className="space-y-4 px-4 pb-4">
          <pre className="guide-diagram text-xs sm:text-sm">{structureDiagram}</pre>
          {compactDemoMatches && compactDemoMatches.length > 0 && (
            <div>
              <p className="guide-body-text mb-2 text-xs leading-relaxed">
                Фрагмент интерактивной сетки (16→8): так выглядят карточки встреч и переходы
                победителя / проигравшего. Полная схема на {matches.length} встреч — в
                турнире после формирования сетки.
              </p>
              <div className="bracket-format-demo-scroll bracket-format-demo-scroll--compact">
                <TournamentBracket
                  format={compactDemoFormat}
                  matches={compactDemoMatches}
                  demoPreview
                  handicapHalfStep
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bracket-format-demo-scroll">
          <TournamentBracket
            format={format}
            matches={matches}
            demoPreview
            handicapHalfStep
          />
        </div>
      )}

      <p className="bracket-format-demo-note">
        {useStructure
          ? "Структура колонок и номера встреч (#). В турнире — реальные участники и результаты."
          : "Пример первого тура с вымышленными игроками. В вашем турнире — реальные участники и актуальные результаты."}
      </p>
    </div>
  );
}
