"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AdminTableSearchField,
  AdminTableToolbar,
} from "@/components/admin/admin-table-toolbar";
import {
  AdminSortHeader,
  type SortDir,
} from "@/components/admin/admin-sort-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AsyncTextButton } from "@/components/ui/async-text-button";
import { formatRating } from "@/lib/rating";

interface PlayerOption {
  id: string;
  firstName: string;
  lastName: string;
  rating: number;
}

interface ClubPlayerRatingRow {
  id: string;
  rating: number;
  player: PlayerOption & {
    city: { nameRu: string };
  };
}

type SortKey = "name" | "systemRating" | "clubRating";

export function ClubPlayerRatingsPanel({
  clubId,
  clubName,
  variant = "admin",
  refreshKey = 0,
  onLoaded,
}: {
  clubId: string;
  clubName: string;
  variant?: "admin" | "manage";
  refreshKey?: number;
  onLoaded?: () => void;
}) {
  const [rows, setRows] = useState<ClubPlayerRatingRow[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [addPlayerId, setAddPlayerId] = useState("");
  const [addRating, setAddRating] = useState("0");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  async function reload() {
    const res = await fetch(`/api/clubs/${clubId}/player-ratings`);
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/clubs/${clubId}/player-ratings`).then((r) => r.json()),
      fetch("/api/players").then((r) => r.json()),
    ]).then(([ratings, players]) => {
      if (!active) return;
      setRows(Array.isArray(ratings) ? ratings : []);
      setAllPlayers(Array.isArray(players) ? players : []);
      setLoading(false);
      onLoaded?.();
    });
    return () => {
      active = false;
    };
  }, [clubId, refreshKey, onLoaded]);

  const indexedPlayerIds = useMemo(
    () => new Set(rows.map((r) => r.player.id)),
    [rows],
  );

  const playerOptions = useMemo(
    () =>
      allPlayers
        .filter((p) => !indexedPlayerIds.has(p.id))
        .map((p) => ({
          value: p.id,
          label: `${p.lastName} ${p.firstName} (общий ${formatRating(p.rating)})`,
        })),
    [allPlayers, indexedPlayerIds],
  );

  const selectedAddPlayer = allPlayers.find((p) => p.id === addPlayerId);

  useEffect(() => {
    if (selectedAddPlayer) {
      setAddRating(String(selectedAddPlayer.rating));
    }
  }, [selectedAddPlayer?.id, selectedAddPlayer?.rating]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((row) => {
      if (!q) return true;
      const p = row.player;
      return [p.lastName, p.firstName, p.city.nameRu]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const mul = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "systemRating":
          return mul * (a.player.rating - b.player.rating);
        case "clubRating":
          return mul * (a.rating - b.rating);
        case "name":
        default:
          return (
            mul *
            (`${a.player.lastName} ${a.player.firstName}`.localeCompare(
              `${b.player.lastName} ${b.player.firstName}`,
              "ru",
            ))
          );
      }
    });
  }, [rows, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  async function addPlayer() {
    if (!addPlayerId) return;
    setAddSaving(true);
    setAddError(null);
    const res = await fetch(`/api/clubs/${clubId}/player-ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: addPlayerId,
        rating: Number(addRating),
      }),
    });
    const data = await res.json();
    setAddSaving(false);
    if (!res.ok) {
      setAddError(data.error ?? "Ошибка");
      return;
    }
    setAddPlayerId("");
    setAddRating("0");
    await reload();
  }

  async function saveClubRating(playerId: string, rating: number) {
    const res = await fetch(
      `/api/clubs/${clubId}/player-ratings/${playerId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      },
    );
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Не удалось сохранить");
      return;
    }
    await reload();
  }

  async function removePlayer(playerId: string, name: string) {
    if (!confirm(`Убрать ${name} из рейтинга клуба?`)) return;
    const res = await fetch(
      `/api/clubs/${clubId}/player-ratings/${playerId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Не удалось удалить");
      return;
    }
    await reload();
  }

  const header = variant === "admin" ? (
    <div>
      <Link href="/admin/clubs" className="text-sm text-emerald-400 hover:underline">
        ← Клубы
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Рейтинг игроков</h1>
      <p className="mt-1 text-sm text-zinc-400">{clubName}</p>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        Общий рейтинг — по системе billiard.guru, пересчитывается автоматически после
        матчей. Рейтинг в клубе задаётся вами для турниров и форы именно в этом клубе.
      </p>
    </div>
  ) : (
    <div>
      <h1 className="text-2xl font-bold">Игроки</h1>
      <p className="mt-1 text-sm text-zinc-400">{clubName}</p>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        Общий рейтинг пересчитывается после матчей. Рейтинг в клубе задаётся вами для
        турниров и форы в этом клубе.
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        {header}
        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="h-6 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-[1fr_140px_auto]">
            <div className="h-10 animate-pulse rounded-lg bg-zinc-800" />
            <div className="h-10 animate-pulse rounded-lg bg-zinc-800" />
            <div className="h-10 animate-pulse rounded-lg bg-zinc-800" />
          </div>
        </section>
        <section className="overflow-hidden rounded-xl border border-zinc-800">
          <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-3">
            <div className="h-9 max-w-xs animate-pulse rounded-lg bg-zinc-800" />
          </div>
          <div className="space-y-0 divide-y divide-zinc-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-4">
                <div className="h-5 w-36 animate-pulse rounded bg-zinc-800" />
                <div className="h-5 w-20 animate-pulse rounded bg-zinc-800" />
                <div className="h-5 w-12 animate-pulse rounded bg-zinc-800" />
                <div className="h-5 w-16 animate-pulse rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-4 font-semibold">Добавить игрока</h2>
        <div className="grid max-w-2xl gap-3 sm:grid-cols-[1fr_140px_auto]">
          <SearchableSelect
            options={playerOptions}
            value={addPlayerId}
            onChange={setAddPlayerId}
            placeholder="Выберите игрока"
            searchPlaceholder="Поиск игрока…"
          />
          <input
            type="number"
            step="0.5"
            min="0"
            value={addRating}
            onChange={(e) => setAddRating(e.target.value)}
            placeholder="Рейтинг в клубе"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={addSaving || !addPlayerId}
            onClick={addPlayer}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {addSaving ? "…" : "Добавить"}
          </button>
        </div>
        {addError && <p className="mt-2 text-sm text-red-400">{addError}</p>}
      </section>

      <section>
        <AdminTableToolbar count={{ shown: filteredRows.length, total: rows.length }}>
          <AdminTableSearchField
            value={search}
            onChange={setSearch}
            placeholder="ФИО, город…"
          />
        </AdminTableToolbar>

        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <AdminSortHeader
                  label="Игрок"
                  sortKey="name"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <th className="px-4 py-3 font-medium">Город</th>
                <AdminSortHeader
                  label="Общий рейтинг"
                  sortKey="systemRating"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <AdminSortHeader
                  label="Рейтинг в клубе"
                  sortKey="clubRating"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <ClubRatingRow
                  key={row.id}
                  row={row}
                  onSave={(rating) => saveClubRating(row.player.id, rating)}
                  onRemove={() =>
                    removePlayer(
                      row.player.id,
                      `${row.player.lastName} ${row.player.firstName}`,
                    )
                  }
                />
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                    {rows.length === 0
                      ? "Добавьте игроков в рейтинг клуба"
                      : "Ничего не найдено"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ClubRatingRow({
  row,
  onSave,
  onRemove,
}: {
  row: ClubPlayerRatingRow;
  onSave: (rating: number) => void;
  onRemove: () => void;
}) {
  const [editRating, setEditRating] = useState(String(row.rating));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditRating(String(row.rating));
  }, [row.rating]);

  async function save() {
    const value = Number(editRating);
    if (Number.isNaN(value) || value < 0 || value % 0.5 !== 0) {
      alert("Рейтинг — число от 0 с шагом 0,5");
      return;
    }
    setSaving(true);
    await onSave(value);
    setSaving(false);
  }

  return (
    <tr className="border-t border-zinc-800">
      <td className="px-4 py-3 font-medium">
        {row.player.lastName} {row.player.firstName}
      </td>
      <td className="px-4 py-3 text-zinc-400">{row.player.city.nameRu}</td>
      <td className="px-4 py-3 font-mono text-zinc-400">
        {formatRating(row.player.rating)}
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          step="0.5"
          min="0"
          value={editRating}
          onChange={(e) => setEditRating(e.target.value)}
          className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 font-mono text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {saving ? "…" : "Сохранить"}
          </button>
          <AsyncTextButton variant="red" loadingLabel="…" onClick={onRemove}>
            Убрать
          </AsyncTextButton>
        </div>
      </td>
    </tr>
  );
}
