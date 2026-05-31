"use client";

import { useState } from "react";

export default function HandicapPage() {
  const [ratingA, setRatingA] = useState(1);
  const [ratingB, setRatingB] = useState(0);
  const [game, setGame] = useState(1);
  const [result, setResult] = useState<{
    description: string;
    handicapBalls: number;
    strongerPlayer: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function calculate() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ratingA: String(ratingA),
        ratingB: String(ratingB),
        game: String(game),
      });
      const res = await fetch(`/api/handicap?${params}`);
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="admin-page-title mb-2">Калькулятор форы</h1>
      <p className="admin-page-lead mb-6 text-sm">
        Система 0,5: разница 0,5 — 1 шар в нечётных партиях; разница 1,0 — 1
        шар в каждой партии.
      </p>
      <div className="admin-card space-y-4 p-6">
        <div>
          <label className="admin-label">Рейтинг игрока A</label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={ratingA}
            onChange={(e) => setRatingA(parseFloat(e.target.value))}
            className="admin-input w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="admin-label">Рейтинг игрока B</label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={ratingB}
            onChange={(e) => setRatingB(parseFloat(e.target.value))}
            className="admin-input w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="admin-label">Номер партии</label>
          <input
            type="number"
            min="1"
            value={game}
            onChange={(e) => setGame(parseInt(e.target.value, 10))}
            className="admin-input w-full px-3 py-2"
          />
        </div>
        <button
          type="button"
          onClick={calculate}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-medium hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {loading ? "Расчёт…" : "Рассчитать"}
        </button>
        {result && (
          <div className="admin-inset p-4 text-sm">
            <p>
              Сильнейший: игрок <strong>{result.strongerPlayer}</strong>
            </p>
            <p className="admin-text-secondary mt-2">{result.description}</p>
            <p className="admin-stat-value mt-2 text-base">
              Фора в партии {game}: {result.handicapBalls} шар(ов)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
