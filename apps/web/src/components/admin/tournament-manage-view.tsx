"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { PlayerContactLinks } from "@/components/admin/player-contact-links";
import { TournamentParticipantInfo } from "@/components/admin/tournament-participant-info";
import {
  buildMatchStartNowPayload,
  MatchResultModal,
  type MatchResultPayload,
} from "@/components/bracket/match-result-modal";
import { ConfirmModal } from "@/components/bracket/confirm-modal";
import { OlympicBracketView } from "@/components/bracket/olympic-bracket-view";
import { bracketPlayerLabelById } from "@/lib/bracket-display";
import { SwissBracketView } from "@/components/bracket/swiss-bracket-view";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AsyncButton } from "@/components/ui/async-text-button";
import { cn } from "@/lib/cn";
import type { BracketMatchView } from "@/lib/bracket-view";
import { describeHandicap } from "@/lib/handicap";
import { TournamentRatingRulesSummary } from "@/components/tournament/tournament-rating-rules-summary";
import { TournamentTablePicker } from "@/components/tournament/tournament-table-picker";
import {
  applyTournamentRatingsToTeam,
  TOURNAMENT_RATING_SOURCE_OPTIONS,
  type TournamentRatingSource,
} from "@/lib/tournament-rating-display";
import { formatRating, MAX_PLAYER_RATING, RATING_STEP } from "@/lib/rating";
import {
  isDynamicSwissFormat,
  isExcelRef64Format,
  isFixedSwissFormat,
  isOlympicBronzeFormat,
  isOlympicFormat,
  isPairFormat,
  isSwissFormat,
  teamLabel,
  teamRating,
  type TeamWithPlayers,
  usesFixedSwissGridEngine,
} from "@/lib/pair-tournament";
import { mapBracketMatchesByExcelNo } from "@/lib/excel-bracket-match-map";
import { ExcelBracketView } from "@/components/bracket/excel-bracket-view";
import { BracketPresentationShell } from "@/components/bracket/bracket-presentation-shell";
import { BracketScreenshotModal } from "@/components/bracket/bracket-screenshot-modal";
import { BracketStreamLink } from "@/components/bracket/bracket-stream-link";
import {
  captureBracketScreenshot,
  loadImagePreview,
} from "@/lib/bracket-screenshot";
import { isOutdatedFixedSwiss27Bracket, isOutdatedFixedSwiss32Bracket } from "@/lib/fixed-swiss-grid";
import {
  getDefaultBracketParticipantRules,
  validateBracketParticipantCount,
  type BracketParticipantRules,
} from "@/lib/bracket-participant-rules";
import { useBracketFormatOptions } from "@/hooks/use-bracket-format-options";
import {
  STATUS_OPTIONS,
  computeTournamentStandings,
  formatTournamentStandingPlace,
  type AdminTournament,
} from "@/lib/tournament-admin";
import {
  canCancelRegistration,
  canOrganizerRegisterParticipants,
} from "@/lib/tournament-registration";
import {
  TournamentParticipantRegistrationPanel,
  type TournamentRegistrationPlayer,
} from "@/components/tournament/tournament-participant-registration-panel";
import { tournamentFormatDisplayLabel } from "@/lib/tournament-format-display";
import {
  REGISTRATION_STATUS_LABELS,
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/validators";
import { AdminHorizontalScroll } from "@/components/admin/admin-horizontal-scroll";
import { adminTabClass } from "@/lib/admin-ui";
import {
  buildBracketMatchNumbers,
  filterCompletedMatches,
  filterCurrentMatches,
  filterUpcomingMatches,
  formatMatchDateTime,
  formatMatchDurationHm,
  formatMatchElapsedHm,
  matchHandicapFullLabel,
  matchHandicapShortLabel,
  matchParticipantsLabel,
  matchRatingsLabel,
  matchStageLabel,
  matchScoreLabel,
} from "@/lib/tournament-match-schedule";
import {
  parseTournamentTableStreams,
  resolveMatchStreamUrl,
  resolveTableLabel,
  tournamentTableOptions,
  type TournamentTableOption,
} from "@/lib/tournament-stream";
import { parseTournamentTableIds } from "@/lib/tournament-table-pick";
import { BracketCardDisplayToggles } from "@/components/bracket/bracket-card-display-toggles";
import {
  bracketDisplayStorageKey,
  readBracketDisplayPrefs,
  type BracketCardDisplayPrefs,
} from "@/lib/bracket-display-prefs";

type Team = AdminTournament["teams"][number] & TeamWithPlayers;
type Match = AdminTournament["matches"][number];
type ManageTab =
  | "participants"
  | "bracket"
  | "current-matches"
  | "upcoming-matches"
  | "completed-matches"
  | "protocol";

function ManageTabButtons({
  tab,
  onTabChange,
  viewMode,
  participantCount,
  currentCount,
  upcomingCount,
  completedCount,
  showScreenshot,
  onScreenshot,
  screenshotLoading,
}: {
  tab: ManageTab;
  onTabChange: (tab: ManageTab) => void;
  viewMode: TournamentManageViewMode;
  participantCount: number;
  currentCount: number;
  upcomingCount: number;
  completedCount: number;
  showScreenshot?: boolean;
  onScreenshot?: () => void | Promise<void>;
  screenshotLoading?: boolean;
}) {
  return (
    <>
      {viewMode === "full" && (
        <button
          type="button"
          onClick={() => onTabChange("participants")}
          className={adminTabClass(tab === "participants")}
        >
          Участники
          {participantCount > 0 ? ` (${participantCount})` : ""}
        </button>
      )}
      <button
        type="button"
        onClick={() => onTabChange("bracket")}
        className={adminTabClass(tab === "bracket")}
      >
        Сетка
      </button>
      <button
        type="button"
        onClick={() => onTabChange("current-matches")}
        className={adminTabClass(tab === "current-matches")}
      >
        Текущие встречи
        {currentCount > 0 ? ` (${currentCount})` : ""}
      </button>
      <button
        type="button"
        onClick={() => onTabChange("upcoming-matches")}
        className={adminTabClass(tab === "upcoming-matches")}
      >
        Предстоящие встречи
        {upcomingCount > 0 ? ` (${upcomingCount})` : ""}
      </button>
      <button
        type="button"
        onClick={() => onTabChange("completed-matches")}
        className={adminTabClass(tab === "completed-matches")}
      >
        Завершённые встречи
        {completedCount > 0 ? ` (${completedCount})` : ""}
      </button>
      <button
        type="button"
        onClick={() => onTabChange("protocol")}
        className={adminTabClass(tab === "protocol")}
      >
        Итоги
      </button>
      {showScreenshot && (
        <button
          type="button"
          onClick={() => void onScreenshot?.()}
          disabled={screenshotLoading}
          className="admin-btn admin-btn--outline shrink-0 px-3 py-1.5 text-xs sm:text-sm disabled:opacity-50"
        >
          {screenshotLoading ? "Скрин…" : "Скрин"}
        </button>
      )}
    </>
  );
}

function RegistrationActionButton({
  variant,
  onClick,
  children,
  loadingLabel = "…",
  disabled = false,
}: {
  variant: "primary" | "danger" | "outline";
  onClick: () => void | Promise<void>;
  children: ReactNode;
  loadingLabel?: string;
  disabled?: boolean;
}) {
  return (
    <AsyncButton
      onClick={onClick}
      loadingLabel={loadingLabel}
      disabled={disabled}
      className={cn(
        "admin-btn min-h-[2.25rem] min-w-[7.5rem] px-3 py-2 text-xs sm:text-sm",
        variant === "primary" && "admin-btn--primary",
        variant === "danger" && "admin-btn--danger",
        variant === "outline" && "admin-btn--outline",
      )}
    >
      {children}
    </AsyncButton>
  );
}

function ParticipantIndex({ index }: { index: number }) {
  return (
    <span className="tournament-participant-index" aria-hidden>
      {index}
    </span>
  );
}

function FeePaidCheckbox({
  checked,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  async function handleChange(next: boolean) {
    if (disabled || saving) return;
    setSaving(true);
    try {
      await onChange(next);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <label
      className={cn(
        "tournament-fee-paid-label",
        disabled && "tournament-fee-paid-label--disabled",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled || saving}
        onChange={(e) => void handleChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-600"
      />
      <span>Сдал взнос</span>
    </label>
  );
}

export type TournamentManageViewMode = "full" | "tournament" | "bracket";

function defaultManageTab(
  tournament: AdminTournament,
  viewMode: TournamentManageViewMode,
): ManageTab {
  if (viewMode === "bracket") return "bracket";
  if (viewMode === "tournament") return "participants";
  return tournament.matches.length > 0 ? "bracket" : "participants";
}

export function TournamentManageView({
  tournament: t,
  clubOptions,
  playerOptions,
  bracketLoading,
  embedded = false,
  viewMode = "full",
  initialTab,
  onConfirmRegistration,
  onRejectRegistration,
  onCancelRegistration,
  onConfirmTeam,
  onGenerateBracket,
  onResetAllMatches,
  onRegenerateBracket,
  onDeleteBracket,
  onSaveMatchResult,
  onCancelMatchResult,
  onUpdated,
  onDelete,
  presentationOpen: presentationOpenProp,
  onPresentationOpenChange,
  showTabBarFullscreenButton = true,
  clubPlayerRatings,
  registrationPlayers,
  onPlayerCreated,
}: {
  tournament: AdminTournament;
  clubOptions: { value: string; label: string }[];
  playerOptions: { value: string; label: string }[];
  bracketLoading: boolean;
  /** Клубные рейтинги для форы (источник CLUB). */
  clubPlayerRatings?: Record<string, number>;
  /** Игроки для формы «Добавить игрока» на странице турнира. */
  registrationPlayers?: TournamentRegistrationPlayer[];
  onPlayerCreated?: (player: TournamentRegistrationPlayer) => void;
  embedded?: boolean;
  /** full — все вкладки (кабинет клуба); tournament — только участники; bracket — сетка и встречи */
  viewMode?: TournamentManageViewMode;
  /** @deprecated используйте viewMode="bracket" */
  initialTab?: ManageTab;
  /** Управление полноэкранным режимом снаружи (кнопка в шапке страницы). */
  presentationOpen?: boolean;
  onPresentationOpenChange?: (open: boolean) => void;
  /** Показать «На весь экран» рядом с вкладками. Выключите, если кнопка вынесена в шапку. */
  showTabBarFullscreenButton?: boolean;
  onConfirmRegistration: (id: string) => void | Promise<void>;
  onRejectRegistration: (id: string) => void | Promise<void>;
  onCancelRegistration: (id: string) => void | Promise<void>;
  onConfirmTeam: (id: string) => void | Promise<void>;
  onGenerateBracket: () => void | Promise<void>;
  onResetAllMatches?: () => void | Promise<void>;
  onRegenerateBracket?: () => void | Promise<void>;
  onDeleteBracket?: () => void | Promise<void>;
  onSaveMatchResult: (payload: MatchResultPayload) => Promise<void>;
  onCancelMatchResult?: (matchId: string) => Promise<void>;
  onUpdated: () => void;
  onDelete: () => void;
}) {
  const effectiveViewMode: TournamentManageViewMode =
    initialTab === "bracket" ? "bracket" : viewMode;
  const [tab, setTab] = useState<ManageTab>(() =>
    defaultManageTab(t, effectiveViewMode),
  );
  const prevMatchCountRef = useRef(t.matches.length);
  const [bracketDisplay, setBracketDisplay] = useState<BracketCardDisplayPrefs>(() =>
    readBracketDisplayPrefs(t.id),
  );
  const [highlightedBracketPlayerId, setHighlightedBracketPlayerId] = useState<
    string | null
  >(null);
  const [presentationOpenInternal, setPresentationOpenInternal] = useState(false);
  const presentationOpen = presentationOpenProp ?? presentationOpenInternal;
  const setPresentationOpen = (open: boolean) => {
    onPresentationOpenChange?.(open);
    if (presentationOpenProp === undefined) {
      setPresentationOpenInternal(open);
    }
  };
  const showParticipants = effectiveViewMode !== "bracket";
  const showBracketSection = effectiveViewMode !== "tournament";

  useEffect(() => {
    const hadMatches = prevMatchCountRef.current > 0;
    const hasMatches = t.matches.length > 0;
    prevMatchCountRef.current = t.matches.length;
    if (
      !hadMatches &&
      hasMatches &&
      showBracketSection &&
      tab === "participants"
    ) {
      setTab("bracket");
    }
  }, [t.matches.length, showBracketSection, tab]);

  useEffect(() => {
    localStorage.setItem(
      bracketDisplayStorageKey(t.id),
      JSON.stringify(bracketDisplay),
    );
  }, [t.id, bracketDisplay]);

  const toggleBracketPlayerHighlight = (playerId: string) => {
    setHighlightedBracketPlayerId((prev) =>
      prev === playerId ? null : playerId,
    );
  };

  const bracketDisplayToggles =
    t.matches.length > 0 ? (
      <BracketCardDisplayToggles
        showMatchNumber={bracketDisplay.showMatchNumber}
        showHandicap={bracketDisplay.showHandicap}
        showPlacement={bracketDisplay.showPlacement}
        onShowMatchNumberChange={(showMatchNumber) =>
          setBracketDisplay((prefs) => ({ ...prefs, showMatchNumber }))
        }
        onShowHandicapChange={(showHandicap) =>
          setBracketDisplay((prefs) => ({ ...prefs, showHandicap }))
        }
        onShowPlacementChange={(showPlacement) =>
          setBracketDisplay((prefs) => ({ ...prefs, showPlacement }))
        }
      />
    ) : null;

  const showTabBar =
    showBracketSection &&
    (effectiveViewMode === "bracket" || (embedded && effectiveViewMode === "full"));
  const bracketTabOpen = (name: ManageTab) =>
    showBracketSection &&
    (effectiveViewMode === "bracket" ? tab === name : !embedded || tab === name);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editName, setEditName] = useState(t.name);
  const [editDescription, setEditDescription] = useState(t.description ?? "");
  const [editClubId, setEditClubId] = useState(t.clubId);
  const [editFormat, setEditFormat] = useState(t.format);
  const { options: formatOptions, loading: formatOptionsLoading } =
    useBracketFormatOptions(editFormat);
  const [editStatus, setEditStatus] = useState(t.status);
  const [editStartsAt, setEditStartsAt] = useState(
    t.startsAt ? t.startsAt.slice(0, 16) : "",
  );
  const [editHandicapHalfStep, setEditHandicapHalfStep] = useState(
    t.handicapHalfStep !== false,
  );
  const [editLimitByRating, setEditLimitByRating] = useState(t.ratingMax != null);
  const [editRatingMax, setEditRatingMax] = useState(
    t.ratingMax != null ? String(t.ratingMax) : "8",
  );
  const [editRatingSource, setEditRatingSource] = useState<TournamentRatingSource>(
    t.ratingSource ?? "CLUB",
  );
  const [editTableIds, setEditTableIds] = useState<string[]>(() =>
    parseTournamentTableIds(t.tableIds),
  );
  const [editTableStreams, setEditTableStreams] = useState<Record<string, string>>(() =>
    parseTournamentTableStreams(t.tableStreams),
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [bracketActionNotice, setBracketActionNotice] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<{
    blob: Blob;
    url: string;
  } | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

  function syncEditFormFromTournament() {
    setEditName(t.name);
    setEditDescription(t.description ?? "");
    setEditClubId(t.clubId);
    setEditFormat(t.format);
    setEditStatus(t.status);
    setEditStartsAt(t.startsAt ? t.startsAt.slice(0, 16) : "");
    setEditHandicapHalfStep(t.handicapHalfStep !== false);
    setEditLimitByRating(t.ratingMax != null);
    setEditRatingMax(t.ratingMax != null ? String(t.ratingMax) : "8");
    setEditRatingSource(t.ratingSource ?? "CLUB");
    setEditTableIds(parseTournamentTableIds(t.tableIds));
    setEditTableStreams(parseTournamentTableStreams(t.tableStreams));
    setEditError(null);
  }

  function toggleEditing() {
    setEditing((open) => {
      if (!open) syncEditFormFromTournament();
      return !open;
    });
  }

  const pendingRegistrations = t.registrations.filter((r) => r.status === "PENDING");
  const confirmedRegistrations = t.registrations.filter(
    (r) => r.status === "CONFIRMED",
  );
  const otherRegistrations = t.registrations.filter(
    (r) => r.status !== "PENDING" && r.status !== "CONFIRMED",
  );

  async function saveEdit() {
    setEditSaving(true);
    setEditError(null);
    const parsedMax = parseFloat(editRatingMax);
    const ratingPayload = editLimitByRating
      ? Number.isFinite(parsedMax)
        ? { ratingMax: parsedMax, ratingSource: editRatingSource }
        : {}
      : { clearRatingLimit: true };
    const res = await fetch(`/api/tournaments/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        description: editDescription,
        clubId: editClubId,
        format: editFormat,
        status: editStatus,
        startsAt: editStartsAt || null,
        handicapHalfStep: editHandicapHalfStep,
        tableIds: editTableIds,
        tableStreams: editTableStreams,
        ...ratingPayload,
      }),
    });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) {
      setEditError(data.error ?? "Ошибка сохранения");
      return;
    }
    setEditing(false);
    onUpdated();
  }

  const pair = isPairFormat(t.format);
  const swiss = isSwissFormat(t.format);
  const dynamicSwiss = isDynamicSwissFormat(t.format);
  const fixedSwiss = isFixedSwissFormat(t.format);
  const olympic = isOlympicFormat(t.format);
  const confirmedTeams = t.teams.filter((team) => team.status === "CONFIRMED");
  const confirmedCount = pair
    ? confirmedTeams.length
    : confirmedRegistrations.length;
  const maxRound = t.matches.reduce((max, m) => Math.max(max, m.round), 0);
  const currentRoundOpen = t.matches.some(
    (m) => m.round === maxRound && !m.winnerTeam && m.status !== "FINISHED",
  );
  const protocolRows = useMemo(() => computeTournamentStandings(t), [t]);
  const rounds = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const match of t.matches) {
      const list = map.get(match.round) ?? [];
      list.push(match);
      map.set(match.round, list);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [t.matches]);
  const finalRound = rounds.at(-1)?.[0];
  const bracketLocked = t.matches.length > 0;
  const registrationOpen = canOrganizerRegisterParticipants(t.status, bracketLocked);
  const activeTeams = t.teams.filter((team) => team.status !== "CANCELLED");
  const inactiveTeams = t.teams.filter(
    (team) => team.status === "CANCELLED" || team.status === "REJECTED",
  );
  const canModifyRegistrations = canCancelRegistration(
    t.status,
    "organizer",
    bracketLocked,
  );
  const participantCount = pair
    ? activeTeams.length
    : t.registrations.filter((r) => r.status !== "CANCELLED").length;
  const showSwissPoints = swiss && protocolRows.some((row) => row.points !== undefined);
  const ratingSource = t.ratingSource ?? "CLUB";
  const handicapHalfStep = t.handicapHalfStep !== false;
  const bracketMatches = useMemo<BracketMatchView[]>(
    () =>
      t.matches.map((m) => ({
        id: m.id,
        round: m.round,
        slot: m.slot,
        status: m.status,
        winnerTeamId: m.winnerTeam?.id ?? null,
        team1Score: m.team1Score,
        team2Score: m.team2Score,
        startedAt: m.startedAt,
        finishedAt: m.finishedAt,
        tableId: m.tableId ?? null,
        streamUrl: resolveMatchStreamUrl(
          { tableId: m.tableId ?? null },
          { tableIds: t.tableIds, tableStreams: t.tableStreams },
          t.club.floorPlan,
        ),
        tableLabel: resolveTableLabel(
          m.tableId ?? null,
          t.club.floorPlan,
          t.club.tableCounts,
        ),
        team1: applyTournamentRatingsToTeam(m.team1, ratingSource, clubPlayerRatings),
        team2: applyTournamentRatingsToTeam(m.team2, ratingSource, clubPlayerRatings),
      })),
    [t.matches, t.tableIds, t.tableStreams, t.club.floorPlan, ratingSource, clubPlayerRatings],
  );
  const tournamentTables = useMemo(
    () =>
      tournamentTableOptions(
        t.tableIds,
        t.club.floorPlan,
        t.club.tableCounts,
        t.tableStreams,
      ),
    [t.tableIds, t.tableStreams, t.club.floorPlan, t.club.tableCounts],
  );
  const currentMatches = useMemo(
    () => filterCurrentMatches(bracketMatches),
    [bracketMatches],
  );
  const upcomingMatches = useMemo(
    () => filterUpcomingMatches(bracketMatches, t.format),
    [bracketMatches, t.format],
  );
  const completedMatches = useMemo(
    () => filterCompletedMatches(bracketMatches, t.format),
    [bracketMatches, t.format],
  );
  const bracketMatchNumbers = useMemo(
    () => buildBracketMatchNumbers(bracketMatches, t.format),
    [bracketMatches, t.format],
  );

  const bracketPlayerHighlightFilter =
    highlightedBracketPlayerId && tab === "bracket" ? (
      <div className="flex shrink-0 items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-900">
        <span>
          Встречи:{" "}
          {bracketPlayerLabelById(bracketMatches, highlightedBracketPlayerId) ??
            "…"}
        </span>
        <button
          type="button"
          onClick={() => setHighlightedBracketPlayerId(null)}
          className="rounded border border-emerald-400/60 px-1.5 py-0.5 font-medium hover:bg-emerald-100"
        >
          Сбросить
        </button>
      </div>
    ) : null;

  const manageTabButtons = (
    <ManageTabButtons
      tab={tab}
      onTabChange={setTab}
      viewMode={effectiveViewMode}
      participantCount={participantCount}
      currentCount={currentMatches.length}
      upcomingCount={upcomingMatches.length}
      completedCount={completedMatches.length}
      showScreenshot={showBracketSection && bracketMatches.length > 0}
      onScreenshot={handleBracketScreenshot}
      screenshotLoading={screenshotLoading}
    />
  );

  async function handleBracketScreenshot() {
    if (bracketMatches.length === 0) {
      setScreenshotError("Сетка ещё не сформирована");
      return;
    }
    setScreenshotLoading(true);
    setScreenshotError(null);
    if (tab !== "bracket") {
      setTab("bracket");
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      const blob = await captureBracketScreenshot(t.name);
      const url = await loadImagePreview(blob);
      if (screenshotPreview?.url) {
        URL.revokeObjectURL(screenshotPreview.url);
      }
      setScreenshotPreview({ blob, url });
    } catch (error) {
      setScreenshotError(
        error instanceof Error ? error.message : "Не удалось сделать скрин сетки",
      );
    } finally {
      setScreenshotLoading(false);
    }
  }

  function closeScreenshotModal() {
    if (screenshotPreview?.url) {
      URL.revokeObjectURL(screenshotPreview.url);
    }
    setScreenshotPreview(null);
  }

  useEffect(() => {
    return () => {
      if (screenshotPreview?.url) {
        URL.revokeObjectURL(screenshotPreview.url);
      }
    };
  }, [screenshotPreview?.url]);

  const presentationContentIsBracket = tab === "bracket";

  const participantRegistrationPanel =
    registrationOpen && registrationPlayers && clubPlayerRatings ? (
      <TournamentParticipantRegistrationPanel
        tournament={t}
        players={registrationPlayers}
        clubPlayerRatings={clubPlayerRatings}
        onPlayerCreated={onPlayerCreated}
        onUpdated={onUpdated}
        collapsible
      />
    ) : null;

  const manageTabStrip = (
    <AdminHorizontalScroll className="min-w-0 w-full">
      <div className="flex w-max items-center gap-2 pb-0.5">
        <div className="admin-tab-bar admin-tab-bar--nowrap">{manageTabButtons}</div>
        {bracketDisplayToggles}
        {bracketPlayerHighlightFilter}
      </div>
    </AdminHorizontalScroll>
  );

  return (
    <div
      className={
        embedded
          ? "min-w-0 max-w-full space-y-4"
          : "rounded-xl border border-zinc-800 bg-zinc-950 p-4"
      }
    >
      {!embedded && (
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-semibold">{t.name}</h3>
          <StatusBadge
            status={t.status}
            label={TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}
          />
          <div className="text-sm text-zinc-400">
            <span>
              {tournamentFormatDisplayLabel(t)} · {t.club.name}
            </span>
            <TournamentRatingRulesSummary tournament={t} className="mt-1 block text-zinc-500" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={toggleEditing}
              className="text-xs text-emerald-400 hover:underline"
            >
              {editing ? "Закрыть настройки" : "Настройки турнира"}
            </button>
          </div>
        </div>
      )}

      {embedded && !presentationOpen && (showTabBar || editing) && (
        <div>
          {effectiveViewMode === "full" && !editing && (
            <h2 className="mb-3 font-semibold">
              {t.status === "ACTIVE" ? "Ведение турнира" : "Управление турниром"}
            </h2>
          )}
          <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            {showTabBar && !editing ? (
              <div className="min-w-0 flex-1 overflow-hidden">{manageTabStrip}</div>
            ) : (
              <div className="min-w-0 flex-1" />
            )}
            <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
              <button
                type="button"
                onClick={toggleEditing}
                className="text-xs text-emerald-400 hover:underline"
              >
                {editing ? "Закрыть настройки" : "Настройки турнира"}
              </button>
              {!editing && showTabBarFullscreenButton && (
                <button
                  type="button"
                  onClick={() => setPresentationOpen(true)}
                  className="admin-btn-secondary px-4 py-2 text-sm"
                >
                  На весь экран
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="admin-panel space-y-3 p-4">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="admin-input w-full rounded-lg px-3 py-2 text-sm"
            placeholder="Название"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={4}
            className="admin-input w-full resize-y rounded-lg px-3 py-2 text-sm"
            placeholder="Описание"
          />
          <SearchableSelect
            options={clubOptions}
            value={editClubId}
            onChange={setEditClubId}
            placeholder="Клуб"
            searchPlaceholder="Поиск клуба…"
          />
          <SearchableSelect
            options={formatOptionsLoading ? [] : formatOptions}
            value={editFormat}
            onChange={setEditFormat}
            placeholder={formatOptionsLoading ? "Загрузка форматов…" : "Формат"}
            searchPlaceholder="Поиск формата…"
            disabled={formatOptionsLoading}
          />
          <SearchableSelect
            options={STATUS_OPTIONS}
            value={editStatus}
            onChange={setEditStatus}
            placeholder="Статус"
            searchPlaceholder="Статус…"
          />
          <input
            type="datetime-local"
            value={editStartsAt}
            onChange={(e) => setEditStartsAt(e.target.value)}
            className="admin-input w-full rounded-lg px-3 py-2 text-sm"
          />
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={editHandicapHalfStep}
              onChange={(e) => setEditHandicapHalfStep(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--admin-input-border)] text-emerald-600"
            />
            <span>
              <span className="font-medium text-[var(--admin-text)]">Учитывать рейтинг 0,5</span>
              <span className="admin-muted mt-1 block text-xs">
                Включено: шаг 0,5 и +1 в нечётных. Выключено: 1,5 → 1 для форы (3 vs 1,5 → 2
                шара).
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={editLimitByRating}
              onChange={(e) => setEditLimitByRating(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--admin-input-border)] text-emerald-600"
            />
            <span className="font-medium text-[var(--admin-text)]">Лимит рейтинга участников</span>
          </label>
          {editLimitByRating && (
            <>
              <SearchableSelect
                label="Источник рейтинга для лимита"
                options={TOURNAMENT_RATING_SOURCE_OPTIONS}
                value={editRatingSource}
                onChange={(v) => setEditRatingSource(v as TournamentRatingSource)}
                placeholder="Источник рейтинга"
                searchPlaceholder="Рейтинг…"
              />
              <label className="block text-sm">
                <span className="admin-text-secondary mb-1 block text-xs">
                  Максимальный рейтинг (0–{MAX_PLAYER_RATING}, шаг {RATING_STEP})
                </span>
                <input
                  type="number"
                  step={RATING_STEP}
                  min={0}
                  max={MAX_PLAYER_RATING}
                  value={editRatingMax}
                  onChange={(e) => setEditRatingMax(e.target.value)}
                  className="admin-input w-full max-w-xs rounded-lg px-3 py-2 text-sm"
                />
              </label>
            </>
          )}
          <div className="admin-inset border border-[var(--admin-border)] p-3">
            <p className="text-sm font-medium text-[var(--admin-text)]">Столы и трансляции</p>
            <p className="admin-text-secondary mt-1 text-xs">
              Можно менять во время турнира: обновите ссылку на трансляцию или снимите стол,
              если его закрыли — он перестанет назначаться новым встречам.
            </p>
            <div className="mt-3">
              <TournamentTablePicker
                clubId={editClubId || t.clubId}
                selectedIds={editTableIds}
                streamUrls={editTableStreams}
                onChange={setEditTableIds}
                onStreamUrlsChange={setEditTableStreams}
              />
            </div>
          </div>
          {editError && <p className="admin-error-panel text-sm">{editError}</p>}
          <TournamentBracketSettings
            t={t}
            format={t.format}
            confirmedCount={confirmedCount}
            maxRound={maxRound}
            currentRoundOpen={currentRoundOpen}
            bracketLoading={bracketLoading}
            bracketMatches={bracketMatches}
            onGenerateBracket={onGenerateBracket}
            onResetAllMatches={onResetAllMatches}
            onRegenerateBracket={onRegenerateBracket}
            onDeleteBracket={onDeleteBracket}
            onNotice={setBracketActionNotice}
          />
          <button
            type="button"
            onClick={saveEdit}
            disabled={editSaving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {editSaving ? "Сохранение…" : "Сохранить"}
          </button>
          <div className="border-t border-[var(--admin-border)] pt-4">
            <p className="text-sm font-medium text-[var(--admin-text)]">Удаление турнира</p>
            <p className="admin-muted mt-1 text-xs">
              Регистрации, команды и все встречи будут удалены без восстановления.
            </p>
            <button
              type="button"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await onDelete();
                } finally {
                  setDeleting(false);
                }
              }}
              className="admin-btn admin-btn--danger mt-3 px-4 py-2 text-sm disabled:opacity-50"
            >
              {deleting ? "Удаление…" : "Удалить турнир"}
            </button>
          </div>
        </div>
      )}

      {!editing && t.description && (
        <p className="whitespace-pre-wrap text-sm text-zinc-300">{t.description}</p>
      )}

      {showTabBar && !editing && !embedded && (
        <div>
          {effectiveViewMode === "full" && (
            <h2 className="mb-3 font-semibold">
              {t.status === "ACTIVE" ? "Ведение турнира" : "Управление турниром"}
            </h2>
          )}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            {manageTabStrip}
            {showTabBarFullscreenButton && (
              <button
                type="button"
                onClick={() => setPresentationOpen(true)}
                className="admin-btn-secondary shrink-0 px-4 py-2 text-sm"
              >
                На весь экран
              </button>
            )}
          </div>
        </div>
      )}

      {!presentationOpen && !editing && participantRegistrationPanel}

      {!presentationOpen &&
        showParticipants &&
        (effectiveViewMode === "tournament" || !embedded || tab === "participants") && (
        <ParticipantsTab
          t={t}
          pair={pair}
          pendingRegistrations={pendingRegistrations}
          confirmedRegistrations={confirmedRegistrations}
          otherRegistrations={otherRegistrations}
          activeTeams={activeTeams}
          inactiveTeams={inactiveTeams}
          playerOptions={playerOptions}
          bracketLocked={bracketLocked}
          registrationOpen={registrationOpen}
          canModifyRegistrations={canModifyRegistrations}
          onConfirmRegistration={onConfirmRegistration}
          onRejectRegistration={onRejectRegistration}
          onCancelRegistration={onCancelRegistration}
          onConfirmTeam={onConfirmTeam}
          onUpdated={onUpdated}
        />
      )}

      {!presentationOpen && bracketTabOpen("bracket") && (
        <BracketTab
          t={t}
          format={t.format}
          bracketMatches={bracketMatches}
          matchNumbers={bracketMatchNumbers}
          confirmedCount={confirmedCount}
          maxRound={maxRound}
          currentRoundOpen={currentRoundOpen}
          bracketLoading={bracketLoading}
          onGenerateBracket={onGenerateBracket}
          showCardMatchNumber={bracketDisplay.showMatchNumber}
          showCardHandicap={bracketDisplay.showHandicap}
          showCardPlacement={bracketDisplay.showPlacement}
          highlightedPlayerId={highlightedBracketPlayerId}
          onPlayerHighlight={toggleBracketPlayerHighlight}
          actionNotice={bracketActionNotice}
          onDismissActionNotice={() => setBracketActionNotice(null)}
          onSaveMatchResult={onSaveMatchResult}
          onCancelMatchResult={onCancelMatchResult}
          tournamentTables={tournamentTables}
        />
      )}

      {!presentationOpen && bracketTabOpen("current-matches") && (
        <MatchesScheduleTab
          variant="current"
          format={t.format}
          handicapHalfStep={handicapHalfStep}
          allMatches={bracketMatches}
          matches={currentMatches}
          matchNumbers={bracketMatchNumbers}
          onSaveMatchResult={onSaveMatchResult}
          onCancelMatchResult={onCancelMatchResult}
          tournamentTables={tournamentTables}
        />
      )}

      {!presentationOpen && bracketTabOpen("upcoming-matches") && (
        <MatchesScheduleTab
          variant="upcoming"
          format={t.format}
          handicapHalfStep={handicapHalfStep}
          allMatches={bracketMatches}
          matches={upcomingMatches}
          matchNumbers={bracketMatchNumbers}
          onSaveMatchResult={onSaveMatchResult}
          onCancelMatchResult={onCancelMatchResult}
          tournamentTables={tournamentTables}
        />
      )}

      {!presentationOpen && bracketTabOpen("completed-matches") && (
        <MatchesScheduleTab
          variant="completed"
          format={t.format}
          handicapHalfStep={handicapHalfStep}
          allMatches={bracketMatches}
          matches={completedMatches}
          matchNumbers={bracketMatchNumbers}
          onSaveMatchResult={onSaveMatchResult}
          onCancelMatchResult={onCancelMatchResult}
          tournamentTables={tournamentTables}
        />
      )}

      {!presentationOpen && bracketTabOpen("protocol") && (
        <ProtocolTab
          t={t}
          swiss={swiss}
          rows={protocolRows}
          showSwissPoints={showSwissPoints}
          hasMatches={t.matches.length > 0}
        />
      )}

      <BracketPresentationShell
        open={presentationOpen}
        title={t.name}
        onClose={() => setPresentationOpen(false)}
        tabs={manageTabStrip}
        contentClassName={
          presentationContentIsBracket ? "flex flex-col" : "overflow-auto"
        }
      >
        {!editing && participantRegistrationPanel}

        {showParticipants && tab === "participants" && (
          <ParticipantsTab
            t={t}
            pair={pair}
            pendingRegistrations={pendingRegistrations}
            confirmedRegistrations={confirmedRegistrations}
            otherRegistrations={otherRegistrations}
            activeTeams={activeTeams}
            inactiveTeams={inactiveTeams}
            playerOptions={playerOptions}
            bracketLocked={bracketLocked}
            registrationOpen={registrationOpen}
            canModifyRegistrations={canModifyRegistrations}
            onConfirmRegistration={onConfirmRegistration}
            onRejectRegistration={onRejectRegistration}
            onCancelRegistration={onCancelRegistration}
            onConfirmTeam={onConfirmTeam}
            onUpdated={onUpdated}
          />
        )}

        {showBracketSection && tab === "bracket" && (
          <BracketTab
            t={t}
            format={t.format}
            bracketMatches={bracketMatches}
            matchNumbers={bracketMatchNumbers}
            confirmedCount={confirmedCount}
            maxRound={maxRound}
            currentRoundOpen={currentRoundOpen}
            bracketLoading={bracketLoading}
            onGenerateBracket={onGenerateBracket}
            showCardMatchNumber={bracketDisplay.showMatchNumber}
            showCardHandicap={bracketDisplay.showHandicap}
            showCardPlacement={bracketDisplay.showPlacement}
            highlightedPlayerId={highlightedBracketPlayerId}
            onPlayerHighlight={toggleBracketPlayerHighlight}
            inPresentation
            onSaveMatchResult={onSaveMatchResult}
            onCancelMatchResult={onCancelMatchResult}
            tournamentTables={tournamentTables}
          />
        )}

        {showBracketSection && tab === "current-matches" && (
          <MatchesScheduleTab
            variant="current"
            format={t.format}
            handicapHalfStep={handicapHalfStep}
            allMatches={bracketMatches}
            matches={currentMatches}
            matchNumbers={bracketMatchNumbers}
            onSaveMatchResult={onSaveMatchResult}
            onCancelMatchResult={onCancelMatchResult}
            tournamentTables={tournamentTables}
          />
        )}

        {showBracketSection && tab === "upcoming-matches" && (
          <MatchesScheduleTab
            variant="upcoming"
            format={t.format}
            handicapHalfStep={handicapHalfStep}
            allMatches={bracketMatches}
            matches={upcomingMatches}
            matchNumbers={bracketMatchNumbers}
            onSaveMatchResult={onSaveMatchResult}
            onCancelMatchResult={onCancelMatchResult}
            tournamentTables={tournamentTables}
          />
        )}

        {showBracketSection && tab === "completed-matches" && (
          <MatchesScheduleTab
            variant="completed"
            format={t.format}
            handicapHalfStep={handicapHalfStep}
            allMatches={bracketMatches}
            matches={completedMatches}
            matchNumbers={bracketMatchNumbers}
            onSaveMatchResult={onSaveMatchResult}
            onCancelMatchResult={onCancelMatchResult}
            tournamentTables={tournamentTables}
          />
        )}

        {showBracketSection && tab === "protocol" && (
          <ProtocolTab
            t={t}
            swiss={swiss}
            rows={protocolRows}
            showSwissPoints={showSwissPoints}
            hasMatches={t.matches.length > 0}
          />
        )}
      </BracketPresentationShell>

      <BracketScreenshotModal
        open={screenshotPreview !== null}
        tournamentName={t.name}
        tournamentUrl={
          typeof window !== "undefined"
            ? `${window.location.origin}/tournaments/${t.id}/bracket`
            : `https://billiard.guru/tournaments/${t.id}/bracket`
        }
        blob={screenshotPreview?.blob ?? null}
        previewUrl={screenshotPreview?.url ?? null}
        onClose={closeScreenshotModal}
      />

      {screenshotError && (
        <p className="admin-error-panel text-sm">{screenshotError}</p>
      )}
    </div>
  );
}

function ParticipantsTab({
  t,
  pair,
  pendingRegistrations,
  confirmedRegistrations,
  otherRegistrations,
  activeTeams,
  inactiveTeams,
  playerOptions,
  bracketLocked,
  registrationOpen,
  canModifyRegistrations,
  onConfirmRegistration,
  onRejectRegistration,
  onCancelRegistration,
  onConfirmTeam,
  onUpdated,
}: {
  t: AdminTournament;
  pair: boolean;
  pendingRegistrations: AdminTournament["registrations"];
  confirmedRegistrations: AdminTournament["registrations"];
  otherRegistrations: AdminTournament["registrations"];
  activeTeams: Team[];
  inactiveTeams: Team[];
  playerOptions: { value: string; label: string }[];
  bracketLocked: boolean;
  registrationOpen: boolean;
  canModifyRegistrations: boolean;
  onConfirmRegistration: (id: string) => void | Promise<void>;
  onRejectRegistration: (id: string) => void | Promise<void>;
  onCancelRegistration: (id: string) => void | Promise<void>;
  onConfirmTeam: (id: string) => void | Promise<void>;
  onUpdated: () => void;
}) {
  const [confirmAllError, setConfirmAllError] = useState<string | null>(null);
  const [markAllFeeOpen, setMarkAllFeeOpen] = useState(false);
  const [markAllFeeLoading, setMarkAllFeeLoading] = useState(false);
  const [markAllFeeError, setMarkAllFeeError] = useState<string | null>(null);

  const pendingWithFee = pendingRegistrations.filter((r) => r.feePaid);
  const pendingWithoutFee = pendingRegistrations.filter((r) => !r.feePaid);
  const pendingTeamsWithoutFee = activeTeams.filter(
    (team) =>
      (team.status === "PENDING" || team.status === "REJECTED") && !team.feePaid,
  );
  const markAllFeeCount = pair ? pendingTeamsWithoutFee.length : pendingWithoutFee.length;

  async function patchRegistrationFeePaid(id: string, feePaid: boolean) {
    const res = await fetch("/api/tournaments/register", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, feePaid }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось сохранить отметку взноса");
    }
  }

  async function patchTeamFeePaid(id: string, feePaid: boolean) {
    const res = await fetch("/api/tournaments/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, feePaid }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось сохранить отметку взноса");
    }
  }

  async function setRegistrationFeePaid(id: string, feePaid: boolean) {
    await patchRegistrationFeePaid(id, feePaid);
    await onUpdated();
  }

  async function setTeamFeePaid(id: string, feePaid: boolean) {
    await patchTeamFeePaid(id, feePaid);
    await onUpdated();
  }

  async function confirmAllPending() {
    if (pendingWithFee.length === 0) return;
    setConfirmAllError(null);
    try {
      for (const registration of pendingWithFee) {
        const res = await fetch("/api/tournaments/register", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: registration.id, status: "CONFIRMED" }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Не удалось подтвердить заявки");
        }
      }
      await onUpdated();
    } catch (error) {
      setConfirmAllError(error instanceof Error ? error.message : "Ошибка подтверждения");
      throw error;
    }
  }

  async function markAllFeePaid() {
    setMarkAllFeeLoading(true);
    setMarkAllFeeError(null);
    try {
      if (pair) {
        for (const team of pendingTeamsWithoutFee) {
          await patchTeamFeePaid(team.id, true);
        }
      } else {
        for (const registration of pendingWithoutFee) {
          await patchRegistrationFeePaid(registration.id, true);
        }
      }
      await onUpdated();
      setMarkAllFeeOpen(false);
    } catch (error) {
      setMarkAllFeeError(
        error instanceof Error ? error.message : "Не удалось отметить взнос",
      );
      throw error;
    } finally {
      setMarkAllFeeLoading(false);
    }
  }

  function closeMarkAllFeeModal() {
    if (markAllFeeLoading) return;
    setMarkAllFeeOpen(false);
    setMarkAllFeeError(null);
  }

  const markAllFeeLabel = pair ? "команд" : "заявок";

  return (
    <div className="space-y-4">
      {pair && activeTeams.length > 0 && (
        <div>
          {pendingTeamsWithoutFee.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setMarkAllFeeError(null);
                  setMarkAllFeeOpen(true);
                }}
                className="admin-btn admin-btn--outline px-3 py-2 text-xs sm:text-sm"
              >
                Отметить всех ({pendingTeamsWithoutFee.length})
              </button>
            </div>
          )}
          <ul className="space-y-2">
          {bracketLocked && (
            <p className="tournament-bracket-locked-hint">
              Сетка сформирована — состав пар зафиксирован, изменить или убрать нельзя.
            </p>
          )}
          {activeTeams.map((team, index) => (
            <PairTeamRow
              key={team.id}
              index={index + 1}
              team={team}
              playerOptions={playerOptions}
              bracketLocked={bracketLocked}
              onConfirm={() => onConfirmTeam(team.id)}
              onFeePaidChange={(feePaid) => setTeamFeePaid(team.id, feePaid)}
              onUpdated={onUpdated}
            />
          ))}
          </ul>
        </div>
      )}

      {!pair && pendingRegistrations.length > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="tournament-section-label tournament-section-label--pending mb-0">
              Заявки на участие ({pendingRegistrations.length})
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setMarkAllFeeError(null);
                  setMarkAllFeeOpen(true);
                }}
                disabled={pendingWithoutFee.length === 0}
                className="admin-btn admin-btn--outline px-3 py-2 text-xs sm:text-sm disabled:opacity-50"
              >
                Отметить всех
                {pendingWithoutFee.length > 0 ? ` (${pendingWithoutFee.length})` : ""}
              </button>
              <AsyncButton
                onClick={confirmAllPending}
                loadingLabel="Подтверждаем…"
                disabled={pendingWithFee.length === 0}
                className="admin-btn admin-btn--primary px-3 py-2 text-xs sm:text-sm"
              >
                Подтвердить всех{pendingWithFee.length > 0 ? ` (${pendingWithFee.length})` : ""}
              </AsyncButton>
            </div>
          </div>
          {confirmAllError && (
            <p className="admin-error-panel mb-3 text-sm">{confirmAllError}</p>
          )}
          <ul className="space-y-2">
            {pendingRegistrations.map((r, index) => (
              <li
                key={r.id}
                className="tournament-participant-card tournament-participant-card--pending"
              >
                <ParticipantIndex index={index + 1} />
                <div className="tournament-participant-card-main">
                  <TournamentParticipantInfo
                    lastName={r.player.lastName}
                    firstName={r.player.firstName}
                    rating={r.player.rating}
                    phone={r.player.phone}
                    telegramUsername={r.player.telegramUsername}
                    note={r.source === "SELF" ? "самостоятельная заявка" : null}
                  />
                </div>
                <div className="tournament-participant-card-actions">
                  <FeePaidCheckbox
                    checked={Boolean(r.feePaid)}
                    onChange={(feePaid) => setRegistrationFeePaid(r.id, feePaid)}
                  />
                  <div className="tournament-participant-card-buttons">
                    <RegistrationActionButton
                      variant="primary"
                      loadingLabel="Подтверждаем…"
                      disabled={!r.feePaid}
                      onClick={() => onConfirmRegistration(r.id)}
                    >
                      Подтвердить
                    </RegistrationActionButton>
                    <RegistrationActionButton
                      variant="danger"
                      loadingLabel="Отклоняем…"
                      onClick={() => onRejectRegistration(r.id)}
                    >
                      Отклонить
                    </RegistrationActionButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!pair && confirmedRegistrations.length > 0 && (
        <div>
          {bracketLocked && (
            <p className="tournament-bracket-locked-hint mb-2">
              Сетка сформирована — состав участников зафиксирован, снять или добавить нельзя.
            </p>
          )}
          <p className="tournament-section-label">
            Подтверждённые участники ({confirmedRegistrations.length})
          </p>
          <ul className="space-y-2">
            {confirmedRegistrations.map((r, index) => (
              <li key={r.id} className="tournament-participant-card">
                <ParticipantIndex index={index + 1} />
                <div className="tournament-participant-card-main">
                  <TournamentParticipantInfo
                    lastName={r.player.lastName}
                    firstName={r.player.firstName}
                    rating={r.player.rating}
                    phone={r.player.phone}
                    telegramUsername={r.player.telegramUsername}
                  />
                </div>
                <div className="tournament-participant-card-actions">
                  <FeePaidCheckbox checked disabled onChange={async () => {}} />
                  <StatusBadge
                    status={r.status}
                    label={REGISTRATION_STATUS_LABELS[r.status] ?? r.status}
                  />
                  {canModifyRegistrations && (
                    <RegistrationActionButton
                      variant="outline"
                      loadingLabel="Снимаем…"
                      onClick={() => onCancelRegistration(r.id)}
                    >
                      Снять
                    </RegistrationActionButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!pair && otherRegistrations.length > 0 && (
        <div>
          <p className="tournament-section-label">
            Снятые и отклонённые ({otherRegistrations.length})
          </p>
          <ul className="space-y-2">
            {otherRegistrations.map((r, index) => (
              <li key={r.id} className="tournament-participant-card opacity-80">
                <ParticipantIndex index={index + 1} />
                <div className="tournament-participant-card-main">
                  <TournamentParticipantInfo
                    lastName={r.player.lastName}
                    firstName={r.player.firstName}
                    rating={r.player.rating}
                    phone={r.player.phone}
                    telegramUsername={r.player.telegramUsername}
                  />
                </div>
                <div className="tournament-participant-card-actions">
                  {canModifyRegistrations &&
                    registrationOpen &&
                    (r.status === "CANCELLED" || r.status === "REJECTED") && (
                      <FeePaidCheckbox
                        checked={Boolean(r.feePaid)}
                        onChange={(feePaid) => setRegistrationFeePaid(r.id, feePaid)}
                      />
                    )}
                  <div className="tournament-participant-card-buttons">
                    <StatusBadge
                      status={r.status}
                      label={REGISTRATION_STATUS_LABELS[r.status] ?? r.status}
                    />
                    {canModifyRegistrations &&
                      registrationOpen &&
                      (r.status === "CANCELLED" || r.status === "REJECTED") && (
                        <RegistrationActionButton
                          variant="primary"
                          loadingLabel={
                            r.status === "CANCELLED" ? "Регистрируем…" : "Подтверждаем…"
                          }
                          disabled={!r.feePaid}
                          onClick={() => onConfirmRegistration(r.id)}
                        >
                          {r.status === "CANCELLED" ? "Зарегистрировать снова" : "Подтвердить"}
                        </RegistrationActionButton>
                      )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pair && inactiveTeams.length > 0 && (
        <div>
          <p className="tournament-section-label">
            Снятые и отклонённые пары ({inactiveTeams.length})
          </p>
          <ul className="space-y-2">
            {inactiveTeams.map((team) => (
              <li
                key={team.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm opacity-80"
              >
                <div className="min-w-0 flex-1">
                  <div>{teamLabel(team)}</div>
                  <div className="mt-1 space-y-0.5">
                    <PlayerContactLinks
                      phone={team.player1.phone}
                      telegramUsername={team.player1.telegramUsername}
                    />
                    {team.player2 && (
                      <PlayerContactLinks
                        phone={team.player2.phone}
                        telegramUsername={team.player2.telegramUsername}
                      />
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={team.status}
                    label={REGISTRATION_STATUS_LABELS[team.status] ?? team.status}
                  />
                  {canModifyRegistrations && registrationOpen && (
                    <RegistrationActionButton
                      variant="primary"
                      loadingLabel={
                        team.status === "CANCELLED" ? "Регистрируем…" : "Подтверждаем…"
                      }
                      onClick={() => onConfirmTeam(team.id)}
                    >
                      {team.status === "CANCELLED" ? "Зарегистрировать снова" : "Подтвердить"}
                    </RegistrationActionButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!pair && t.registrations.length === 0 && (
        <p className="tournament-hint">Заявок и участников пока нет.</p>
      )}

      {pair && activeTeams.length === 0 && (
        <p className="tournament-hint">Команд пока нет.</p>
      )}

      <ConfirmModal
        open={markAllFeeOpen}
        title="Отметить «Сдал взнос» у всех?"
        description={`Будет отмечено «Сдал взнос» у ${markAllFeeCount} ${markAllFeeLabel} без галки. Участники не будут подтверждены автоматически — для этого используйте «Подтвердить всех».`}
        confirmLabel="Да, отметить всех"
        variant="default"
        loading={markAllFeeLoading}
        error={markAllFeeError}
        onConfirm={markAllFeePaid}
        onClose={closeMarkAllFeeModal}
      />
    </div>
  );
}

function BracketGenerateButton({
  t,
  format,
  confirmedCount,
  maxRound,
  currentRoundOpen,
  bracketLoading,
  onGenerateBracket,
}: {
  t: AdminTournament;
  format: string;
  confirmedCount: number;
  maxRound: number;
  currentRoundOpen: boolean;
  bracketLoading: boolean;
  onGenerateBracket: () => void | Promise<void>;
}) {
  const dynamicSwiss = isDynamicSwissFormat(format);
  const excelRef = isExcelRef64Format(format);
  const fixedSwiss = isFixedSwissFormat(format);
  const olympic = isOlympicFormat(format);
  const oneShotGrid = olympic || fixedSwiss || excelRef;

  if (!dynamicSwiss && !fixedSwiss && !olympic && !excelRef) {
    return null;
  }

  const generateLabel = oneShotGrid
    ? "Сформировать сетку"
    : maxRound === 0
      ? "Сформировать 1-й тур"
      : `Сформировать тур ${maxRound + 1}`;

  const participantRules: BracketParticipantRules =
    t.participantRules ?? getDefaultBracketParticipantRules(t.format);
  const participantCheck = validateBracketParticipantCount(
    format,
    confirmedCount,
    participantRules,
  );

  const generateDisabled =
    bracketLoading ||
    confirmedCount < 2 ||
    !participantCheck.ok ||
    (dynamicSwiss && maxRound > 0 && currentRoundOpen);

  return (
    <div className="space-y-2">
      {!participantCheck.ok && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
          {participantCheck.error}
        </p>
      )}
      <button
        type="button"
        onClick={onGenerateBracket}
        disabled={generateDisabled}
        className="admin-btn admin-btn--primary px-4 py-2 text-sm disabled:opacity-50"
      >
        {bracketLoading ? "Формирование…" : generateLabel}
      </button>
      <p className="text-xs text-zinc-500">
        Подтверждённых: {confirmedCount}
        {confirmedCount < 2 && " (минимум 2)"}
        {participantCheck.ok &&
          participantRules.exact != null &&
          ` (нужно ${participantRules.exact})`}
      </p>
    </div>
  );
}

function TournamentBracketSettings({
  t,
  format,
  confirmedCount,
  maxRound,
  currentRoundOpen,
  bracketLoading,
  bracketMatches,
  onGenerateBracket,
  onResetAllMatches,
  onRegenerateBracket,
  onDeleteBracket,
  onNotice,
}: {
  t: AdminTournament;
  format: string;
  confirmedCount: number;
  maxRound: number;
  currentRoundOpen: boolean;
  bracketLoading: boolean;
  bracketMatches: BracketMatchView[];
  onGenerateBracket: () => void | Promise<void>;
  onResetAllMatches?: () => void | Promise<void>;
  onRegenerateBracket?: () => void | Promise<void>;
  onDeleteBracket?: () => void | Promise<void>;
  onNotice: (message: string | null) => void;
}) {
  const dynamicSwiss = isDynamicSwissFormat(format);
  const excelRef = isExcelRef64Format(format);
  const fixedSwiss = isFixedSwissFormat(format);
  const olympic = isOlympicFormat(format);
  const oneShotGrid = olympic || fixedSwiss || excelRef;
  const hasFinishedMatches = bracketMatches.some((m) => {
    if (!m.winnerTeamId) return false;
    if (m.team1 && m.team2) return true;
    return m.team1Score != null || m.team2Score != null;
  });
  const [confirmAction, setConfirmAction] = useState<
    "reset-all" | "regenerate" | "delete-bracket" | null
  >(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  if (!dynamicSwiss && !fixedSwiss && !olympic && !excelRef) {
    return null;
  }

  const generateLabel = oneShotGrid
    ? maxRound === 0
      ? "Сформировать сетку"
      : "Сетка сформирована"
    : maxRound === 0
      ? "Сформировать 1-й тур"
      : `Сформировать тур ${maxRound + 1}`;

  const participantRules: BracketParticipantRules =
    t.participantRules ?? getDefaultBracketParticipantRules(t.format);
  const participantCheck = validateBracketParticipantCount(
    format,
    confirmedCount,
    participantRules,
  );

  const generateDisabled =
    bracketLoading ||
    confirmLoading ||
    confirmedCount < 2 ||
    !participantCheck.ok ||
    (oneShotGrid && maxRound > 0) ||
    (dynamicSwiss && maxRound > 0 && currentRoundOpen);

  const regenerateDisabled =
    bracketLoading || confirmLoading || !participantCheck.ok;

  const outdatedFixedSwiss16 =
    fixedSwiss &&
    bracketMatches.length > 0 &&
    isOutdatedFixedSwiss27Bracket(bracketMatches);

  const outdatedFixedSwiss32 =
    fixedSwiss &&
    bracketMatches.length > 0 &&
    isOutdatedFixedSwiss32Bracket(
      bracketMatches.length,
      Math.max(...bracketMatches.map((m) => m.round)),
    );

  function closeConfirm() {
    if (confirmLoading) return;
    setConfirmAction(null);
    setConfirmError(null);
  }

  async function handleBracketConfirm() {
    if (!confirmAction) return;
    setConfirmLoading(true);
    setConfirmError(null);
    try {
      if (confirmAction === "reset-all") {
        if (!onResetAllMatches) return;
        await onResetAllMatches();
        setConfirmAction(null);
        onNotice(
          "Результаты сброшены. Сетка на месте — автопроходы применены заново.",
        );
      } else if (confirmAction === "regenerate") {
        if (!onRegenerateBracket) return;
        await onRegenerateBracket();
        setConfirmAction(null);
        onNotice(
          "Сетка пересоздана: 27 встреч, 1/4 (#21–#24), крест → 1/4, полуфинал и финал.",
        );
      } else if (confirmAction === "delete-bracket") {
        if (!onDeleteBracket) return;
        await onDeleteBracket();
        setConfirmAction(null);
        onNotice("Сетка снесена. Турнир на месте — можно сформировать заново.");
      }
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Не удалось выполнить действие");
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-zinc-700 pt-4">
      <p className="text-sm font-medium text-zinc-200">Сетка</p>
      <p className="text-xs text-zinc-500">
        Формирование и сброс сетки — только здесь, чтобы случайно не нажать на вкладке
        «Сетка».
      </p>
      {outdatedFixedSwiss16 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
          Сетка в базе устарела (2×1/4 вместо 4, крест не ведёт в 1/4). Нажмите{" "}
          <strong>«Сформировать заново»</strong>, чтобы получить эталон TS: #21–#24,
          нижняя тур 2 → 1/4, полуфинал #25–#26, финал #27.
        </p>
      )}
      {outdatedFixedSwiss32 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
          Сетка на 32 устарела. Нажмите{" "}
          <strong>«Сформировать заново»</strong>, чтобы получить актуальную сетку (59 встреч,
          10 колонок): 1/8 #41–#44, нижняя #48–#45, тур 4 #52–#49, 1/4 #53, финал #59.
        </p>
      )}
      {!participantCheck.ok && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
          {participantCheck.error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGenerateBracket}
          disabled={generateDisabled}
          className="admin-btn admin-btn--primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {bracketLoading ? "Формирование…" : generateLabel}
        </button>
        {bracketMatches.length > 0 && onResetAllMatches && (
          <button
            type="button"
            onClick={() => {
              setConfirmError(null);
              setConfirmAction("reset-all");
            }}
            disabled={bracketLoading || !hasFinishedMatches || confirmLoading}
            className="admin-btn px-4 py-2 text-sm disabled:opacity-50"
          >
            Отменить все встречи
          </button>
        )}
        {bracketMatches.length > 0 && onDeleteBracket && (
          <button
            type="button"
            onClick={() => {
              setConfirmError(null);
              setConfirmAction("delete-bracket");
            }}
            disabled={bracketLoading || confirmLoading}
            className="admin-btn admin-btn--danger px-4 py-2 text-sm disabled:opacity-50"
          >
            Удалить встречи
          </button>
        )}
        {bracketMatches.length > 0 && oneShotGrid && onRegenerateBracket && (
          <button
            type="button"
            onClick={() => {
              setConfirmError(null);
              setConfirmAction("regenerate");
            }}
            disabled={regenerateDisabled}
            className="admin-btn admin-btn--danger px-4 py-2 text-sm disabled:opacity-50"
          >
            Сформировать заново
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        Подтверждённых: {confirmedCount}
        {confirmedCount < 2 && " (минимум 2)"}
        {participantCheck.ok &&
          participantRules.exact != null &&
          maxRound === 0 &&
          ` (нужно ${participantRules.exact})`}
        {dynamicSwiss && maxRound > 0 && currentRoundOpen && " · завершите текущий тур"}
        {fixedSwiss && maxRound === 0 && " · все встречи и переходы (#) будут созданы сразу"}
        {olympic && maxRound === 0 && " · олимпийская сетка целиком, как в приказе"}
      </p>
      <ConfirmModal
        open={confirmAction === "reset-all"}
        title="Отменить все встречи?"
        description="Результаты всех завершённых встреч будут сброшены. Сетка останется — игроки вернутся к стартовым позициям первого тура. Автопроходы (×) применятся снова автоматически."
        confirmLabel="Да, отменить все"
        variant="danger"
        loading={confirmLoading}
        error={confirmError}
        onConfirm={handleBracketConfirm}
        onClose={closeConfirm}
      />
      <ConfirmModal
        open={confirmAction === "regenerate"}
        title="Сформировать сетку заново?"
        description="Текущая сетка будет удалена и создана заново по списку подтверждённых участников. Все результаты и расстановка будут потеряны."
        confirmLabel="Да, пересоздать"
        variant="danger"
        loading={confirmLoading}
        error={confirmError}
        onConfirm={handleBracketConfirm}
        onClose={closeConfirm}
      />
      <ConfirmModal
        open={confirmAction === "delete-bracket"}
        title="Снести сетку? Турнир останется"
        description="Будут удалены только встречи. Турнир, участники и регистрации сохранятся — сетку можно собрать с нуля."
        confirmLabel="Да, снести сетку"
        variant="danger"
        loading={confirmLoading}
        error={confirmError}
        onConfirm={handleBracketConfirm}
        onClose={closeConfirm}
      />
    </div>
  );
}

function BracketTab({
  t,
  format,
  bracketMatches,
  matchNumbers,
  confirmedCount,
  maxRound,
  currentRoundOpen,
  bracketLoading,
  onGenerateBracket,
  showCardMatchNumber = true,
  showCardHandicap = true,
  showCardPlacement = true,
  highlightedPlayerId = null,
  onPlayerHighlight,
  inPresentation = false,
  actionNotice,
  onDismissActionNotice,
  onSaveMatchResult,
  onCancelMatchResult,
  tournamentTables = [],
}: {
  t: AdminTournament;
  format: string;
  bracketMatches: BracketMatchView[];
  matchNumbers: Map<string, number>;
  confirmedCount: number;
  maxRound: number;
  currentRoundOpen: boolean;
  bracketLoading: boolean;
  onGenerateBracket: () => void | Promise<void>;
  showCardMatchNumber?: boolean;
  showCardHandicap?: boolean;
  showCardPlacement?: boolean;
  highlightedPlayerId?: string | null;
  onPlayerHighlight?: (playerId: string) => void;
  inPresentation?: boolean;
  actionNotice?: string | null;
  onDismissActionNotice?: () => void;
  onSaveMatchResult: (payload: MatchResultPayload) => Promise<void>;
  onCancelMatchResult?: (matchId: string) => Promise<void>;
  tournamentTables?: TournamentTableOption[];
}) {
  const dynamicSwiss = isDynamicSwissFormat(format);
  const excelRef = isExcelRef64Format(format);
  const fixedSwiss = isFixedSwissFormat(format);
  const olympic = isOlympicFormat(format);
  const [modalMatch, setModalMatch] = useState<BracketMatchView | null>(null);
  const [matchSaving, setMatchSaving] = useState(false);

  const excelLiveByNo = useMemo(
    () => (excelRef ? mapBracketMatchesByExcelNo(bracketMatches) : undefined),
    [excelRef, bracketMatches],
  );

  async function handleSaveMatchResult(payload: MatchResultPayload) {
    setMatchSaving(true);
    try {
      await onSaveMatchResult(payload);
    } finally {
      setMatchSaving(false);
    }
  }

  async function handleCancelMatchResult(matchId: string) {
    if (!onCancelMatchResult) return;
    setMatchSaving(true);
    try {
      await onCancelMatchResult(matchId);
    } finally {
      setMatchSaving(false);
    }
  }

  useEffect(() => {
    if (!actionNotice || !onDismissActionNotice) return;
    const timer = window.setTimeout(() => onDismissActionNotice(), 6000);
    return () => window.clearTimeout(timer);
  }, [actionNotice, onDismissActionNotice]);

  if (!dynamicSwiss && !fixedSwiss && !olympic && !excelRef) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
        Сетка для этого формата пока не поддерживается.
      </div>
    );
  }

  const outdatedFixedSwiss16 =
    fixedSwiss &&
    bracketMatches.length > 0 &&
    isOutdatedFixedSwiss27Bracket(bracketMatches);

  const outdatedFixedSwiss32 =
    fixedSwiss &&
    bracketMatches.length > 0 &&
    isOutdatedFixedSwiss32Bracket(
      bracketMatches.length,
      Math.max(...bracketMatches.map((m) => m.round)),
    );

  function renderBracketView(presentation: boolean) {
    if (olympic) {
      return (
        <OlympicBracketView
          matches={bracketMatches}
          matchNumbers={matchNumbers}
          withBronzeMatch={isOlympicBronzeFormat(format)}
          handicapHalfStep={t.handicapHalfStep !== false}
          showCardMatchNumber={showCardMatchNumber}
          showCardHandicap={showCardHandicap}
          showCardPlacement={showCardPlacement}
          onMatchClick={setModalMatch}
          highlightedPlayerId={highlightedPlayerId}
          onPlayerHighlight={onPlayerHighlight}
          showMatchScore
          presentation={presentation}
        />
      );
    }
    if (excelRef) {
      return (
        <ExcelBracketView
          liveByMatchNo={excelLiveByNo}
          onMatchClick={setModalMatch}
          presentation={presentation}
        />
      );
    }
    return (
      <SwissBracketView
        matches={bracketMatches}
        showStandings={false}
        fixedGrid={fixedSwiss}
        handicapHalfStep={t.handicapHalfStep !== false}
        showCardMatchNumber={showCardMatchNumber}
        showCardHandicap={showCardHandicap}
        showCardPlacement={showCardPlacement}
        onMatchClick={setModalMatch}
        highlightedPlayerId={highlightedPlayerId}
        onPlayerHighlight={onPlayerHighlight}
        presentation={presentation}
      />
    );
  }

  const bracketModals = (
    <>
      <MatchResultModal
        match={modalMatch}
        matchNumber={modalMatch ? matchNumbers.get(modalMatch.id) : undefined}
        open={modalMatch !== null}
        saving={matchSaving}
        tournamentTables={tournamentTables}
        onClose={() => setModalMatch(null)}
        onSave={handleSaveMatchResult}
        onCancel={onCancelMatchResult ? handleCancelMatchResult : undefined}
      />
    </>
  );

  const emptyBracketPanel =
    bracketMatches.length === 0 ? (
      <div className="space-y-3 px-2">
        <p className="tournament-hint text-sm">
          Сетка ещё не сформирована. Подтвердите участников и нажмите кнопку ниже.
        </p>
        <BracketGenerateButton
          t={t}
          format={format}
          confirmedCount={confirmedCount}
          maxRound={maxRound}
          currentRoundOpen={currentRoundOpen}
          bracketLoading={bracketLoading}
          onGenerateBracket={onGenerateBracket}
        />
      </div>
    ) : null;

  if (inPresentation) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {emptyBracketPanel ?? renderBracketView(true)}
        {bracketModals}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {outdatedFixedSwiss16 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
          Сетка в базе устарела. В настройках турнира нажмите{" "}
          <strong>«Сформировать заново»</strong>.
        </p>
      )}
      {outdatedFixedSwiss32 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
          Сетка на 32 устарела. В настройках турнира нажмите{" "}
          <strong>«Сформировать заново»</strong>.
        </p>
      )}
      {actionNotice && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {actionNotice}
        </p>
      )}

      {emptyBracketPanel ?? (
        <div className="min-w-0 max-w-full">
          {renderBracketView(false)}
          {bracketModals}
        </div>
      )}
    </div>
  );
}

function MatchesScheduleTab({
  variant,
  format,
  handicapHalfStep = true,
  allMatches,
  matches,
  matchNumbers,
  onSaveMatchResult,
  onCancelMatchResult,
  tournamentTables = [],
}: {
  variant: "current" | "upcoming" | "completed";
  format: string;
  handicapHalfStep?: boolean;
  allMatches: BracketMatchView[];
  matches: BracketMatchView[];
  matchNumbers: Map<string, number>;
  onSaveMatchResult: (payload: MatchResultPayload) => Promise<void>;
  onCancelMatchResult?: (matchId: string) => Promise<void>;
  tournamentTables?: TournamentTableOption[];
}) {
  const [modalMatch, setModalMatch] = useState<BracketMatchView | null>(null);
  const [matchSaving, setMatchSaving] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (variant !== "current" || matches.length === 0) return;
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, [variant, matches.length]);

  async function handleSaveMatchResult(payload: MatchResultPayload) {
    setMatchSaving(true);
    try {
      await onSaveMatchResult(payload);
    } finally {
      setMatchSaving(false);
    }
  }

  async function handleCancelMatchResult(matchId: string) {
    if (!onCancelMatchResult) return;
    setMatchSaving(true);
    try {
      await onCancelMatchResult(matchId);
    } finally {
      setMatchSaving(false);
    }
  }

  async function handleStartNow(match: BracketMatchView) {
    setStartError(null);
    setMatchSaving(true);
    try {
      await onSaveMatchResult(buildMatchStartNowPayload(match.id));
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Не удалось начать встречу");
    } finally {
      setMatchSaving(false);
    }
  }

  const emptyHint =
    variant === "current"
      ? "Нет встреч в процессе. Начало фиксируется в карточке встречи на сетке."
      : variant === "upcoming"
        ? "Нет готовых встреч — дождитесь соперников или сформируйте следующий тур."
        : "Пока нет завершённых встреч.";
  const showScore = variant === "current" || variant === "completed";
  const showTable = variant === "current";
  const showElapsed = variant === "current";
  const showDuration = variant === "completed";
  const showHandicap = true;
  const showStartAction = variant === "upcoming";
  /** До старта колонки «Начало»/«Окончание» пустые — не занимаем ширину на узких экранах. */
  const showScheduleTimes = variant !== "upcoming";
  const rowHint =
    variant === "completed"
      ? "Нажмите на строку, чтобы открыть карточку встречи, изменить данные или отменить результат."
      : variant === "upcoming"
        ? "«Начать сейчас» — старт и свободный стол без модалки. Строка — ручная настройка времени и стола."
        : "Нажмите на строку, чтобы открыть карточку встречи и зафиксировать результат.";

  return (
    <div className="min-w-0 max-w-full space-y-4">
      {startError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {startError}
        </p>
      )}
      {matches.length === 0 ? (
        <p className="tournament-hint text-sm">{emptyHint}</p>
      ) : (
        <div className="admin-table-wrap admin-table-wrap--scroll min-w-0 w-full max-w-full">
          <table
            className={cn(
              "w-full text-left text-sm",
              showHandicap
                ? showStartAction
                  ? "min-w-[680px]"
                  : showTable
                    ? "min-w-[1000px]"
                    : "min-w-[920px]"
                : showDuration
                  ? "min-w-[800px]"
                  : "min-w-[720px]",
            )}
          >
            <thead className="admin-thead">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Этап</th>
                <th className="px-4 py-3 font-medium">Встреча</th>
                {showHandicap && (
                  <th className="px-4 py-3 font-medium">Рейтинг</th>
                )}
                {showHandicap && (
                  <th className="px-4 py-3 font-medium">Фора</th>
                )}
                {showTable && (
                  <th className="px-4 py-3 font-medium">Стол</th>
                )}
                {showScore && (
                  <th className="px-4 py-3 font-medium">Счёт</th>
                )}
                {showElapsed && (
                  <th className="px-4 py-3 font-medium">Идёт</th>
                )}
                {showScheduleTimes && (
                  <th className="px-4 py-3 font-medium">Начало</th>
                )}
                {showScheduleTimes && (
                  <th className="px-4 py-3 font-medium">Окончание</th>
                )}
                {showDuration && (
                  <th className="px-4 py-3 font-medium">Длительность</th>
                )}
                {showStartAction && (
                  <th
                    className="sticky right-0 z-10 bg-[var(--admin-thead-bg)] px-3 py-3 shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.35)]"
                    aria-label="Действия"
                  />
                )}
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                  <tr
                    key={match.id}
                    className="group admin-table-row cursor-pointer border-t border-[var(--admin-border)] hover:bg-zinc-800/40"
                    onClick={() => {
                      setStartError(null);
                      setModalMatch(match);
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                      {matchNumbers.get(match.id) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs tournament-participant-meta">
                      {matchStageLabel(
                        match,
                        format,
                        allMatches,
                        matchNumbers.get(match.id),
                      )}
                    </td>
                    <td className="max-w-[10rem] truncate px-4 py-3 font-medium sm:max-w-none">
                      <span title={matchParticipantsLabel(match)}>
                        {matchParticipantsLabel(match)}
                      </span>
                    </td>
                    {showHandicap && (
                      <td className="px-4 py-3 font-mono text-xs tabular-nums tournament-participant-meta">
                        {matchRatingsLabel(match)}
                      </td>
                    )}
                    {showHandicap && (
                      <td
                        className="px-4 py-3 text-xs tournament-participant-meta"
                        title={matchHandicapFullLabel(match, handicapHalfStep) ?? undefined}
                      >
                        {matchHandicapShortLabel(match, handicapHalfStep)}
                      </td>
                    )}
                    {showTable && (
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{match.tableLabel ?? "—"}</span>
                          {match.streamUrl && (
                            <BracketStreamLink url={match.streamUrl} />
                          )}
                        </span>
                      </td>
                    )}
                    {showScore && (
                      <td className="px-4 py-3 font-mono">
                        {matchScoreLabel(match)}
                      </td>
                    )}
                    {showElapsed && (
                      <td className="px-4 py-3 font-mono tabular-nums text-amber-600 dark:text-amber-400">
                        {formatMatchElapsedHm(match.startedAt, now) ?? "—"}
                      </td>
                    )}
                    {showScheduleTimes && (
                      <td className="px-4 py-3 font-mono tournament-participant-meta">
                        {formatMatchDateTime(match.startedAt)}
                      </td>
                    )}
                    {showScheduleTimes && (
                      <td className="px-4 py-3 font-mono tournament-participant-meta">
                        {match.finishedAt
                          ? formatMatchDateTime(match.finishedAt)
                          : "—"}
                      </td>
                    )}
                    {showDuration && (
                      <td className="px-4 py-3 font-mono tabular-nums tournament-participant-meta">
                        {formatMatchDurationHm(match.startedAt, match.finishedAt) ??
                          "—"}
                      </td>
                    )}
                    {showStartAction && (
                      <td
                        className="sticky right-0 z-10 bg-[var(--admin-card-bg)] px-3 py-3 shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.35)] group-hover:bg-[var(--admin-row-hover)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AsyncButton
                          disabled={matchSaving}
                          loadingLabel="…"
                          className="admin-btn admin-btn--primary whitespace-nowrap px-2.5 py-1.5 text-xs sm:px-3"
                          onClick={async () => {
                            await handleStartNow(match);
                          }}
                        >
                          <span className="sm:hidden">Старт</span>
                          <span className="hidden sm:inline">Начать сейчас</span>
                        </AsyncButton>
                      </td>
                    )}
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="tournament-hint text-xs">{rowHint}</p>
      <MatchResultModal
        match={modalMatch}
        matchNumber={modalMatch ? matchNumbers.get(modalMatch.id) : undefined}
        open={modalMatch !== null}
        saving={matchSaving}
        tournamentTables={tournamentTables}
        onClose={() => setModalMatch(null)}
        onSave={handleSaveMatchResult}
        onCancel={onCancelMatchResult ? handleCancelMatchResult : undefined}
      />
    </div>
  );
}

function ProtocolTab({
  t,
  swiss,
  rows,
  showSwissPoints,
  hasMatches,
}: {
  t: AdminTournament;
  swiss: boolean;
  rows: ReturnType<typeof computeTournamentStandings>;
  showSwissPoints: boolean;
  hasMatches: boolean;
}) {
  const preliminary = rows.some((row) => row.note);
  const finished = t.status === "FINISHED";

  return (
    <div className="space-y-4">
      <div className="tournament-info-panel">
        <p>
          {tournamentFormatDisplayLabel(t)} · {t.club.name}
          {t.startsAt
            ? ` · ${new Date(t.startsAt).toLocaleString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : ""}
        </p>
        {preliminary && !finished && (
          <p className="tournament-bracket-locked-hint mt-1">
            Места предварительные — обновятся после завершения{" "}
            {swiss ? "туров" : hasMatches ? "матчей" : "турнира"}.
          </p>
        )}
        {finished && (
          <p className="mt-1 text-xs text-emerald-400/90">Турнир завершён — итоговый протокол.</p>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="tournament-hint text-sm">
          Нет подтверждённых участников для протокола.
        </p>
      ) : (
        <div className="admin-table-wrap overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="admin-thead">
              <tr>
                <th className="px-4 py-3 font-medium">Место</th>
                <th className="px-4 py-3 font-medium">Участник</th>
                <th className="px-4 py-3 font-medium">Город</th>
                <th className="px-4 py-3 font-medium">Рейтинг</th>
                {showSwissPoints && (
                  <th className="px-4 py-3 font-medium">Очки</th>
                )}
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.place ?? "x"}-${row.label}`} className="admin-table-row border-t border-[var(--admin-border)]">
                  <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                    {formatTournamentStandingPlace(row)}
                  </td>
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3 tournament-participant-meta">{row.city}</td>
                  <td className="px-4 py-3 font-mono tournament-participant-meta">{formatRating(row.rating)}</td>
                  {showSwissPoints && (
                    <td className="px-4 py-3 font-mono">{row.points ?? 0}</td>
                  )}
                  <td className="px-4 py-3 text-xs tournament-participant-meta">{row.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MatchRow({
  match,
  onSetWinner,
  handicapHalfStep = true,
}: {
  match: Match;
  onSetWinner: (matchId: string, winnerTeamId: string) => void;
  handicapHalfStep?: boolean;
}) {
  const team1 = match.team1;
  const team2 = match.team2;
  const finished = match.status === "FINISHED" || !!match.winnerTeam;

  if (!team1 && !team2) {
    return (
      <div className="rounded-lg bg-zinc-900/50 px-3 py-2 text-sm text-zinc-500">
        Матч {match.slot} — ожидание пар
      </div>
    );
  }

  const handicap =
    team1 && team2
      ? describeHandicap(teamRating(team1), teamRating(team2), {
          halfStep: handicapHalfStep,
        })
      : null;

  return (
    <div className="rounded-lg bg-zinc-900 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <TeamSide
          team={team1}
          isWinner={match.winnerTeam?.id === team1?.id}
          canPick={!finished && !!team1 && !!team2}
          onPick={() => team1 && onSetWinner(match.id, team1.id)}
        />
        <span className="text-zinc-500">vs</span>
        <TeamSide
          team={team2}
          isWinner={match.winnerTeam?.id === team2?.id}
          canPick={!finished && !!team1 && !!team2}
          onPick={() => team2 && onSetWinner(match.id, team2.id)}
        />
        {finished && match.winnerTeam && (
          <span className="text-xs text-emerald-400">✓</span>
        )}
        {!team2 && team1 && !finished && (
          <span className="text-xs text-zinc-500">(автопроход)</span>
        )}
      </div>
      {handicap && handicap !== "Без форы" && (
        <p className="mt-1 text-xs text-zinc-500">Фора: {handicap}</p>
      )}
    </div>
  );
}

function PairTeamRow({
  index,
  team,
  playerOptions,
  bracketLocked,
  onConfirm,
  onFeePaidChange,
  onUpdated,
}: {
  index: number;
  team: Team;
  playerOptions: { value: string; label: string }[];
  bracketLocked: boolean;
  onConfirm: () => void | Promise<void>;
  onFeePaidChange: (feePaid: boolean) => void | Promise<void>;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [player1Id, setPlayer1Id] = useState(team.player1.id);
  const [player2Id, setPlayer2Id] = useState(team.player2?.id ?? "");
  const [teamNameEdit, setTeamNameEdit] = useState(team.name ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveTeam() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/tournaments/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: team.id,
        player1Id,
        player2Id,
        name: teamNameEdit || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Ошибка сохранения");
      return;
    }
    setEditing(false);
    await onUpdated();
  }

  async function removeTeam() {
    if (!confirm(`Убрать пару ${teamLabel(team)} из турнира?`)) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/tournaments/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: team.id, status: "CANCELLED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Не удалось удалить");
        return;
      }
      await onUpdated();
    } finally {
      setRemoving(false);
    }
  }

  if (editing && !bracketLocked) {
    return (
      <li className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm">
        <SearchableSelect
          options={playerOptions}
          value={player1Id}
          onChange={setPlayer1Id}
          placeholder="Игрок 1"
          searchPlaceholder="Поиск…"
        />
        <SearchableSelect
          options={playerOptions.filter((p) => p.value !== player1Id)}
          value={player2Id}
          onChange={setPlayer2Id}
          placeholder="Игрок 2"
          searchPlaceholder="Поиск…"
        />
        <input
          value={teamNameEdit}
          onChange={(e) => setTeamNameEdit(e.target.value)}
          placeholder="Название команды"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={saveTeam}
            disabled={saving}
            className="text-xs text-emerald-400 hover:underline disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setPlayer1Id(team.player1.id);
              setPlayer2Id(team.player2?.id ?? "");
              setTeamNameEdit(team.name ?? "");
              setError(null);
            }}
            className="text-xs text-zinc-400 hover:underline"
          >
            Отмена
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm">
      <ParticipantIndex index={index} />
      <div className="min-w-0 flex-1">
        <div>
          {team.seed ? `#${team.seed} · ` : ""}
          {teamLabel(team)} — {team.player1.lastName} & {team.player2?.lastName ?? "—"} (сумма
          рейтингов {teamRating(team)})
        </div>
        <div className="mt-1 space-y-0.5">
          <div className="text-xs text-zinc-500">
            {team.player1.lastName} {team.player1.firstName}
          </div>
          <PlayerContactLinks
            phone={team.player1.phone}
            telegramUsername={team.player1.telegramUsername}
          />
          {team.player2 && (
            <>
              <div className="text-xs text-zinc-500">
                {team.player2.lastName} {team.player2.firstName}
              </div>
              <PlayerContactLinks
                phone={team.player2.phone}
                telegramUsername={team.player2.telegramUsername}
              />
            </>
          )}
        </div>
      </div>
      <div className="tournament-participant-card-actions">
        {(team.status === "PENDING" || team.status === "REJECTED") && (
          <FeePaidCheckbox
            checked={Boolean(team.feePaid)}
            onChange={onFeePaidChange}
          />
        )}
        {team.status === "CONFIRMED" && (
          <FeePaidCheckbox checked disabled onChange={async () => {}} />
        )}
        <div className="tournament-participant-card-buttons">
          <StatusBadge
            status={team.status}
            label={REGISTRATION_STATUS_LABELS[team.status] ?? team.status}
          />
          {(team.status === "PENDING" || team.status === "REJECTED") && (
            <RegistrationActionButton
              variant="primary"
              loadingLabel="Подтверждаем…"
              disabled={!team.feePaid}
              onClick={onConfirm}
            >
              Подтвердить
            </RegistrationActionButton>
          )}
          {!bracketLocked && team.status !== "CANCELLED" && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs text-emerald-400 hover:underline"
              >
                Изменить
              </button>
              <button
                type="button"
                onClick={removeTeam}
                disabled={removing}
                className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removing && (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {removing ? "…" : "Убрать"}
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function TeamSide({
  team,
  isWinner,
  canPick,
  onPick,
}: {
  team: Team | null;
  isWinner: boolean;
  canPick: boolean;
  onPick: () => void;
}) {
  if (!team) {
    return <span className="text-zinc-500">—</span>;
  }

  const label = `${teamLabel(team)} (${teamRating(team)})`;

  if (canPick) {
    return (
      <button
        type="button"
        onClick={onPick}
        className="rounded border border-zinc-700 px-2 py-0.5 hover:border-emerald-600 hover:text-emerald-400"
      >
        {label}
      </button>
    );
  }

  return (
    <span className={isWinner ? "font-medium text-emerald-300" : ""}>{label}</span>
  );
}
