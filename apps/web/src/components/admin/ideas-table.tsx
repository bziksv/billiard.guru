"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminFilterSelect,
  AdminTableSearchField,
  AdminTableToolbar,
} from "@/components/admin/admin-table-toolbar";
import {
  AdminSortHeader,
  formatAdminDate,
  type SortDir,
} from "@/components/admin/admin-sort-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { IDEA_STATUS_LABELS } from "@/lib/validators";

interface IdeaRow {
  id: string;
  title: string;
  body: string;
  status: string;
  likesCount: number;
  dislikesCount: number;
  rejectReason: string | null;
  createdAt: string;
  moderatedAt: string | null;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    city: { nameRu: string };
  };
}

type SortKey = "createdAt" | "status" | "likes" | "title";
type StatusFilter = "all" | "PENDING" | "APPROVED" | "REJECTED";

export function IdeasAdminTable() {
  const [rows, setRows] = useState<IdeaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/ideas");
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      return [row.title, row.body, row.author.lastName, row.author.firstName]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const mul = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "status":
          return mul * a.status.localeCompare(b.status, "ru");
        case "likes":
          return mul * (a.likesCount - b.likesCount);
        case "title":
          return mul * a.title.localeCompare(b.title, "ru");
        case "createdAt":
        default:
          return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });
  }, [rows, search, statusFilter, sortKey, sortDir]);

  const pendingCount = rows.filter((r) => r.status === "PENDING").length;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "title" ? "asc" : "desc");
    }
  }

  async function moderate(id: string, action: "approve" | "reject", reason?: string) {
    setActingId(id);
    const res = await fetch(`/api/admin/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejectReason: reason }),
    });
    const data = await res.json();
    setActingId(null);
    setRejectId(null);
    setRejectReason("");
    if (!res.ok) {
      alert(data.error ?? "Ошибка модерации");
      return;
    }
    await reload();
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Загрузка…</p>;
  }

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <p className="text-sm text-amber-400/90">
          На модерации: {pendingCount}. Новые идеи также приходят в Telegram.
        </p>
      )}

      <AdminTableToolbar count={{ shown: filtered.length, total: rows.length }}>
        <AdminTableSearchField
          value={search}
          onChange={setSearch}
          placeholder="Заголовок, текст, автор…"
        />
        <AdminFilterSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          options={[
            { value: "all", label: "Все статусы" },
            { value: "PENDING", label: "На модерации" },
            { value: "APPROVED", label: "Опубликованы" },
            { value: "REJECTED", label: "Отклонены" },
          ]}
        />
      </AdminTableToolbar>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <AdminSortHeader
                label="Идея"
                sortKey="title"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <th className="px-4 py-3 font-medium">Автор</th>
              <AdminSortHeader
                label="Статус"
                sortKey="status"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <AdminSortHeader
                label="👍 / 👎"
                sortKey="likes"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <AdminSortHeader
                label="Дата"
                sortKey="createdAt"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-zinc-800 align-top">
                <td className="max-w-xs px-4 py-3">
                  <p className="font-medium">{row.title}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-zinc-500">{row.body}</p>
                  {row.rejectReason && (
                    <p className="mt-1 text-xs text-red-400/90">{row.rejectReason}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {row.author.lastName} {row.author.firstName}
                  <br />
                  <span className="text-xs">{row.author.city.nameRu}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={row.status}
                    label={IDEA_STATUS_LABELS[row.status] ?? row.status}
                  />
                </td>
                <td className="px-4 py-3 font-mono text-zinc-400">
                  {row.likesCount} / {row.dislikesCount}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {formatAdminDate(row.createdAt)}
                </td>
                <td className="px-4 py-3">
                  {row.status === "PENDING" && (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={actingId === row.id}
                          onClick={() => moderate(row.id, "approve")}
                          className="text-xs text-emerald-400 hover:underline disabled:opacity-50"
                        >
                          Одобрить
                        </button>
                        <button
                          type="button"
                          disabled={actingId === row.id}
                          onClick={() => setRejectId(row.id)}
                          className="text-xs text-red-400 hover:underline disabled:opacity-50"
                        >
                          Отклонить
                        </button>
                      </div>
                      {rejectId === row.id && (
                        <div className="w-48 space-y-2">
                          <input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Причина (необяз.)"
                            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => moderate(row.id, "reject", rejectReason)}
                            className="text-xs text-red-400 hover:underline"
                          >
                            Подтвердить отклонение
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  Идей нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
