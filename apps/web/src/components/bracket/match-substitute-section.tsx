"use client";

import { useEffect, useMemo, useState } from "react";
import type { BracketMatchView } from "@/lib/bracket-view";
import { teamLabel } from "@/lib/pair-tournament";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/cn";

type Candidate = {
  teamId: string;
  playerId: string;
  label: string;
  kind: "eliminated";
};

export function MatchSubstituteSection({
  match,
  tournamentId,
  playerOptions,
  disabled,
  onSubstituted,
}: {
  match: BracketMatchView;
  tournamentId: string;
  playerOptions: { value: string; label: string }[];
  disabled?: boolean;
  onSubstituted: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<1 | 2>(1);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [mode, setMode] = useState<"eliminated" | "outsider">("eliminated");
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sides = useMemo(() => {
    const list: { side: 1 | 2; label: string; teamId: string }[] = [];
    if (match.team1) {
      list.push({ side: 1, label: teamLabel(match.team1), teamId: match.team1.id });
    }
    if (match.team2) {
      list.push({ side: 2, label: teamLabel(match.team2), teamId: match.team2.id });
    }
    return list;
  }, [match.team1, match.team2]);

  useEffect(() => {
    if (sides.length === 0) return;
    if (!sides.some((s) => s.side === side)) {
      setSide(sides[0]!.side);
    }
  }, [sides, side]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCandidatesLoading(true);
    setError(null);
    const exclude = sides.map((s) => `excludeTeamId=${encodeURIComponent(s.teamId)}`).join("&");
    fetch(
      `/api/tournaments/bracket/substitute?tournamentId=${encodeURIComponent(tournamentId)}${exclude ? `&${exclude}` : ""}`,
    )
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить кандидатов");
        if (!cancelled) {
          setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
          setCandidates([]);
        }
      })
      .finally(() => {
        if (!cancelled) setCandidatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tournamentId, sides]);

  if (sides.length === 0) return null;

  const outgoingIds = new Set(sides.map((s) => s.teamId));
  const outsiderOptions = playerOptions.filter((p) => {
    const cand = candidates.find((c) => c.playerId === p.value);
    if (cand && outgoingIds.has(cand.teamId)) return false;
    return true;
  });

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        tournamentId,
        matchId: match.id,
        side,
      };
      if (mode === "eliminated") {
        if (!teamId) throw new Error("Выберите вылетевшего игрока");
        body.teamId = teamId;
      } else {
        if (!playerId) throw new Error("Выберите игрока");
        body.playerId = playerId;
      }
      const res = await fetch("/api/tournaments/bracket/substitute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось заменить");
      await onSubstituted();
      setOpen(false);
      setTeamId("");
      setPlayerId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось заменить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--bracket-modal-border)] px-3 py-3">
      {!open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="admin-btn admin-btn--outline w-full px-3 py-2 text-sm disabled:opacity-50"
        >
          Заменить игрока
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium">Замена игрока</p>
          <p className="text-xs leading-relaxed text-zinc-500">
            История сыгранных встреч не меняется. Рейтинг с этой встречи дальше пойдёт
            вошедшему. Только незавершённые матчи с уходящим игроком.
          </p>

          <div className="space-y-1.5">
            <p className="admin-label-xs">Кого заменить</p>
            <div className="flex flex-wrap gap-2">
              {sides.map((s) => (
                <button
                  key={s.side}
                  type="button"
                  onClick={() => setSide(s.side)}
                  className={cn(
                    "bracket-modal-choice rounded-lg px-3 py-1.5 text-sm transition-colors",
                    side === s.side && "bracket-modal-choice--active",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("eliminated");
                setPlayerId("");
              }}
              className={cn(
                "bracket-modal-choice rounded-lg px-3 py-1.5 text-xs transition-colors",
                mode === "eliminated" && "bracket-modal-choice--active",
              )}
            >
              Вылетевший
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("outsider");
                setTeamId("");
              }}
              className={cn(
                "bracket-modal-choice rounded-lg px-3 py-1.5 text-xs transition-colors",
                mode === "outsider" && "bracket-modal-choice--active",
              )}
            >
              Другой игрок
            </button>
          </div>

          {mode === "eliminated" ? (
            candidatesLoading ? (
              <p className="text-xs text-zinc-500">Загрузка…</p>
            ) : candidates.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Нет вылетевших кандидатов. Выберите «Другой игрок».
              </p>
            ) : (
              <SearchableSelect
                options={candidates.map((c) => ({
                  value: c.teamId,
                  label: c.label,
                }))}
                value={teamId}
                onChange={setTeamId}
                placeholder="Вылетевший игрок"
                searchPlaceholder="Поиск…"
              />
            )
          ) : (
            <SearchableSelect
              options={outsiderOptions}
              value={playerId}
              onChange={setPlayerId}
              placeholder="Игрок из базы"
              searchPlaceholder="Поиск…"
            />
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || disabled}
              onClick={() => void submit()}
              className="admin-btn px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {saving ? "Замена…" : "Подтвердить замену"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="admin-btn admin-btn--outline px-3 py-1.5 text-xs"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
