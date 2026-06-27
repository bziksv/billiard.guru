"use client";

import { useMemo, useState } from "react";
import type { AdminTournament } from "@/lib/tournament-admin";

type PlayerLite = {
  id: string;
  firstName: string;
  lastName: string;
  rating: number;
};

function playerName(p: PlayerLite): string {
  return `${p.lastName} ${p.firstName}`.trim();
}

/** Привязка рейтинга к шагу 0,5 (рейтинги и фора всегда кратны 0,5). */
function snapRating(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return Math.max(0, Math.round(n * 2) / 2).toFixed(1);
}

/**
 * Сборка пар для парного турнира (флаг isPair): организатор перетаскивает
 * одного подтверждённого игрока на другого — образуется пара (TournamentTeam).
 */
export function TournamentPairBuilder({
  tournament,
  bracketLocked,
  onUpdated,
}: {
  tournament: AdminTournament;
  bracketLocked: boolean;
  onUpdated: () => void | Promise<void>;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Локальный черновик ввода рейтинга по парам (teamId → строка), пока поле в фокусе.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const pairedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const team of tournament.teams) {
      if (team.status === "CANCELLED" || team.status === "REJECTED") continue;
      if (!team.player2) continue;
      ids.add(team.player1.id);
      ids.add(team.player2.id);
    }
    return ids;
  }, [tournament.teams]);

  const freePlayers = useMemo<PlayerLite[]>(() => {
    return tournament.registrations
      .filter(
        (r) =>
          r.status !== "CANCELLED" &&
          r.status !== "REJECTED" &&
          !pairedPlayerIds.has(r.player.id),
      )
      .map((r) => ({
        id: r.player.id,
        firstName: r.player.firstName,
        lastName: r.player.lastName,
        rating: r.player.rating,
      }));
  }, [tournament.registrations, pairedPlayerIds]);

  const pairs = useMemo(
    () =>
      tournament.teams.filter(
        (team) =>
          team.player2 &&
          team.status !== "CANCELLED" &&
          team.status !== "REJECTED",
      ),
    [tournament.teams],
  );

  async function createPair(player1Id: string, player2Id: string) {
    if (player1Id === player2Id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tournaments/pairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tournament.id,
          player1Id,
          player2Id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось собрать пару");
        return;
      }
      await onUpdated();
    } finally {
      setBusy(false);
    }
  }

  async function breakPair(teamId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tournaments/pairs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось расформировать пару");
        return;
      }
      await onUpdated();
    } finally {
      setBusy(false);
    }
  }

  async function savePairRating(teamId: string, value: number | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tournaments/pairs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, ratingOverride: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось изменить рейтинг пары");
        return;
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[teamId];
        return next;
      });
      await onUpdated();
    } finally {
      setBusy(false);
    }
  }

  /** Шаг ±0,5 от текущего эффективного рейтинга, сразу сохраняет. */
  function stepRating(teamId: string, current: number, delta: number) {
    void savePairRating(teamId, Number(snapRating(current + delta)));
  }

  /** Сохранить введённое в поле значение (по blur/Enter), если изменилось. */
  function commitDraft(teamId: string, current: number) {
    const raw = drafts[teamId];
    if (raw === undefined) return;
    const snapped = snapRating(raw);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[teamId];
      return next;
    });
    if (snapped === "" || Number(snapped) === current) return;
    void savePairRating(teamId, Number(snapped));
  }

  function onDrop(targetId: string) {
    const sourceId = dragId;
    setDragId(null);
    setOverId(null);
    if (sourceId && sourceId !== targetId) {
      void createPair(sourceId, targetId);
    }
  }

  const expectedPairs = freePlayers.length + pairs.length;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-200">
          Сборка пар
          <span className="ml-2 text-xs font-normal text-zinc-500">
            пар собрано: {pairs.length} · игроков без пары: {freePlayers.length}
          </span>
        </h3>
      </div>

      {bracketLocked ? (
        <p className="tournament-bracket-locked-hint mb-3">
          Сетка сформирована — состав пар зафиксирован. Рейтинг пары можно
          скорректировать (повлияет на фору в предстоящих встречах).
        </p>
      ) : (
        <p className="mb-3 text-xs text-zinc-500">
          Перетащите одного игрока на другого, чтобы объединить их в пару. Пары
          участвуют в сетке вместе. По умолчанию рейтинг пары — сумма рейтингов
          игроков; для сыгранных пар можно задать свой рейтинг для посева.
        </p>
      )}

      {!bracketLocked && (
        <div className="mb-4">
          <p className="tournament-section-label mb-2">
            Игроки без пары ({freePlayers.length})
          </p>
          {freePlayers.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Все подтверждённые игроки распределены по парам.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {freePlayers.map((p) => (
                <li
                  key={p.id}
                  draggable={!busy}
                  onDragStart={() => setDragId(p.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (overId !== p.id) setOverId(p.id);
                  }}
                  onDragLeave={() => {
                    if (overId === p.id) setOverId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDrop(p.id);
                  }}
                  className={[
                    "cursor-grab select-none rounded-lg border px-3 py-2 text-sm transition active:cursor-grabbing",
                    dragId === p.id
                      ? "border-emerald-500 bg-emerald-950/40 opacity-60"
                      : overId === p.id
                        ? "border-emerald-400 bg-emerald-950/30"
                        : "border-zinc-700 bg-zinc-800 hover:border-zinc-600",
                  ].join(" ")}
                  title="Перетащите на другого игрока"
                >
                  <span className="font-medium text-zinc-100">
                    {playerName(p)}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {p.rating.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <p className="tournament-section-label mb-2">
          Пары ({pairs.length}
          {expectedPairs > 0 ? ` из ${expectedPairs}` : ""})
        </p>
        {pairs.length === 0 ? (
          <p className="text-xs text-zinc-500">Пар пока нет.</p>
        ) : (
          <ul className="space-y-2">
            {pairs.map((team, index) => {
              const sumRating =
                team.player1.rating + (team.player2?.rating ?? 0);
              const hasOverride = team.ratingOverride != null;
              const effectiveRating = hasOverride
                ? (team.ratingOverride as number)
                : sumRating;
              const inputValue =
                drafts[team.id] ?? effectiveRating.toFixed(1);
              return (
                <li
                  key={team.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-zinc-500">{index + 1}.</span>
                    <span className="font-medium text-zinc-100">
                      {team.player1.lastName} {team.player1.firstName}
                      {" / "}
                      {team.player2?.lastName} {team.player2?.firstName}
                    </span>
                    <span
                      className="flex items-center gap-1"
                      title={
                        bracketLocked
                          ? "Рейтинг пары (влияет на фору)"
                          : "Рейтинг пары для посева"
                      }
                    >
                      <span className="mr-0.5 text-xs text-zinc-500">
                        рейтинг
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          stepRating(team.id, effectiveRating, -0.5)
                        }
                        aria-label="Уменьшить на 0,5"
                        className="admin-btn admin-btn--outline px-2 py-0.5 text-xs disabled:opacity-50"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={inputValue}
                        disabled={busy}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [team.id]: e.target.value,
                          }))
                        }
                        onBlur={() => commitDraft(team.id, effectiveRating)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        className={[
                          "w-16 rounded border bg-zinc-900 px-2 py-0.5 text-center text-xs",
                          hasOverride
                            ? "border-amber-700/60 text-amber-300"
                            : "border-zinc-600 text-zinc-100",
                        ].join(" ")}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          stepRating(team.id, effectiveRating, 0.5)
                        }
                        aria-label="Увеличить на 0,5"
                        className="admin-btn admin-btn--outline px-2 py-0.5 text-xs disabled:opacity-50"
                      >
                        +
                      </button>
                      {hasOverride ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void savePairRating(team.id, null)}
                          title={`Сбросить к сумме рейтингов (${sumRating.toFixed(1)})`}
                          className="ml-1 text-xs text-zinc-500 underline hover:text-zinc-300 disabled:opacity-50"
                        >
                          сброс (Σ {sumRating.toFixed(1)})
                        </button>
                      ) : (
                        <span className="ml-1 text-[10px] text-zinc-600">
                          = сумма
                        </span>
                      )}
                    </span>
                  </div>
                  {!bracketLocked && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void breakPair(team.id)}
                      className="admin-btn admin-btn--outline px-3 py-1 text-xs disabled:opacity-50"
                    >
                      Расформировать
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
