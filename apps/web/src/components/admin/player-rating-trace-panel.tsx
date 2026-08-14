"use client";

import { useEffect, useState } from "react";
import {
  formatPreviewDelta,
  formatPreviewRating,
} from "@/lib/rating-preview";
import type { PlayerRatingTraceDto } from "@/lib/rating-player-trace-display";

function surnameOf(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

export function PlayerRatingTracePanel({ playerId }: { playerId: string }) {
  const [trace, setTrace] = useState<PlayerRatingTraceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/players/${playerId}/rating-trace`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Ошибка загрузки");
        return data as PlayerRatingTraceDto;
      })
      .then((data) => {
        if (!cancelled) setTrace(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setTrace(null);
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (loading) {
    return (
      <p className="admin-muted text-xs">Загружаем динамику рейтинга…</p>
    );
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!trace) return null;

  const who = surnameOf(trace.playerName);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-sm font-semibold text-[var(--admin-text)]">
          Динамика рейтинга ({trace.formulaLabel})
        </h3>
        <p className="admin-muted text-xs leading-relaxed">{trace.note}</p>
        <p className="mt-1 text-xs text-[var(--admin-text-secondary)]">
          Старт симуляции (база):{" "}
          <span className="font-mono">{formatPreviewRating(trace.seedRating)}</span>
          {" → "}
          итог формулы:{" "}
          <span className="font-mono">
            {formatPreviewRating(trace.simulatedRating)}
          </span>
          {" · "}
          сейчас в базе:{" "}
          <span className="font-mono">
            {formatPreviewRating(trace.currentRating)}
          </span>
        </p>
      </div>

      <div className="admin-inset space-y-2 p-3">
        <h4 className="text-xs font-semibold text-[var(--admin-text)]">
          Цепочка по формуле ({trace.steps.length} встреч)
        </h4>
        {trace.steps.length === 0 ? (
          <p className="admin-muted text-xs">Нет завершённых встреч в симуляции.</p>
        ) : (
          <div className="max-h-80 overflow-auto">
            <table className="admin-table w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1">Дата</th>
                  <th className="px-2 py-1">Формат</th>
                  <th className="px-2 py-1">Итог</th>
                  <th className="px-2 py-1">{who} до</th>
                  <th className="px-2 py-1">Соперник</th>
                  <th className="px-2 py-1">Δ</th>
                  <th className="px-2 py-1">{who} после</th>
                </tr>
              </thead>
              <tbody>
                {trace.steps.map((s) => (
                  <tr key={`${s.matchId}-${s.won ? "w" : "l"}`}>
                    <td className="whitespace-nowrap px-2 py-1">
                      {new Date(s.at).toLocaleString("ru-RU")}
                    </td>
                    <td className="px-2 py-1">{s.isPair ? "Пара" : "Соло"}</td>
                    <td className="px-2 py-1">
                      {s.won ? "Победа" : "Поражение"}
                    </td>
                    <td className="px-2 py-1 font-mono">
                      {formatPreviewRating(s.ratingBefore)}
                    </td>
                    <td className="px-2 py-1">
                      {s.opponentName}{" "}
                      <span className="font-mono text-[var(--admin-text-muted)]">
                        {formatPreviewRating(s.opponentRatingBefore)}
                        {s.isPair ? " ср." : ""}
                      </span>
                    </td>
                    <td className="px-2 py-1 font-mono">
                      {formatPreviewDelta(s.delta)}
                    </td>
                    <td className="px-2 py-1 font-mono">
                      {formatPreviewRating(s.ratingAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {trace.journal.length > 0 && (
        <div className="admin-inset space-y-2 p-3">
          <h4 className="text-xs font-semibold text-[var(--admin-text)]">
            Записано в базу ({trace.journal.length})
          </h4>
          <p className="admin-muted text-xs">
            Фактические изменения общего рейтинга после прогона / автопересчёта.
          </p>
          <div className="max-h-56 overflow-auto">
            <table className="admin-table w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1">Дата</th>
                  <th className="px-2 py-1">Итог</th>
                  <th className="px-2 py-1">Соперник</th>
                  <th className="px-2 py-1">Было</th>
                  <th className="px-2 py-1">Δ</th>
                  <th className="px-2 py-1">Стало</th>
                </tr>
              </thead>
              <tbody>
                {trace.journal.map((s, i) => (
                  <tr key={`${s.matchId ?? "x"}-${i}`}>
                    <td className="whitespace-nowrap px-2 py-1">
                      {new Date(s.at).toLocaleString("ru-RU")}
                    </td>
                    <td className="px-2 py-1">
                      {s.won ? "Победа" : "Поражение"}
                    </td>
                    <td className="px-2 py-1">
                      {s.opponentName ?? "—"}
                      {s.isPair ? " (пара)" : ""}
                    </td>
                    <td className="px-2 py-1 font-mono">
                      {formatPreviewRating(s.oldRating)}
                    </td>
                    <td className="px-2 py-1 font-mono">
                      {formatPreviewDelta(s.delta)}
                    </td>
                    <td className="px-2 py-1 font-mono">
                      {formatPreviewRating(s.newRating)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
