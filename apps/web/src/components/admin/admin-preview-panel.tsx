"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type PlayerRow = {
  id: string;
  lastName: string;
  firstName: string;
  phone: string;
  city: { nameRu: string };
};

type ClubRow = {
  id: string;
  name: string;
  phone: string;
  city: { nameRu: string };
};

type PreviewState = {
  active: boolean;
  player: { id: string; name: string } | null;
  club: { id: string; name: string } | null;
};

export function AdminPreviewPanel() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [playerQuery, setPlayerQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [playersRes, clubsRes, previewRes] = await Promise.all([
      fetch("/api/players"),
      fetch("/api/clubs"),
      fetch("/api/admin/preview"),
    ]);
    const [playersData, clubsData, previewData] = await Promise.all([
      playersRes.json(),
      clubsRes.json(),
      previewRes.json(),
    ]);
    setPlayers(Array.isArray(playersData) ? playersData : []);
    setClubs(Array.isArray(clubsData) ? clubsData : []);
    setPreview(previewRes.ok ? previewData : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startPreview(body: object) {
    setBusy("start");
    setError(null);
    const res = await fetch("/api/admin/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Ошибка");
      return;
    }
    if (body && "mode" in body && body.mode === "clear") {
      await load();
      return;
    }
    router.push(data.redirect ?? "/");
    router.refresh();
  }

  const filteredPlayers = players.filter((p) => {
    const q = playerQuery.trim().toLowerCase();
    if (!q) return true;
    const hay = `${p.lastName} ${p.firstName} ${p.phone} ${p.city.nameRu}`.toLowerCase();
    return hay.includes(q);
  });

  if (loading) return <p className="text-sm text-zinc-500">Загрузка…</p>;

  return (
    <div className="max-w-3xl space-y-8">
      {preview?.active && (
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/40 p-4 text-sm">
          <p className="font-medium text-amber-200">Режим просмотра активен</p>
          {preview.player && <p className="mt-1 text-amber-100/90">Игрок: {preview.player.name}</p>}
          {preview.club && <p className="mt-1 text-amber-100/90">Клуб: {preview.club.name}</p>}
          <button
            type="button"
            disabled={busy === "start"}
            onClick={() => startPreview({ mode: "clear" })}
            className="mt-3 rounded-lg border border-amber-700 px-3 py-1.5 text-xs hover:bg-amber-900/50"
          >
            Выйти из режима
          </button>
        </div>
      )}

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div>
          <h2 className="text-lg font-semibold">Смотреть как игрок</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Личный кабинет, брони, регистрации — всё от имени выбранного игрока.
          </p>
        </div>
        <input
          value={playerQuery}
          onChange={(e) => setPlayerQuery(e.target.value)}
          placeholder="Поиск по ФИО, телефону, городу"
          className="site-input w-full"
        />
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {filteredPlayers.slice(0, 50).map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">
                  {p.lastName} {p.firstName}
                </p>
                <p className="text-zinc-500">
                  {p.city.nameRu} · {p.phone}
                </p>
              </div>
              <button
                type="button"
                disabled={busy === "start"}
                onClick={() => startPreview({ mode: "player", playerId: p.id })}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs hover:bg-emerald-500 disabled:opacity-50"
              >
                Войти как игрок
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div>
          <h2 className="text-lg font-semibold">Смотреть как владелец клуба</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Брони столов и управление клубом. Если у клуба есть игрок с тем же телефоном — подставится
            его профиль.
          </p>
        </div>
        <ul className="space-y-2">
          {clubs.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-zinc-500">
                  {c.city.nameRu} · {c.phone}
                </p>
              </div>
              <button
                type="button"
                disabled={busy === "start"}
                onClick={() => startPreview({ mode: "club", clubId: c.id })}
                className="rounded-lg border border-emerald-700 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-950/50 disabled:opacity-50"
              >
                Войти как владелец
              </button>
            </li>
          ))}
        </ul>
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
