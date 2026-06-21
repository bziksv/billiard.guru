"use client";

import { useLocale, useTranslations } from "next-intl";
import { TournamentBracket } from "@/components/bracket/tournament-bracket";
import type { AppLocale } from "@/i18n/routing";
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
  structureDiagram?: string | null;
  compactDemoMatches?: BracketMatchView[] | null;
  compactDemoFormat?: string;
}) {
  const t = useTranslations("brackets.demo");
  const locale = useLocale() as AppLocale;
  const useStructure = isLargeBracketDemo(matches) && Boolean(structureDiagram);

  return (
    <div className="bracket-format-demo">
      <div className="bracket-format-demo-toolbar">
        <span className="bracket-format-demo-badge" aria-hidden>
          {t("badge")}
        </span>
      </div>

      {useStructure ? (
        <div className="space-y-4 px-4 pb-4">
          <pre className="guide-diagram text-xs sm:text-sm">{structureDiagram}</pre>
          {compactDemoMatches && compactDemoMatches.length > 0 && (
            <div>
              <p className="guide-body-text mb-2 text-xs leading-relaxed">
                {t("structureFragment", { count: matches.length })}
              </p>
              <div className="bracket-format-demo-scroll bracket-format-demo-scroll--compact">
                <TournamentBracket
                  format={compactDemoFormat}
                  matches={compactDemoMatches}
                  demoPreview
                  handicapHalfStep
                  uiLocale={locale}
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
            uiLocale={locale}
          />
        </div>
      )}

      <p className="bracket-format-demo-note">
        {useStructure ? t("structureNote") : t("sampleNote")}
      </p>
    </div>
  );
}
