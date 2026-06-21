"use client";

import { useLocale } from "next-intl";
import {
  groupMatchesByRound,
  type BracketMatchView,
  type SwissStandingView,
} from "@/lib/bracket-view";
import {
  isDynamicSwissFormat,
  isExcelRef64Format,
  isFixedSwissFormat,
  isOlympicBronzeFormat,
  isOlympicFormat,
} from "@/lib/pair-tournament";
import { mapBracketMatchesByExcelNo } from "@/lib/excel-bracket-match-map";
import { getBracketUILabels } from "@/lib/bracket-view-labels";
import type { AppLocale } from "@/i18n/routing";
import { ExcelBracketView } from "@/components/bracket/excel-bracket-view";
import { BracketMatchCard } from "@/components/bracket/bracket-match-card";
import { OlympicBracketView } from "@/components/bracket/olympic-bracket-view";
import { SwissBracketView } from "@/components/bracket/swiss-bracket-view";

export function TournamentBracket({
  format,
  matches,
  standings = [],
  handicapHalfStep = true,
  demoPreview = false,
  showStandings = true,
  showCardMatchNumber = true,
  showCardHandicap = true,
  showCardPlacement = true,
  presentation = false,
  uiLocale: uiLocaleProp,
}: {
  format: string;
  matches: BracketMatchView[];
  standings?: SwissStandingView[];
  handicapHalfStep?: boolean;
  demoPreview?: boolean;
  showStandings?: boolean;
  showCardMatchNumber?: boolean;
  showCardHandicap?: boolean;
  showCardPlacement?: boolean;
  presentation?: boolean;
  uiLocale?: AppLocale;
}) {
  const locale = useLocale() as AppLocale;
  const uiLocale = uiLocaleProp ?? locale;
  const labels = getBracketUILabels(uiLocale);

  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
        {labels.notFormedShort}
      </p>
    );
  }

  if (isExcelRef64Format(format)) {
    const liveByMatchNo = mapBracketMatchesByExcelNo(matches);
    return (
      <ExcelBracketView liveByMatchNo={liveByMatchNo} presentation={presentation} />
    );
  }

  if (isFixedSwissFormat(format)) {
    return (
      <SwissBracketView
        matches={matches}
        standings={standings}
        fixedGrid
        handicapHalfStep={handicapHalfStep}
        demoPreview={demoPreview}
        showStandings={showStandings}
        showCardMatchNumber={showCardMatchNumber}
        showCardHandicap={showCardHandicap}
        showCardPlacement={showCardPlacement}
        presentation={presentation}
        uiLocale={uiLocale}
      />
    );
  }

  if (isDynamicSwissFormat(format)) {
    return (
      <SwissBracketView
        matches={matches}
        standings={standings}
        handicapHalfStep={handicapHalfStep}
        showStandings={showStandings}
        showCardMatchNumber={showCardMatchNumber}
        showCardHandicap={showCardHandicap}
        showCardPlacement={showCardPlacement}
        presentation={presentation}
        uiLocale={uiLocale}
      />
    );
  }

  if (isOlympicFormat(format)) {
    return (
      <OlympicBracketView
        matches={matches}
        withBronzeMatch={isOlympicBronzeFormat(format)}
        handicapHalfStep={handicapHalfStep}
        showCardMatchNumber={showCardMatchNumber}
        showCardHandicap={showCardHandicap}
        showCardPlacement={showCardPlacement}
        presentation={presentation}
        uiLocale={uiLocale}
      />
    );
  }

  const rounds = groupMatchesByRound(matches);
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-6">
        {rounds.map(({ round, matches: roundMatches }) => (
          <div key={round} className="flex w-60 flex-col gap-3">
            <p className="text-xs font-semibold uppercase text-zinc-500">
              {labels.round(round)}
            </p>
            {roundMatches.map((match) => (
              <BracketMatchCard
                key={match.id}
                match={match}
                handicapHalfStep={handicapHalfStep}
                showCardHandicap={showCardHandicap}
                uiLocale={uiLocale}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
