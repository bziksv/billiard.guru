"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { PlayerContactLinks } from "@/components/admin/player-contact-links";
import {
  MatchResultModal,
  type MatchResultPayload,
} from "@/components/bracket/match-result-modal";
import { PlayerCardModal } from "@/components/bracket/player-card-modal";
import { OlympicBracketView } from "@/components/bracket/olympic-bracket-view";
import { SwissBracketView } from "@/components/bracket/swiss-bracket-view";
import type { TeamPlayer } from "@/lib/pair-tournament";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AsyncTextButton } from "@/components/ui/async-text-button";
import type { BracketMatchView } from "@/lib/bracket-view";
import { describeHandicap } from "@/lib/handicap";
import { formatRating } from "@/lib/rating";
import {
  isDynamicSwissFormat,
  isFixedSwissFormat,
  isOlympicFormat,
  isPairFormat,
  isSwissFormat,
  teamLabel,
  teamRating,
  type TeamWithPlayers,
} from "@/lib/pair-tournament";
import {
  FORMAT_OPTIONS,
  STATUS_OPTIONS,
  computeTournamentStandings,
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

type Team = AdminTournament["teams"][number] & TeamWithPlayers;
type Match = AdminTournament["matches"][number];
type ManageTab = "participants" | "bracket" | "protocol";

export function TournamentManageView({
  tournament: t,
  clubOptions,
  playerOptions,
  bracketLoading,
  embedded = false,
  onConfirmRegistration,
  onRejectRegistration,
  onCancelRegistration,
  onConfirmTeam,
  onGenerateBracket,
  onSaveMatchResult,
  onCancelMatchResult,
  onUpdated,
  onDelete,
}: {
  tournament: AdminTournament;
  clubOptions: { value: string; label: string }[];
  playerOptions: { value: string; label: string }[];
  bracketLoading: boolean;
  embedded?: boolean;
  onConfirmRegistration: (id: string) => void | Promise<void>;
  onRejectRegistration: (id: string) => void | Promise<void>;
  onCancelRegistration: (id: string) => void | Promise<void>;
  onConfirmTeam: (id: string) => void | Promise<void>;
  onGenerateBracket: () => void | Promise<void>;
  onSaveMatchResult: (payload: MatchResultPayload) => Promise<void>;
  onCancelMatchResult?: (matchId: string) => Promise<void>;
  onUpdated: () => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<ManageTab>("participants");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editName, setEditName] = useState(t.name);
  const [editDescription, setEditDescription] = useState(t.description ?? "");
  const [editClubId, setEditClubId] = useState(t.clubId);
  const [editFormat, setEditFormat] = useState(t.format);
  const [editStatus, setEditStatus] = useState(t.status);
  const [editStartsAt, setEditStartsAt] = useState(
    t.startsAt ? t.startsAt.slice(0, 16) : "",
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

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
          <span className="text-sm text-zinc-400">
            {TOURNAMENT_FORMAT_LABELS[t.format]} · {t.club.name}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="text-xs text-emerald-400 hover:underline"
            >
              {editing ? "Закрыть" : "Редактировать"}
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

      {embedded && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
          <StatusBadge
            status={t.status}
            label={TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}
          />
          <span>
            {TOURNAMENT_FORMAT_LABELS[t.format]} · {t.club.name}
          </span>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="ml-auto text-xs text-emerald-400 hover:underline"
          >
            {editing ? "Закрыть настройки" : "Настройки турнира"}
          </button>
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
            options={FORMAT_OPTIONS}
            value={editFormat}
            onChange={setEditFormat}
            placeholder="Формат"
            searchPlaceholder="Формат…"
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
          {editError && <p className="text-sm text-red-400">{editError}</p>}
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

      {embedded && !editing && (
        <div>
          <h2 className="mb-3 font-semibold">
            {t.status === "ACTIVE" ? "Ведение турнира" : "Управление турниром"}
          </h2>
          <div className="admin-tab-bar">
          <button
            type="button"
            onClick={() => setTab("participants")}
            className={adminTabClass(tab === "participants")}
          >
            Участники
            {participantCount > 0 ? ` (${participantCount})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setTab("bracket")}
            className={adminTabClass(tab === "bracket")}
          >
            Сетка
            {rounds.length > 0 ? ` · ${maxRound} ${swiss ? "тур." : "раунд."}` : ""}
          </button>
          <button
            type="button"
            onClick={() => setTab("protocol")}
            className={adminTabClass(tab === "protocol")}
          >
            Итоговый протокол
          </button>
          </div>
        </div>
      )}

      {(!embedded || tab === "participants") && (
        <ParticipantsTab
          t={t}
          pair={pair}
          pendingRegistrations={pendingRegistrations}
          confirmedRegistrations={confirmedRegistrations}
          otherRegistrations={otherRegistrations}
          activeTeams={activeTeams}
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

      {(!embedded || tab === "bracket") && (
        <BracketTab
          t={t}
          format={t.format}
          confirmedCount={confirmedCount}
          confirmedTeams={confirmedTeams}
          maxRound={maxRound}
          currentRoundOpen={currentRoundOpen}
          bracketLoading={bracketLoading}
          bracketMatches={bracketMatches}
          onGenerateBracket={onGenerateBracket}
          onSaveMatchResult={onSaveMatchResult}
          onCancelMatchResult={onCancelMatchResult}
        />
      )}

      {(!embedded || tab === "protocol") && (
        <ProtocolTab
          t={t}
          swiss={swiss}
          rows={protocolRows}
          showSwissPoints={showSwissPoints}
          hasMatches={t.matches.length > 0}
        />
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
          <p className="mb-2 text-xs uppercase tracking-wide text-amber-400/90">
            Заявки на участие ({pendingRegistrations.length})
          </p>
          <ul className="space-y-2">
            {pendingRegistrations.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div>
                    {r.player.lastName} {r.player.firstName} — рейтинг {r.player.rating}
                    {r.source === "SELF" ? " · самостоятельная заявка" : ""}
                  </div>
                  <PlayerContactLinks
                    phone={r.player.phone}
                    telegramUsername={r.player.telegramUsername}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <AsyncTextButton
                    variant="emerald"
                    loadingLabel="…"
                    onClick={() => onConfirmRegistration(r.id)}
                  >
                    Подтвердить
                  </AsyncTextButton>
                  <AsyncTextButton
                    variant="red"
                    loadingLabel="…"
                    onClick={() => onRejectRegistration(r.id)}
                  >
                    Отклонить
                  </AsyncTextButton>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!pair && confirmedRegistrations.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
            Подтверждённые участники ({confirmedRegistrations.length})
          </p>
          <ul className="space-y-2">
            {confirmedRegistrations.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-zinc-900 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div>
                    {r.player.lastName} {r.player.firstName} — рейтинг {r.player.rating}
                  </div>
                  <PlayerContactLinks
                    phone={r.player.phone}
                    telegramUsername={r.player.telegramUsername}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={r.status}
                    label={REGISTRATION_STATUS_LABELS[r.status] ?? r.status}
                  />
                  {canModifyRegistrations && (
                    <AsyncTextButton
                      variant="red"
                      loadingLabel="…"
                      onClick={() => onCancelRegistration(r.id)}
                    >
                      Снять
                    </AsyncTextButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!pair && otherRegistrations.length > 0 && (
        <ul className="space-y-2">
          {otherRegistrations.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-zinc-900 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div>
                  {r.player.lastName} {r.player.firstName} — рейтинг {r.player.rating}
                </div>
                <PlayerContactLinks
                  phone={r.player.phone}
                  telegramUsername={r.player.telegramUsername}
                />
              </div>
              <StatusBadge
                status={r.status}
                label={REGISTRATION_STATUS_LABELS[r.status] ?? r.status}
              />
            </li>
          ))}
        </ul>
      )}

      {!pair && t.registrations.length === 0 && (
        <p className="text-xs text-zinc-500">Заявок и участников пока нет.</p>
      )}

      {pair && activeTeams.length === 0 && (
        <p className="text-xs text-zinc-500">Команд пока нет.</p>
      )}
    </div>
  );
}

function BracketTab({
  t,
  format,
  confirmedCount,
  confirmedTeams,
  maxRound,
  currentRoundOpen,
  bracketLoading,
  bracketMatches,
  onGenerateBracket,
  onSaveMatchResult,
  onCancelMatchResult,
}: {
  t: AdminTournament;
  format: string;
  confirmedCount: number;
  confirmedTeams: Team[];
  maxRound: number;
  currentRoundOpen: boolean;
  bracketLoading: boolean;
  bracketMatches: BracketMatchView[];
  onGenerateBracket: () => void | Promise<void>;
  onSaveMatchResult: (payload: MatchResultPayload) => Promise<void>;
  onCancelMatchResult?: (matchId: string) => Promise<void>;
}) {
  const dynamicSwiss = isDynamicSwissFormat(format);
  const fixedSwiss = isFixedSwissFormat(format);
  const olympic = isOlympicFormat(format);
  const oneShotGrid = olympic || fixedSwiss;
  const [modalMatch, setModalMatch] = useState<BracketMatchView | null>(null);
  const [matchSaving, setMatchSaving] = useState(false);
  const [playerModal, setPlayerModal] = useState<{
    id: string;
    preview?: TeamPlayer;
  } | null>(null);

  const matchNumbers = useMemo(() => {
    const sorted = [...bracketMatches].sort(
      (a, b) => a.round - b.round || a.slot - b.slot,
    );
    return new Map(sorted.map((m, i) => [m.id, i + 1]));
  }, [bracketMatches]);

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

  if (!dynamicSwiss && !fixedSwiss && !olympic) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
        Сетка для этого формата пока не поддерживается.
      </div>
    );
  }

  const generateLabel = bracketLoading
    ? "Формируем…"
    : oneShotGrid
      ? maxRound === 0
        ? "Сформировать сетку"
        : "Сетка сформирована"
      : maxRound === 0
        ? "Сформировать 1-й тур"
        : `Сформировать тур ${maxRound + 1}`;

  const generateDisabled =
    bracketLoading ||
    confirmedCount < 2 ||
    (oneShotGrid && maxRound > 0) ||
    (dynamicSwiss && maxRound > 0 && currentRoundOpen);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onGenerateBracket}
          disabled={generateDisabled}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm hover:bg-emerald-600 disabled:opacity-50"
        >
          {bracketLoading ? "Формирование…" : generateLabel}
        </button>
        <span className="text-xs text-zinc-500">
          Подтверждённых: {confirmedCount}
          {confirmedCount < 2 && " (минимум 2)"}
          {dynamicSwiss && maxRound > 0 && currentRoundOpen && " · завершите текущий тур"}
          {fixedSwiss && maxRound === 0 && " · все встречи и переходы (#) будут созданы сразу"}
          {olympic && maxRound === 0 && " · олимпийская сетка целиком, как в приказе"}
        </span>
      </div>

      {bracketMatches.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {oneShotGrid
            ? "Сетка ещё не сформирована. Подтвердите участников и нажмите «Сформировать сетку»."
            : "Сетка ещё не сформирована. Подтвердите участников и нажмите «Сформировать 1-й тур»."}
        </p>
      ) : (
        <>
          <p className="text-xs text-zinc-500">
            {olympic
              ? "Имя — профиль игрока · рамка счёта или строка «Фора» — результат встречи."
              : "Зажмите фон сетки и тащите. Имя — карточка игрока, счёт / # / подвал — результат встречи."}
          </p>
          {olympic ? (
            <OlympicBracketView
              matches={bracketMatches}
              onMatchClick={setModalMatch}
              onPlayerClick={(id, preview) => setPlayerModal({ id, preview })}
              showMatchScore
            />
          ) : (
            <SwissBracketView
              matches={bracketMatches}
              showStandings={false}
              fixedGrid={fixedSwiss}
              onMatchClick={setModalMatch}
              onPlayerClick={(id, preview) => setPlayerModal({ id, preview })}
            />
          )}
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
      )}
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
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
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
        <p className="text-sm text-zinc-500">
          Нет подтверждённых участников для протокола.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Место</th>
                <th className="px-4 py-3 font-medium">Участник</th>
                <th className="px-4 py-3 font-medium">Рейтинг</th>
                {showSwissPoints && (
                  <th className="px-4 py-3 font-medium">Очки</th>
                )}
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.place}-${row.label}`} className="border-t border-zinc-800">
                  <td className="px-4 py-3 font-mono text-emerald-400">{row.place}</td>
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">{formatRating(row.rating)}</td>
                  {showSwissPoints && (
                    <td className="px-4 py-3 font-mono">{row.points ?? 0}</td>
                  )}
                  <td className="px-4 py-3 text-xs text-zinc-500">{row.note ?? ""}</td>
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
}: {
  match: Match;
  onSetWinner: (matchId: string, winnerTeamId: string) => void;
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
    team1 && team2 ? describeHandicap(teamRating(team1), teamRating(team2)) : null;

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
        {team.status === "PENDING" && (
          <AsyncTextButton variant="emerald" loadingLabel="…" onClick={onConfirm}>
            Подтвердить
          </AsyncTextButton>
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
