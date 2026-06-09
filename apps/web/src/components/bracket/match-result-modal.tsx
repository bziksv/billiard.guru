"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  isMatchReadyForResult,
  matchAutopassBye,
  type BracketMatchView,
} from "@/lib/bracket-view";
import {
  defaultScoreInput,
  isMatchResolved,
  parseMatchScoreInputs,
  validateMatchScoresForFinish,
  winnerTeamIdFromScores,
} from "@/lib/match-result";
import { teamLabel } from "@/lib/pair-tournament";
import { cn } from "@/lib/cn";
import type { TournamentTableOption } from "@/lib/tournament-stream";

export interface MatchResultPayload {
  matchId: string;
  winnerTeamId?: string;
  team1Score?: number | null;
  team2Score?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  tableId?: string | null;
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowDatetimeLocal(): string {
  return toDatetimeLocal(new Date().toISOString());
}

/** Старт встречи без модалки: время «сейчас», стол — авто на сервере. */
export function buildMatchStartNowPayload(matchId: string): MatchResultPayload {
  return { matchId, startedAt: new Date().toISOString() };
}

function toIsoFromLocal(value: string): string {
  return new Date(value).toISOString();
}

function TableSelect({
  value,
  onChange,
  tables,
}: {
  value: string;
  onChange: (value: string) => void;
  tables: TournamentTableOption[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options = useMemo(
    () => [
      { value: "", label: "Не выбран (авто)" },
      ...tables.map((table) => ({
        value: table.id,
        label: `${table.label}${table.hasStream ? " (тв-стол)" : ""}`,
      })),
    ],
    [tables],
  );

  const selected = options.find((option) => option.value === value) ?? options[0]!;

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="admin-input flex w-full items-center justify-between gap-2 px-2 py-2 text-left text-sm"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 truncate">{selected.label}</span>
        <span className="shrink-0 text-zinc-400" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-[60] mt-1 max-h-48 w-full overflow-auto rounded-lg border py-1 shadow-xl"
        >
          {options.map((option) => (
            <li key={option.value || "__auto"}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm",
                  option.value === value
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-[var(--admin-text-secondary)] hover:bg-[var(--admin-row-hover)]",
                )}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Не отправляем null — иначе в БД сотрётся уже сохранённое время. */
function buildMatchTimePayload(options: {
  startedAt: string;
  finishedAt: string;
  includeStart: boolean;
  includeFinish: boolean;
  defaultStartIfEmpty?: boolean;
  defaultFinishIfEmpty?: boolean;
}): Pick<MatchResultPayload, "startedAt" | "finishedAt"> {
  const out: Pick<MatchResultPayload, "startedAt" | "finishedAt"> = {};
  let start = options.startedAt;
  let finish = options.finishedAt;
  if (options.includeStart && !start && options.defaultStartIfEmpty) {
    start = nowDatetimeLocal();
  }
  if (options.includeFinish && !finish && options.defaultFinishIfEmpty) {
    finish = nowDatetimeLocal();
  }
  if (options.includeStart && start) {
    out.startedAt = toIsoFromLocal(start);
  }
  if (options.includeFinish && finish) {
    out.finishedAt = toIsoFromLocal(finish);
  }
  return out;
}

export function MatchResultModal({
  match,
  matchNumber,
  open,
  saving,
  tournamentTables = [],
  onClose,
  onSave,
  onCancel,
}: {
  match: BracketMatchView | null;
  matchNumber?: number;
  open: boolean;
  saving: boolean;
  tournamentTables?: TournamentTableOption[];
  onClose: () => void;
  onSave: (payload: MatchResultPayload) => Promise<void>;
  onCancel?: (matchId: string) => Promise<void>;
}) {
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [finishedAt, setFinishedAt] = useState("");
  const [tableId, setTableId] = useState("");
  const [winnerTeamId, setWinnerTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!match || !open) return;
    setTeam1Score(defaultScoreInput(match.team1Score));
    setTeam2Score(defaultScoreInput(match.team2Score));
    setStartedAt(toDatetimeLocal(match.startedAt));
    setFinishedAt(toDatetimeLocal(match.finishedAt));
    setTableId(match.tableId ?? "");
    setWinnerTeamId(match.winnerTeamId ?? "");
    setError(null);
    setConfirmCancel(false);
  }, [match, open]);

  if (!open || !match) return null;

  const finished = isMatchResolved(match.status, match.winnerTeamId);
  const { isBye: roundOneBye } = matchAutopassBye(match);
  const resultReady = isMatchReadyForResult(match);
  const team1Label = match.team1 ? teamLabel(match.team1) : "—";
  const team2Label = match.team2
    ? teamLabel(match.team2)
    : roundOneBye
      ? "× (автопроход)"
      : "Ожидание соперника";

  async function saveTimesOnly(options: {
    startOnly: boolean;
    startOverride?: string;
    closeAfter?: boolean;
  }) {
    setError(null);
    const times = buildMatchTimePayload({
      startedAt: options.startOverride ?? startedAt,
      finishedAt,
      includeStart: true,
      includeFinish: !options.startOnly,
      defaultStartIfEmpty: true,
      defaultFinishIfEmpty: !options.startOnly,
    });
    if (times.startedAt) {
      setStartedAt(toDatetimeLocal(times.startedAt));
    }
    if (times.finishedAt) {
      setFinishedAt(toDatetimeLocal(times.finishedAt));
    }
    const payload: MatchResultPayload = {
      matchId: match!.id,
      ...times,
      ...(tableId ? { tableId } : {}),
    };
    try {
      await onSave(payload);
      if (options.closeAfter) onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  }

  /** Обновление времени и счёта уже завершённой встречи (без смены победителя). */
  async function saveFinishedMatchData() {
    setError(null);
    if (!resultReady) {
      setError("Соперник ещё не определён");
      return;
    }
    const parsed = parseMatchScoreInputs(team1Score, team2Score);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const times = buildMatchTimePayload({
      startedAt,
      finishedAt,
      includeStart: true,
      includeFinish: true,
      defaultStartIfEmpty: false,
      defaultFinishIfEmpty: false,
    });
    if (times.startedAt) {
      setStartedAt(toDatetimeLocal(times.startedAt));
    }
    if (times.finishedAt) {
      setFinishedAt(toDatetimeLocal(times.finishedAt));
    }
    const payload: MatchResultPayload = {
      matchId: match!.id,
      team1Score: parsed.s1,
      team2Score: parsed.s2,
      ...(tableId ? { tableId } : {}),
      ...times,
    };
    try {
      await onSave(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  }

  async function stampStartNow() {
    const now = nowDatetimeLocal();
    setStartedAt(now);
    await saveTimesOnly({ startOnly: true, startOverride: now, closeAfter: true });
  }

  function stampFinishNow() {
    const now = nowDatetimeLocal();
    setFinishedAt(now);
    if (!startedAt) {
      setStartedAt(now);
    }
    // Счёт ещё не зафиксирован — только подставляем время; сохранение по «Зафиксировать результат».
    if (resultReady || finished) return;
    void saveTimesOnly({ startOnly: false, startOverride: startedAt || now });
  }

  async function saveResult() {
    setError(null);
    if (!resultReady) {
      setError("Соперник ещё не определён — дождитесь соперника");
      return;
    }
    const parsed = parseMatchScoreInputs(team1Score, team2Score);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const { s1, s2 } = parsed;

    let winner = winnerTeamId || undefined;
    if (roundOneBye && match!.team1) {
      winner = match!.team1.id;
    } else if (match!.team1 && match!.team2) {
      const scoreError = validateMatchScoresForFinish(s1, s2);
      if (scoreError) {
        setError(scoreError);
        return;
      }
      winner =
        winnerTeamIdFromScores(match!.team1.id, match!.team2.id, s1, s2) ??
        winner;
      if (!winner) {
        setError("Укажите счёт или выберите победителя");
        return;
      }
    }

    const times = buildMatchTimePayload({
      startedAt,
      finishedAt,
      includeStart: true,
      includeFinish: true,
      defaultStartIfEmpty: true,
      defaultFinishIfEmpty: true,
    });
    const payload: MatchResultPayload = {
      matchId: match!.id,
      winnerTeamId: winner,
      team1Score: s1,
      team2Score: s2,
      ...(tableId ? { tableId } : {}),
      ...times,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  }

  async function cancelResult() {
    if (!onCancel || !match) return;
    setError(null);
    try {
      await onCancel(match.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отменить");
      setConfirmCancel(false);
    }
  }

  function pickWinner(teamId: string) {
    setWinnerTeamId(teamId);
    if (!match?.team1 || !match.team2) return;
    if (teamId === match.team1.id) {
      setTeam1Score("1");
      setTeam2Score("0");
    } else {
      setTeam1Score("0");
      setTeam2Score("1");
    }
  }

  const parsedScores = parseMatchScoreInputs(team1Score, team2Score);
  const canFixResult =
    roundOneBye ||
    (resultReady &&
      parsedScores.ok &&
      validateMatchScoresForFinish(parsedScores.s1, parsedScores.s2) === null);
  const scoresDisabled = !resultReady && !finished;

  return (
    <div
      className="bracket-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bracket-modal-panel w-full max-w-lg overflow-visible"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="match-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--bracket-modal-border)] px-5 py-4">
          <div className="min-w-0">
            <h2 id="match-modal-title" className="text-lg font-semibold leading-tight">
              Встреча #{matchNumber ?? "—"}
            </h2>
            <p className="bracket-modal-muted mt-1 text-sm">
              Тур {match.round} · слот {match.slot}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bracket-modal-close"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {!resultReady && !finished && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
              Соперник ещё не определён — счёт и результат недоступны. Можно сохранить
              только время начала или завершения.
            </p>
          )}
          <div className="bracket-modal-score-box p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3">
              <label className="min-w-0 text-center">
                <span className="admin-label-xs mb-2 block truncate">{team1Label}</span>
                <input
                  type="number"
                  min="0"
                  value={team1Score}
                  onChange={(e) => setTeam1Score(e.target.value)}
                  disabled={scoresDisabled}
                  className="admin-input w-full px-2 py-2 text-center font-mono text-lg tabular-nums disabled:opacity-50"
                  placeholder="0"
                  aria-label={`Счёт: ${team1Label}`}
                />
              </label>
              <span className="pb-2.5 text-xl font-medium text-zinc-400" aria-hidden>
                :
              </span>
              <label className="min-w-0 text-center">
                <span
                  className={cn(
                    "admin-label-xs mb-2 block truncate",
                    !match.team2 && !roundOneBye && "text-zinc-400",
                  )}
                >
                  {team2Label}
                </span>
                <input
                  type="number"
                  min="0"
                  value={team2Score}
                  onChange={(e) => setTeam2Score(e.target.value)}
                  disabled={scoresDisabled || roundOneBye || !match.team2}
                  className="admin-input w-full px-2 py-2 text-center font-mono text-lg tabular-nums disabled:opacity-50"
                  placeholder="0"
                  aria-label={`Счёт: ${team2Label}`}
                />
              </label>
            </div>
          </div>

          {!roundOneBye && match.team1 && match.team2 && !finished && (
            <div className="space-y-2">
              <p className="admin-label-xs">
                Победитель (если счёт не указан) · 1:0 — техническое поражение
              </p>
              <div className="flex flex-wrap gap-2">
                {[match.team1, match.team2].map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => pickWinner(team.id)}
                    className={cn(
                      "bracket-modal-choice rounded-lg px-3 py-1.5 text-sm transition-colors",
                      winnerTeamId === team.id && "bracket-modal-choice--active",
                    )}
                  >
                    {teamLabel(team)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tournamentTables.length > 0 && (
            <label className="block text-sm">
              <span className="admin-label-xs mb-1.5 block">Стол</span>
              <TableSelect
                value={tableId}
                onChange={setTableId}
                tables={tournamentTables}
              />
            </label>
          )}

          <div className="space-y-4">
            <label className="block text-sm">
              <span className="admin-label-xs mb-1.5 block">Начало</span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  type="datetime-local"
                  value={startedAt}
                  onChange={(e) => setStartedAt(e.target.value)}
                  className="bracket-modal-datetime admin-input min-w-0 flex-1 px-2 py-2 text-sm tabular-nums"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void stampStartNow()}
                  className="admin-btn admin-btn--outline shrink-0 px-4 py-2 text-xs sm:w-24"
                >
                  {saving ? "…" : "Сейчас"}
                </button>
              </div>
            </label>

            <label className="block text-sm">
              <span className="admin-label-xs mb-1.5 block">Завершение</span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  type="datetime-local"
                  value={finishedAt}
                  onChange={(e) => setFinishedAt(e.target.value)}
                  className="bracket-modal-datetime admin-input min-w-0 flex-1 px-2 py-2 text-sm tabular-nums"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={stampFinishNow}
                  className="admin-btn admin-btn--outline shrink-0 px-4 py-2 text-xs sm:w-24"
                >
                  {saving ? "…" : "Сейчас"}
                </button>
              </div>
            </label>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          {finished && onCancel && !confirmCancel && (
            <p className="text-xs leading-relaxed text-zinc-500">
              Отмена сбросит результат и уберёт игроков из следующих встреч, если те ещё
              не сыграны.
            </p>
          )}

          {confirmCancel && (
            <div className="bracket-modal-danger px-4 py-3 text-sm">
              <p className="font-medium">Отменить результат этой встречи?</p>
              <p className="mt-1 text-xs">
                Счёт будет удалён, победитель снят. Если следующая встреча уже завершена —
                отмена не пройдёт.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={cancelResult}
                  className="admin-btn admin-btn--danger px-3 py-1.5 text-xs"
                >
                  {saving ? "Отмена…" : "Да, отменить"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirmCancel(false)}
                  className="admin-btn admin-btn--outline px-3 py-1.5 text-xs"
                >
                  Нет
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bracket-modal-footer flex flex-col-reverse gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[2.25rem]">
            {finished && onCancel && !confirmCancel && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmCancel(true)}
                className="admin-btn admin-btn--outline w-full border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 sm:w-auto dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Отменить результат
              </button>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => saveTimesOnly({ startOnly: true })}
              className="admin-btn admin-btn--outline px-4 py-2 text-sm"
            >
              Сохранить начало
            </button>
            {!finished && (
              <button
                type="button"
                disabled={saving || !canFixResult}
                onClick={saveResult}
                className="admin-btn admin-btn--primary px-4 py-2 text-sm disabled:opacity-50"
              >
                {saving ? "Сохранение…" : "Зафиксировать результат"}
              </button>
            )}
            {finished && (
              <button
                type="button"
                disabled={saving}
                onClick={saveFinishedMatchData}
                className="admin-btn admin-btn--primary px-4 py-2 text-sm"
              >
                {saving ? "Сохранение…" : "Обновить данные"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
