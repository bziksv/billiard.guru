"use client";

import { useMemo, useState } from "react";
import { TournamentTeamRatingEditor } from "@/components/admin/tournament-team-rating-editor";
import { formatRating } from "@/lib/rating";
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
                    <TournamentTeamRatingEditor
                      teamId={team.id}
                      baseRating={sumRating}
                      ratingOverride={team.ratingOverride}
                      bracketLocked={bracketLocked}
                      onUpdated={onUpdated}
                      disabled={busy}
                      resetHint={`к Σ ${formatRating(sumRating)}`}
                    />
                    {team.ratingOverride == null ? (
                      <span className="text-[10px] text-zinc-600">= сумма</span>
                    ) : null}
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
