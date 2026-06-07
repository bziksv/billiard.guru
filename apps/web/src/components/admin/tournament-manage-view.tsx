"use client";

import { useMemo, useState, useEffect, type ReactNode } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { PlayerContactLinks } from "@/components/admin/player-contact-links";
import {
  MatchResultModal,
  type MatchResultPayload,
} from "@/components/bracket/match-result-modal";
import { ConfirmModal } from "@/components/bracket/confirm-modal";
import { PlayerCardModal } from "@/components/bracket/player-card-modal";
import { OlympicBracketView } from "@/components/bracket/olympic-bracket-view";
import { SwissBracketView } from "@/components/bracket/swiss-bracket-view";
import type { TeamPlayer } from "@/lib/pair-tournament";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AsyncButton } from "@/components/ui/async-text-button";
import { cn } from "@/lib/cn";
import type { BracketMatchView } from "@/lib/bracket-view";
import { describeHandicap } from "@/lib/handicap";
import { TournamentRatingRulesSummary } from "@/components/tournament/tournament-rating-rules-summary";
import {
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
} from "@/lib/tournament-registration";
import {
  REGISTRATION_STATUS_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/validators";
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
}: {
  tab: ManageTab;
  onTabChange: (tab: ManageTab) => void;
  viewMode: TournamentManageViewMode;
  participantCount: number;
  currentCount: number;
  upcomingCount: number;
  completedCount: number;
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
        Итоговый протокол
      </button>
    </>
  );
}

function RegistrationActionButton({
  variant,
  onClick,
  children,
  loadingLabel = "…",
}: {
  variant: "primary" | "danger" | "outline";
  onClick: () => void | Promise<void>;
  children: ReactNode;
  loadingLabel?: string;
}) {
  return (
    <AsyncButton
      onClick={onClick}
      loadingLabel={loadingLabel}
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

export type TournamentManageViewMode = "full" | "tournament" | "bracket";

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
}: {
  tournament: AdminTournament;
  clubOptions: { value: string; label: string }[];
  playerOptions: { value: string; label: string }[];
  bracketLoading: boolean;
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
  const [tab, setTab] = useState<ManageTab>(
    effectiveViewMode === "bracket" ? "bracket" : "participants",
  );
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
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [bracketActionNotice, setBracketActionNotice] = useState<string | null>(null);

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
  const activeTeams = t.teams.filter((team) => team.status !== "CANCELLED");
  const inactiveTeams = t.teams.filter(
    (team) => team.status === "CANCELLED" || team.status === "REJECTED",
  );
  const canModifyRegistrations = canCancelRegistration(t.status, "organizer");
  const participantCount = pair
    ? activeTeams.length
    : t.registrations.filter((r) => r.status !== "CANCELLED").length;
  const showSwissPoints = swiss && protocolRows.some((row) => row.points !== undefined);
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
        team1: m.team1,
        team2: m.team2,
      })),
    [t.matches],
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

  const manageTabButtons = (
    <ManageTabButtons
      tab={tab}
      onTabChange={setTab}
      viewMode={effectiveViewMode}
      participantCount={participantCount}
      currentCount={currentMatches.length}
      upcomingCount={upcomingMatches.length}
      completedCount={completedMatches.length}
    />
  );

  const presentationContentIsBracket = tab === "bracket";

  return (
    <div
      className={
        embedded
          ? "space-y-4"
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
              {TOURNAMENT_FORMAT_LABELS[t.format]} · {t.club.name}
            </span>
            <TournamentRatingRulesSummary tournament={t} className="mt-1 block text-zinc-500" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="text-xs text-emerald-400 hover:underline"
            >
              {editing ? "Закрыть настройки" : "Настройки турнира"}
            </button>
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
              className="text-xs text-red-400 hover:underline disabled:opacity-50"
            >
              {deleting ? "Удаление…" : "Удалить"}
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
          <div className="flex flex-wrap items-center gap-2">
            {showTabBar && !editing && (
              <div className="admin-tab-bar">{manageTabButtons}</div>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
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
        <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            placeholder="Название"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
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
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          />
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={editHandicapHalfStep}
              onChange={(e) => setEditHandicapHalfStep(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-600"
            />
            <span>
              <span className="font-medium text-zinc-200">Учитывать рейтинг 0,5</span>
              <span className="mt-1 block text-xs text-zinc-500">
                Влияет на расчёт форы в сетке этого турнира.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={editLimitByRating}
              onChange={(e) => setEditLimitByRating(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-600"
            />
            <span className="font-medium text-zinc-200">Лимит рейтинга участников</span>
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
                <span className="mb-1 block text-zinc-400">
                  Максимальный рейтинг (0–{MAX_PLAYER_RATING}, шаг {RATING_STEP})
                </span>
                <input
                  type="number"
                  step={RATING_STEP}
                  min={0}
                  max={MAX_PLAYER_RATING}
                  value={editRatingMax}
                  onChange={(e) => setEditRatingMax(e.target.value)}
                  className="w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                />
              </label>
            </>
          )}
          {editError && <p className="text-sm text-red-400">{editError}</p>}
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="admin-tab-bar">{manageTabButtons}</div>
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
          actionNotice={bracketActionNotice}
          onDismissActionNotice={() => setBracketActionNotice(null)}
          onSaveMatchResult={onSaveMatchResult}
          onCancelMatchResult={onCancelMatchResult}
        />
      )}

      {!presentationOpen && bracketTabOpen("current-matches") && (
        <MatchesScheduleTab
          variant="current"
          format={t.format}
          allMatches={bracketMatches}
          matches={currentMatches}
          matchNumbers={bracketMatchNumbers}
          onSaveMatchResult={onSaveMatchResult}
          onCancelMatchResult={onCancelMatchResult}
        />
      )}

      {!presentationOpen && bracketTabOpen("upcoming-matches") && (
        <MatchesScheduleTab
          variant="upcoming"
          format={t.format}
          handicapHalfStep={t.handicapHalfStep !== false}
          allMatches={bracketMatches}
          matches={upcomingMatches}
          matchNumbers={bracketMatchNumbers}
          onSaveMatchResult={onSaveMatchResult}
          onCancelMatchResult={onCancelMatchResult}
        />
      )}

      {!presentationOpen && bracketTabOpen("completed-matches") && (
        <MatchesScheduleTab
          variant="completed"
          format={t.format}
          allMatches={bracketMatches}
          matches={completedMatches}
          matchNumbers={bracketMatchNumbers}
          onSaveMatchResult={onSaveMatchResult}
          onCancelMatchResult={onCancelMatchResult}
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
        tabs={<div className="admin-tab-bar">{manageTabButtons}</div>}
        contentClassName={
          presentationContentIsBracket ? "flex flex-col" : "overflow-auto"
        }
      >
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
            inPresentation
            onSaveMatchResult={onSaveMatchResult}
            onCancelMatchResult={onCancelMatchResult}
          />
        )}

        {showBracketSection && tab === "current-matches" && (
          <MatchesScheduleTab
            variant="current"
            format={t.format}
            allMatches={bracketMatches}
            matches={currentMatches}
            matchNumbers={bracketMatchNumbers}
            onSaveMatchResult={onSaveMatchResult}
            onCancelMatchResult={onCancelMatchResult}
          />
        )}

        {showBracketSection && tab === "upcoming-matches" && (
          <MatchesScheduleTab
            variant="upcoming"
            format={t.format}
            handicapHalfStep={t.handicapHalfStep !== false}
            allMatches={bracketMatches}
            matches={upcomingMatches}
            matchNumbers={bracketMatchNumbers}
            onSaveMatchResult={onSaveMatchResult}
            onCancelMatchResult={onCancelMatchResult}
          />
        )}

        {showBracketSection && tab === "completed-matches" && (
          <MatchesScheduleTab
            variant="completed"
            format={t.format}
            allMatches={bracketMatches}
            matches={completedMatches}
            matchNumbers={bracketMatchNumbers}
            onSaveMatchResult={onSaveMatchResult}
            onCancelMatchResult={onCancelMatchResult}
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
  canModifyRegistrations: boolean;
  onConfirmRegistration: (id: string) => void | Promise<void>;
  onRejectRegistration: (id: string) => void | Promise<void>;
  onCancelRegistration: (id: string) => void | Promise<void>;
  onConfirmTeam: (id: string) => void | Promise<void>;
  onUpdated: () => void;
}) {
  return (
    <div className="space-y-4">
      {pair && activeTeams.length > 0 && (
        <ul className="space-y-2">
          {bracketLocked && (
            <p className="text-xs text-amber-400/90">
              Сетка сформирована — состав пар изменить нельзя, только результат матчей.
            </p>
          )}
          {activeTeams.map((team) => (
            <PairTeamRow
              key={team.id}
              team={team}
              playerOptions={playerOptions}
              bracketLocked={bracketLocked}
              onConfirm={() => onConfirmTeam(team.id)}
              onUpdated={onUpdated}
            />
          ))}
        </ul>
      )}

      {!pair && pendingRegistrations.length > 0 && (
        <div>
          <p className="tournament-section-label tournament-section-label--pending">
            Заявки на участие ({pendingRegistrations.length})
          </p>
          <ul className="space-y-2">
            {pendingRegistrations.map((r) => (
              <li
                key={r.id}
                className="tournament-participant-card tournament-participant-card--pending"
              >
                <div className="min-w-0 flex-1">
                  <div className="tournament-participant-name">
                    {r.player.lastName} {r.player.firstName}
                    <span className="tournament-participant-meta ml-1 font-normal">
                      · рейтинг {r.player.rating}
                      {r.source === "SELF" ? " · самостоятельная заявка" : ""}
                    </span>
                  </div>
                  <PlayerContactLinks
                    phone={r.player.phone}
                    telegramUsername={r.player.telegramUsername}
                  />
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <RegistrationActionButton
                    variant="primary"
                    loadingLabel="Подтверждаем…"
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
              </li>
            ))}
          </ul>
        </div>
      )}

      {!pair && confirmedRegistrations.length > 0 && (
        <div>
          <p className="tournament-section-label">
            Подтверждённые участники ({confirmedRegistrations.length})
          </p>
          <ul className="space-y-2">
            {confirmedRegistrations.map((r) => (
              <li key={r.id} className="tournament-participant-card">
                <div className="min-w-0 flex-1">
                  <div className="tournament-participant-name">
                    {r.player.lastName} {r.player.firstName}
                    <span className="tournament-participant-meta ml-1 font-normal">
                      · рейтинг {r.player.rating}
                    </span>
                  </div>
                  <PlayerContactLinks
                    phone={r.player.phone}
                    telegramUsername={r.player.telegramUsername}
                  />
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
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
            {otherRegistrations.map((r) => (
              <li key={r.id} className="tournament-participant-card opacity-80">
                <div className="min-w-0 flex-1">
                  <div className="tournament-participant-name">
                    {r.player.lastName} {r.player.firstName}
                    <span className="tournament-participant-meta ml-1 font-normal">
                      · рейтинг {r.player.rating}
                    </span>
                  </div>
                  <PlayerContactLinks
                    phone={r.player.phone}
                    telegramUsername={r.player.telegramUsername}
                  />
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <StatusBadge
                    status={r.status}
                    label={REGISTRATION_STATUS_LABELS[r.status] ?? r.status}
                  />
                  {canModifyRegistrations &&
                    t.status === "OPEN" &&
                    (r.status === "CANCELLED" || r.status === "REJECTED") && (
                      <RegistrationActionButton
                        variant="primary"
                        loadingLabel={
                          r.status === "CANCELLED" ? "Регистрируем…" : "Подтверждаем…"
                        }
                        onClick={() => onConfirmRegistration(r.id)}
                      >
                        {r.status === "CANCELLED" ? "Зарегистрировать снова" : "Подтвердить"}
                      </RegistrationActionButton>
                    )}
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
                  {canModifyRegistrations && t.status === "OPEN" && !bracketLocked && (
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
    isOutdatedFixedSwiss32Bracket(bracketMatches.length);

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
  inPresentation = false,
  actionNotice,
  onDismissActionNotice,
  onSaveMatchResult,
  onCancelMatchResult,
}: {
  t: AdminTournament;
  format: string;
  bracketMatches: BracketMatchView[];
  matchNumbers: Map<string, number>;
  inPresentation?: boolean;
  actionNotice?: string | null;
  onDismissActionNotice?: () => void;
  onSaveMatchResult: (payload: MatchResultPayload) => Promise<void>;
  onCancelMatchResult?: (matchId: string) => Promise<void>;
}) {
  const dynamicSwiss = isDynamicSwissFormat(format);
  const excelRef = isExcelRef64Format(format);
  const fixedSwiss = isFixedSwissFormat(format);
  const olympic = isOlympicFormat(format);
  const [modalMatch, setModalMatch] = useState<BracketMatchView | null>(null);
  const [matchSaving, setMatchSaving] = useState(false);
  const [playerModal, setPlayerModal] = useState<{
    id: string;
    preview?: TeamPlayer;
  } | null>(null);

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
    isOutdatedFixedSwiss32Bracket(bracketMatches.length);

  function renderBracketView(presentation: boolean) {
    if (olympic) {
      return (
        <OlympicBracketView
          matches={bracketMatches}
          matchNumbers={matchNumbers}
          withBronzeMatch={isOlympicBronzeFormat(format)}
          handicapHalfStep={t.handicapHalfStep !== false}
          onMatchClick={setModalMatch}
          onPlayerClick={(id, preview) => setPlayerModal({ id, preview })}
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
        onMatchClick={setModalMatch}
        onPlayerClick={(id, preview) => setPlayerModal({ id, preview })}
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
        onClose={() => setModalMatch(null)}
        onSave={handleSaveMatchResult}
        onCancel={onCancelMatchResult ? handleCancelMatchResult : undefined}
      />
      <PlayerCardModal
        playerId={playerModal?.id ?? null}
        preview={playerModal?.preview}
        open={playerModal !== null}
        onClose={() => setPlayerModal(null)}
      />
    </>
  );

  if (inPresentation) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {bracketMatches.length === 0 ? (
          <p className="tournament-hint px-2 text-sm">
            Сетка ещё не сформирована — откройте настройки турнира.
          </p>
        ) : (
          renderBracketView(true)
        )}
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

      {bracketMatches.length === 0 ? (
        <p className="tournament-hint text-sm">
          Сетка ещё не сформирована. Подтвердите участников и сформируйте сетку в настройках
          турнира.
        </p>
      ) : (
        <>
          {renderBracketView(false)}
          {bracketModals}
        </>
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
}: {
  variant: "current" | "upcoming" | "completed";
  format: string;
  handicapHalfStep?: boolean;
  allMatches: BracketMatchView[];
  matches: BracketMatchView[];
  matchNumbers: Map<string, number>;
  onSaveMatchResult: (payload: MatchResultPayload) => Promise<void>;
  onCancelMatchResult?: (matchId: string) => Promise<void>;
}) {
  const [modalMatch, setModalMatch] = useState<BracketMatchView | null>(null);
  const [matchSaving, setMatchSaving] = useState(false);
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

  const emptyHint =
    variant === "current"
      ? "Нет встреч в процессе. Начало фиксируется в карточке встречи на сетке."
      : variant === "upcoming"
        ? "Нет готовых встреч — дождитесь соперников или сформируйте следующий тур."
        : "Пока нет завершённых встреч.";
  const showScore = variant === "current" || variant === "completed";
  const showElapsed = variant === "current";
  const showDuration = variant === "completed";
  const showHandicap = variant === "upcoming";
  const rowHint =
    variant === "completed"
      ? "Нажмите на строку, чтобы открыть карточку встречи, изменить данные или отменить результат."
      : "Нажмите на строку, чтобы открыть карточку встречи и зафиксировать результат.";

  return (
    <div className="space-y-4">
      {matches.length === 0 ? (
        <p className="tournament-hint text-sm">{emptyHint}</p>
      ) : (
        <div className="admin-table-wrap overflow-x-auto">
          <table
            className={cn(
              "w-full text-left text-sm",
              showHandicap
                ? "min-w-[920px]"
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
                {showScore && (
                  <th className="px-4 py-3 font-medium">Счёт</th>
                )}
                {showElapsed && (
                  <th className="px-4 py-3 font-medium">Идёт</th>
                )}
                <th className="px-4 py-3 font-medium">Начало</th>
                <th className="px-4 py-3 font-medium">Окончание</th>
                {showDuration && (
                  <th className="px-4 py-3 font-medium">Длительность</th>
                )}
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                  <tr
                    key={match.id}
                    className="admin-table-row cursor-pointer border-t border-[var(--admin-border)] hover:bg-zinc-800/40"
                    onClick={() => setModalMatch(match)}
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
                    <td className="px-4 py-3 font-medium">
                      {matchParticipantsLabel(match)}
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
                    <td className="px-4 py-3 font-mono tournament-participant-meta">
                      {formatMatchDateTime(match.startedAt)}
                    </td>
                    <td className="px-4 py-3 font-mono tournament-participant-meta">
                      {match.finishedAt
                        ? formatMatchDateTime(match.finishedAt)
                        : "—"}
                    </td>
                    {showDuration && (
                      <td className="px-4 py-3 font-mono tabular-nums tournament-participant-meta">
                        {formatMatchDurationHm(match.startedAt, match.finishedAt) ??
                          "—"}
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
          {TOURNAMENT_FORMAT_LABELS[t.format]} · {t.club.name}
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
          <p className="mt-1 text-xs text-amber-400/90">
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
  team,
  playerOptions,
  bracketLocked,
  onConfirm,
  onUpdated,
}: {
  team: Team;
  playerOptions: { value: string; label: string }[];
  bracketLocked: boolean;
  onConfirm: () => void | Promise<void>;
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
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={team.status}
          label={REGISTRATION_STATUS_LABELS[team.status] ?? team.status}
        />
        {(team.status === "PENDING" || team.status === "REJECTED") && (
          <RegistrationActionButton variant="primary" loadingLabel="Подтверждаем…" onClick={onConfirm}>
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
