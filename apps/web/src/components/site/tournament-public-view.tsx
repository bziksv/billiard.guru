"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BracketMatchView, SwissStandingView } from "@/lib/bracket-view";
import { BracketPresentationShell } from "@/components/bracket/bracket-presentation-shell";
import { PublicBracketDisplayToolbar } from "@/components/site/public-bracket-display-toolbar";
import { PublicTournamentBracketCanvas } from "@/components/site/public-tournament-bracket-canvas";
import {
  bracketDisplayStorageKey,
  DEFAULT_BRACKET_CARD_DISPLAY,
  readBracketDisplayPrefs,
  type BracketCardDisplayPrefs,
} from "@/lib/bracket-display-prefs";
import type {
  PublicParticipantRow,
  PublicStandingRow,
  PublicTournamentStandings,
} from "@/lib/tournament-public-standings";
import type { PublicMatchRow, PublicMatchStatus } from "@/lib/tournament-public-matches";
import { publicMatchStatusLabel } from "@/lib/tournament-public-matches";

export type { PublicParticipantRow };

type TabId = "results" | "participants" | "matches" | "bracket";

export type PublicBracketPanelProps = {
  tournamentId: string;
  tournamentName: string;
  format: string;
  matches: BracketMatchView[];
  standings: SwissStandingView[];
  handicapHalfStep: boolean;
};

type Props = {
  standings: PublicTournamentStandings;
  participants: PublicParticipantRow[];
  matches: PublicMatchRow[];
  matchCount: number;
  defaultTab: TabId;
  pair: boolean;
  bracket?: PublicBracketPanelProps | null;
};

function TabButton({
  active,
  onClick,
  children,
  compact = false,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        compact
          ? "site-presentation-tab font-medium transition-colors"
          : "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        active
          ? compact
            ? "bg-emerald-600 text-white shadow-sm"
            : "bg-emerald-600 text-white shadow-sm"
          : compact
            ? "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            : "home-card-body hover:text-[var(--text-primary)]",
      )}
      aria-current={active ? "true" : undefined}
    >
      {children}
    </button>
  );
}

function TournamentTabBar({
  tab,
  onTabChange,
  standings,
  participantsCount,
  matchCount,
  pair,
  compact = false,
}: {
  tab: TabId;
  onTabChange: (tab: TabId) => void;
  standings: PublicTournamentStandings;
  participantsCount: number;
  matchCount: number;
  pair: boolean;
  compact?: boolean;
}) {
  const countClass = (active: boolean) =>
    cn(
      "ml-1.5 tabular-nums",
      active
        ? compact
          ? "text-emerald-100/90"
          : "text-emerald-100/90"
        : compact
          ? "text-[var(--text-muted)]"
          : "home-card-muted",
    );

  const bar = (
    <>
      {standings.hasMatches && (
        <TabButton compact={compact} active={tab === "results"} onClick={() => onTabChange("results")}>
          Результаты
          {standings.rows.length > 0 && (
            <span className={countClass(tab === "results")}>{standings.rows.length}</span>
          )}
        </TabButton>
      )}
      <TabButton compact={compact} active={tab === "participants"} onClick={() => onTabChange("participants")}>
        {pair ? "Команды" : "Участники"}
        <span className={countClass(tab === "participants")}>{participantsCount}</span>
      </TabButton>
      {matchCount > 0 && (
        <TabButton compact={compact} active={tab === "matches"} onClick={() => onTabChange("matches")}>
          Встречи
          <span className={countClass(tab === "matches")}>{matchCount}</span>
        </TabButton>
      )}
      <TabButton compact={compact} active={tab === "bracket"} onClick={() => onTabChange("bracket")}>
        Сетка
        {matchCount > 0 && <span className={countClass(tab === "bracket")}>{matchCount}</span>}
      </TabButton>
    </>
  );

  if (compact) {
    return <div className="home-tab-bar site-presentation-tab-bar">{bar}</div>;
  }

  return <div className="home-tab-bar inline-flex max-w-full flex-wrap gap-1 rounded-xl p-1">{bar}</div>;
}

function PlayerLinks({ row }: { row: PublicStandingRow }) {
  if (row.playerHref && row.secondPlayerHref) {
    const [n1, n2] = row.name.includes(" / ")
      ? row.name.split(" / ")
      : [row.name, ""];
    return (
      <>
        <Link href={row.playerHref} className="font-medium hover:text-emerald-600 dark:hover:text-emerald-400">
          {n1}
        </Link>
        {" / "}
        <Link href={row.secondPlayerHref} className="font-medium hover:text-emerald-600 dark:hover:text-emerald-400">
          {n2}
        </Link>
      </>
    );
  }
  if (row.playerHref) {
    return (
      <Link href={row.playerHref} className="font-medium hover:text-emerald-600 dark:hover:text-emerald-400">
        {row.name}
      </Link>
    );
  }
  return <span className="font-medium">{row.name}</span>;
}

function Podium({ rows }: { rows: PublicStandingRow[] }) {
  const top = rows.filter((r) => r.placeSort <= 3 && r.placeSort > 0);
  if (top.length === 0) return null;

  const first = top.find((r) => r.placeSort === 1);
  const second = top.find((r) => r.placeSort === 2);
  const third = top.find((r) => r.placeSort === 3);

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      {[second, first, third].map((row, idx) => {
        if (!row) {
          return <div key={`empty-${idx}`} className="hidden sm:block" />;
        }
        const medal =
          row.placeSort === 1 ? "🥇" : row.placeSort === 2 ? "🥈" : "🥉";
        return (
          <div
            key={row.key}
            className={cn(
              "home-content-card rounded-xl px-4 py-4 text-center",
              row.placeSort === 1 && "sm:order-none order-first sm:-mt-2 ring-1 ring-amber-500/30",
            )}
          >
            <div className="text-2xl">{medal}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {row.placeLabel} место
            </div>
            <div className="mt-2 text-sm leading-snug">
              <PlayerLinks row={row} />
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">{row.city}</div>
          </div>
        );
      })}
    </div>
  );
}

function ResultsTab({
  standings,
  pair,
}: {
  standings: PublicTournamentStandings;
  pair: boolean;
}) {
  const { rows, finished, preliminary, hasMatches } = standings;

  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        {hasMatches ? "Итоги появятся после завершения встреч." : "Пока нет подтверждённых участников."}
      </p>
    );
  }

  const showPodium = finished && rows.some((r) => r.placeSort <= 3);
  const tableRows = showPodium ? rows.filter((r) => r.placeSort > 3 || r.placeSort === 9999) : rows;

  return (
    <div className="space-y-4">
      {finished && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400/90">
          Турнир завершён — итоговый протокол.
        </p>
      )}
      {preliminary && (
        <p className="text-sm text-[var(--text-muted)]">
          Места предварительные — обновятся по ходу турнира.
        </p>
      )}

      {showPodium && <Podium rows={rows} />}

      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-card-solid)]">
            <tr>
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Место</th>
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">
                {pair ? "Команда" : "Участник"}
              </th>
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Город</th>
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Рейтинг</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr
                key={row.key}
                className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-card-solid)]/60"
              >
                <td className="px-4 py-3 font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {row.placeLabel}
                </td>
                <td className="px-4 py-3">
                  <PlayerLinks row={row} />
                  {row.note && (
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{row.note}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{row.city}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-[var(--text-secondary)]">
                  {row.ratingLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ParticipantsTab({
  participants,
  pair,
  alwaysShowSearch = false,
}: {
  participants: PublicParticipantRow[];
  pair: boolean;
  alwaysShowSearch?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...participants].sort((a, b) => a.name.localeCompare(b.name, "ru"));
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.city?.toLowerCase().includes(q) ?? false),
    );
  }, [participants, query]);

  const pendingCount = participants.filter((p) => p.note).length;

  if (participants.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Пока никто не зарегистрирован.</p>;
  }

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          Предварительный список: показаны подтверждённые участники и поданные заявки (
          {pendingCount} ожидают подтверждения).
        </p>
      )}
      {(alwaysShowSearch || participants.length > 12) && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по имени или городу…"
          className="site-input w-full max-w-md"
        />
      )}
      <p className="text-xs text-[var(--text-muted)]">
        {filtered.length} из {participants.length}{" "}
        {pair ? "команд" : "участников"}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <li key={p.id} className="home-content-card rounded-lg px-3 py-2.5 text-sm">
            <Link href={p.href} className="font-medium hover:text-emerald-600 dark:hover:text-emerald-400">
              {p.name}
            </Link>
            {(p.city || p.ratingLabel || p.note) && (
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {[p.city, p.ratingLabel, p.note].filter(Boolean).join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BracketTabContent({
  bracket,
  display,
  onDisplayChange,
  onFullscreen,
  presentation = false,
}: {
  bracket?: PublicBracketPanelProps | null;
  display: BracketCardDisplayPrefs;
  onDisplayChange: (
    next: BracketCardDisplayPrefs | ((prev: BracketCardDisplayPrefs) => BracketCardDisplayPrefs),
  ) => void;
  onFullscreen?: () => void;
  presentation?: boolean;
}) {
  if (!bracket || bracket.matches.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Сетка ещё не сформирована. Следите за обновлениями на странице турнира.
      </p>
    );
  }

  return (
    <>
      {!presentation && (
        <PublicBracketDisplayToolbar
          display={display}
          onDisplayChange={onDisplayChange}
          onFullscreen={onFullscreen}
        />
      )}
      <div className={cn("min-w-0", presentation && "min-h-0 flex-1")}>
        <PublicTournamentBracketCanvas
          format={bracket.format}
          matches={bracket.matches}
          standings={bracket.standings}
          handicapHalfStep={bracket.handicapHalfStep}
          display={display}
          presentation={presentation}
        />
      </div>
    </>
  );
}

function renderTabPanel({
  tab,
  standings,
  participants,
  matches,
  pair,
  bracket,
  display,
  onDisplayChange,
  onFullscreen,
  presentation = false,
}: {
  tab: TabId;
  standings: PublicTournamentStandings;
  participants: PublicParticipantRow[];
  matches: PublicMatchRow[];
  pair: boolean;
  bracket?: PublicBracketPanelProps | null;
  display: BracketCardDisplayPrefs;
  onDisplayChange: (
    next: BracketCardDisplayPrefs | ((prev: BracketCardDisplayPrefs) => BracketCardDisplayPrefs),
  ) => void;
  onFullscreen?: () => void;
  presentation?: boolean;
}) {
  const alwaysShowSearch = presentation;

  switch (tab) {
    case "results":
      return <ResultsTab standings={standings} pair={pair} />;
    case "participants":
      return (
        <ParticipantsTab
          participants={participants}
          pair={pair}
          alwaysShowSearch={alwaysShowSearch}
        />
      );
    case "matches":
      return <MatchesTab matches={matches} alwaysShowSearch={alwaysShowSearch} />;
    case "bracket":
      return (
        <BracketTabContent
          bracket={bracket}
          display={display}
          onDisplayChange={onDisplayChange}
          onFullscreen={onFullscreen}
          presentation={presentation}
        />
      );
    default:
      return null;
  }
}

type MatchFilter = "all" | PublicMatchStatus;

const MATCH_FILTER_LABELS: Record<MatchFilter, string> = {
  all: "Все",
  current: "Идут",
  upcoming: "Предстоящие",
  completed: "Завершённые",
  waiting: "Ожидание",
};

function matchStatusClass(status: PublicMatchStatus): string {
  switch (status) {
    case "current":
      return "text-amber-700 dark:text-amber-400";
    case "upcoming":
      return "text-sky-700 dark:text-sky-400";
    case "completed":
      return "text-emerald-700 dark:text-emerald-400";
    default:
      return "text-[var(--text-muted)]";
  }
}

function MatchesTab({
  matches,
  alwaysShowSearch = false,
}: {
  matches: PublicMatchRow[];
  alwaysShowSearch?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MatchFilter>("all");

  const counts = useMemo(() => {
    const map: Record<MatchFilter, number> = {
      all: matches.length,
      current: 0,
      upcoming: 0,
      completed: 0,
      waiting: 0,
    };
    for (const m of matches) map[m.status] += 1;
    return map;
  }, [matches]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches.filter((m) => {
      if (filter !== "all" && m.status !== filter) return false;
      if (!q) return true;
      return (
        m.participants.toLowerCase().includes(q) ||
        m.stage.toLowerCase().includes(q) ||
        String(m.matchNo).includes(q)
      );
    });
  }, [matches, query, filter]);

  if (matches.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Встречи появятся после формирования сетки.
      </p>
    );
  }

  const filters: MatchFilter[] = ["all", "current", "upcoming", "completed", "waiting"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {filters.map((key) => {
          const count = counts[key];
          if (key !== "all" && count === 0) return null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filter === key
                  ? "bg-emerald-600 text-white"
                  : "home-content-card text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              {MATCH_FILTER_LABELS[key]}
              <span className="ml-1 tabular-nums opacity-80">{count}</span>
            </button>
          );
        })}
      </div>

      {(alwaysShowSearch || matches.length > 8) && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по участнику, этапу или №…"
          className="site-input w-full max-w-md"
        />
      )}

      <p className="text-xs text-[var(--text-muted)]">
        {filtered.length} из {matches.length} встреч
      </p>

      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-card-solid)]">
            <tr>
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">#</th>
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Этап</th>
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Встреча</th>
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Счёт</th>
              <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr
                key={m.id}
                className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-card-solid)]/60"
              >
                <td className="px-4 py-3 font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {m.matchNo}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{m.stage}</td>
                <td className="px-4 py-3 font-medium">{m.participants}</td>
                <td className="px-4 py-3 font-mono tabular-nums">{m.score}</td>
                <td className={cn("px-4 py-3 text-xs font-medium", matchStatusClass(m.status))}>
                  {publicMatchStatusLabel(m.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TournamentPublicView({
  standings,
  participants,
  matches,
  matchCount,
  defaultTab,
  pair,
  bracket,
}: Props) {
  const [tab, setTab] = useState<TabId>(defaultTab);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [display, setDisplay] = useState<BracketCardDisplayPrefs>(() =>
    bracket ? readBracketDisplayPrefs(bracket.tournamentId) : DEFAULT_BRACKET_CARD_DISPLAY,
  );

  useEffect(() => {
    if (!bracket) return;
    localStorage.setItem(
      bracketDisplayStorageKey(bracket.tournamentId),
      JSON.stringify(display),
    );
  }, [bracket, display]);

  const openPresentation = () => setPresentationOpen(true);

  const tabBarProps = {
    tab,
    onTabChange: setTab,
    standings,
    participantsCount: participants.length,
    matchCount,
    pair,
  };

  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="site-section-title">Турнир</h2>
          <TournamentTabBar {...tabBarProps} />
        </div>

        <div className="min-h-[12rem]">
          {renderTabPanel({
            tab,
            standings,
            participants,
            matches,
            pair,
            bracket,
            display,
            onDisplayChange: setDisplay,
            onFullscreen: bracket?.matches.length ? openPresentation : undefined,
          })}
        </div>
      </section>

      {bracket && bracket.matches.length > 0 && (
        <BracketPresentationShell
          open={presentationOpen}
          title={bracket.tournamentName}
          onClose={() => setPresentationOpen(false)}
          variant="site"
          tabs={
            <>
              <TournamentTabBar {...tabBarProps} compact />
              {tab === "bracket" && (
                <PublicBracketDisplayToolbar
                  display={display}
                  onDisplayChange={setDisplay}
                  className="flex shrink-0 items-center gap-3 border-l border-[var(--border-subtle)] pl-2"
                />
              )}
            </>
          }
          contentClassName={tab === "bracket" ? "flex flex-col" : "overflow-auto"}
        >
          <div
            className={cn(
              tab === "bracket" ? "flex min-h-0 flex-1 flex-col" : "p-2 sm:p-3",
            )}
          >
            {renderTabPanel({
              tab,
              standings,
              participants,
              matches,
              pair,
              bracket,
              display,
              onDisplayChange: setDisplay,
              presentation: tab === "bracket",
            })}
          </div>
        </BracketPresentationShell>
      )}
    </>
  );
}
