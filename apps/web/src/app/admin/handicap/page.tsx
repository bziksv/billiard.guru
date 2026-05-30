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

  async function calculate() {
    const params = new URLSearchParams({
      ratingA: String(ratingA),
      ratingB: String(ratingB),
      game: String(game),
    });
    const res = await fetch(`/api/handicap?${params}`);
    const data = await res.json();
    setResult(data);
  }

  return (
    <div className="max-w-md">
      <h1 className="mb-2 text-2xl font-bold">Калькулятор форы</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Система 0,5: разница 0,5 — 1 шар в нечётных партиях; разница 1,0 — 1
        шар в каждой партии.
      </p>
      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Рейтинг игрока A
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={ratingA}
            onChange={(e) => setRatingA(parseFloat(e.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Рейтинг игрока B
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={ratingB}
            onChange={(e) => setRatingB(parseFloat(e.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Номер партии
          </label>
          <input
            type="number"
            min="1"
            value={game}
            onChange={(e) => setGame(parseInt(e.target.value, 10))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
          />
        </div>
        <button
          onClick={calculate}
          className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          Рассчитать
        </button>
        {result && (
          <div className="rounded-lg bg-zinc-900 p-4 text-sm">
            <p>
              Сильнейший: игрок <strong>{result.strongerPlayer}</strong>
            </p>
            <p className="mt-2 text-zinc-300">{result.description}</p>
            <p className="mt-2 text-emerald-400">
              Фора в партии {game}: {result.handicapBalls} шар(ов)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
