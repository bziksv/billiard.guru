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
}: {
  format: string;
  matches: BracketMatchView[];
  standings?: SwissStandingView[];
  handicapHalfStep?: boolean;
  /** Лендинг / демо: без вертикального центрирования огромных сеток */
  demoPreview?: boolean;
}) {
  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
        Сетка ещё не сформирована.
      </p>
    );
  }

  if (isExcelRef64Format(format)) {
    const liveByMatchNo = mapBracketMatchesByExcelNo(matches);
    return <ExcelBracketView liveByMatchNo={liveByMatchNo} />;
  }

  if (isFixedSwissFormat(format)) {
    return (
      <SwissBracketView
        matches={matches}
        standings={standings}
        fixedGrid
        handicapHalfStep={handicapHalfStep}
        demoPreview={demoPreview}
      />
    );
  }

  if (isDynamicSwissFormat(format)) {
    return (
      <SwissBracketView
        matches={matches}
        standings={standings}
        handicapHalfStep={handicapHalfStep}
      />
    );
  }

  if (isOlympicFormat(format)) {
    return (
      <OlympicBracketView
        matches={matches}
        withBronzeMatch={isOlympicBronzeFormat(format)}
        handicapHalfStep={handicapHalfStep}
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
              Раунд {round}
            </p>
            {roundMatches.map((match) => (
              <BracketMatchCard
                key={match.id}
                match={match}
                handicapHalfStep={handicapHalfStep}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
