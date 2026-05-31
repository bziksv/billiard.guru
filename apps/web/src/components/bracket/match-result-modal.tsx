"use client";

import { useEffect, useState } from "react";
import type { BracketMatchView } from "@/lib/bracket-view";
import { teamLabel } from "@/lib/pair-tournament";
import { cn } from "@/lib/cn";

export interface MatchResultPayload {
  matchId: string;
  winnerTeamId?: string;
  team1Score?: number | null;
  team2Score?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
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

export function MatchResultModal({
  match,
  matchNumber,
  open,
  saving,
  onClose,
  onSave,
  onCancel,
}: {
  match: BracketMatchView | null;
  matchNumber?: number;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: MatchResultPayload) => Promise<void>;
  onCancel?: (matchId: string) => Promise<void>;
}) {
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [finishedAt, setFinishedAt] = useState("");
  const [winnerTeamId, setWinnerTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!match || !open) return;
    setTeam1Score(match.team1Score != null ? String(match.team1Score) : "");
    setTeam2Score(match.team2Score != null ? String(match.team2Score) : "");
    setStartedAt(toDatetimeLocal(match.startedAt));
    setFinishedAt(toDatetimeLocal(match.finishedAt));
    setWinnerTeamId(match.winnerTeamId ?? "");
    setError(null);
    setConfirmCancel(false);
  }, [match, open]);

  if (!open || !match) return null;

  const finished = match.status === "FINISHED" || !!match.winnerTeamId;
  const roundOneBye = Boolean(
    match.round === 1 &&
      ((match.team1 && !match.team2) || (!match.team1 && match.team2)),
  );
  const team1Label = match.team1 ? teamLabel(match.team1) : "—";
  const team2Label = match.team2
    ? teamLabel(match.team2)
    : roundOneBye
      ? "× (автопроход)"
      : "—";

  async function savePartial(startOnly = false) {
    setError(null);
    const payload: MatchResultPayload = {
      matchId: match!.id,
      team1Score: team1Score === "" ? null : Number(team1Score),
      team2Score: team2Score === "" ? null : Number(team2Score),
      startedAt: startedAt ? new Date(startedAt).toISOString() : null,
      finishedAt: startOnly ? undefined : finishedAt ? new Date(finishedAt).toISOString() : null,
    };
    if (Number.isNaN(payload.team1Score as number) || Number.isNaN(payload.team2Score as number)) {
      setError("Счёт должен быть числом");
      return;
    }
    try {
      await onSave(payload);
      if (startOnly) onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  }

  async function saveResult() {
    setError(null);
    const s1 = team1Score === "" ? null : Number(team1Score);
    const s2 = team2Score === "" ? null : Number(team2Score);
    if ((s1 !== null && Number.isNaN(s1)) || (s2 !== null && Number.isNaN(s2))) {
      setError("Счёт должен быть числом");
      return;
    }

    let winner = winnerTeamId || undefined;
    if (roundOneBye && match!.team1) {
      winner = match!.team1.id;
    } else if (match!.team1 && match!.team2) {
      if (s1 !== null && s2 !== null) {
        if (s1 > s2) winner = match!.team1.id;
        else if (s2 > s1) winner = match!.team2.id;
      }
      if (!winner) {
        setError("Укажите счёт или выберите победителя");
        return;
      }
    }

    const payload: MatchResultPayload = {
      matchId: match!.id,
      winnerTeamId: winner,
      team1Score: s1,
      team2Score: s2,
      startedAt: startedAt ? new Date(startedAt).toISOString() : null,
      finishedAt: finishedAt
        ? new Date(finishedAt).toISOString()
        : new Date().toISOString(),
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

  return (
    <div
      className="bracket-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bracket-modal-panel w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Встреча #{matchNumber ?? "—"}</h2>
            <p className="bracket-modal-muted mt-1 text-sm">
              Тур {match.round} · слот {match.slot}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bracket-modal-muted hover:text-[var(--admin-text,var(--text-primary))]"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="bracket-modal-label mb-1 block">{team1Label}</span>
              <input
                type="number"
                min="0"
                value={team1Score}
                onChange={(e) => setTeam1Score(e.target.value)}
                className="bracket-modal-input w-full px-3 py-2 font-mono"
                placeholder="Счёт"
              />
            </label>
            <label className="block text-sm">
              <span className="bracket-modal-label mb-1 block">{team2Label}</span>
              <input
                type="number"
                min="0"
                value={team2Score}
                onChange={(e) => setTeam2Score(e.target.value)}
                disabled={roundOneBye}
                className="bracket-modal-input w-full px-3 py-2 font-mono disabled:opacity-50"
                placeholder="Счёт"
              />
            </label>
          </div>

          {!roundOneBye && match.team1 && match.team2 && !finished && (
            <div className="space-y-2">
              <p className="bracket-modal-muted text-xs">Победитель (если счёт не указан)</p>
              <div className="flex flex-wrap gap-2">
                {[match.team1, match.team2].map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setWinnerTeamId(team.id)}
                    className={cn(
                      "bracket-modal-choice rounded-lg px-3 py-1.5 text-sm",
                      winnerTeamId === team.id && "bracket-modal-choice--active",
                    )}
                  >
                    {teamLabel(team)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="block text-sm">
            <span className="bracket-modal-label mb-1 block">Начало встречи</span>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                className="bracket-modal-input min-w-0 flex-1 px-3 py-2"
              />
              <button
                type="button"
                onClick={() => setStartedAt(nowDatetimeLocal())}
                className="bracket-modal-choice shrink-0 rounded-lg px-3 py-2 text-xs"
              >
                Сейчас
              </button>
            </div>
          </label>

          <label className="block text-sm">
            <span className="bracket-modal-label mb-1 block">Завершение встречи</span>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={finishedAt}
                onChange={(e) => setFinishedAt(e.target.value)}
                className="bracket-modal-input min-w-0 flex-1 px-3 py-2"
              />
              <button
                type="button"
                onClick={() => setFinishedAt(nowDatetimeLocal())}
                className="bracket-modal-choice shrink-0 rounded-lg px-3 py-2 text-xs"
              >
                Сейчас
              </button>
            </div>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {finished && onCancel && !confirmCancel && (
            <p className="text-xs leading-relaxed text-zinc-500">
              Отмена сбросит результат, счёт и уберёт игроков из следующих встреч, если те
              ещё не сыграны.
            </p>
          )}

          {confirmCancel && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-3 text-sm">
              <p className="text-red-200">Отменить результат этой встречи?</p>
              <p className="mt-1 text-xs text-red-200/70">
                Счёт будет удалён, победитель снят. Если следующая встреча уже завершена —
                отмена не пройдёт.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={cancelResult}
                  className="rounded-lg bg-red-700 px-3 py-1.5 text-xs hover:bg-red-600 disabled:opacity-50"
                >
                  {saving ? "Отмена…" : "Да, отменить"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirmCancel(false)}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs hover:border-zinc-500"
                >
                  Нет
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => savePartial(true)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500 disabled:opacity-50"
            >
              Сохранить начало
            </button>
            {!finished && (
              <button
                type="button"
                disabled={saving}
                onClick={saveResult}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? "Сохранение…" : "Зафиксировать результат"}
              </button>
            )}
            {finished && (
              <button
                type="button"
                disabled={saving}
                onClick={() => savePartial(false)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? "Сохранение…" : "Обновить данные"}
              </button>
            )}
            {finished && onCancel && !confirmCancel && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmCancel(true)}
                className="rounded-lg border border-red-900/60 px-4 py-2 text-sm text-red-400 hover:border-red-700 hover:bg-red-950/30 disabled:opacity-50"
              >
                Отменить результат
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
