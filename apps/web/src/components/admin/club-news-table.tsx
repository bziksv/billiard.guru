"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { AsyncTextButton } from "@/components/ui/async-text-button";
import { clubNewsCityBroadcastAdminShort } from "@/lib/club-news-display";
import { CLUB_NEWS_STATUS_LABELS } from "@/lib/validators";

interface ClubNewsRow {
  id: string;
  title: string;
  body: string;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  publishedAt: string | null;
  cityBroadcastRequested: boolean;
  club: {
    id: string;
    name: string;
    city: { nameRu: string };
  };
  author: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

type SortKey = "createdAt" | "status" | "title" | "club";
type StatusFilter = "all" | "PENDING" | "APPROVED" | "REJECTED" | "UNPUBLISHED";

export function ClubNewsAdminTable() {
  const [rows, setRows] = useState<ClubNewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/club-news");
    if (!res.ok) {
      setLoading(false);
      return;
    }
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
      return [
        row.title,
        row.body,
        row.club.name,
        row.club.city.nameRu,
        row.author?.lastName,
        row.author?.firstName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const mul = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "status":
          return mul * a.status.localeCompare(b.status, "ru");
        case "club":
          return mul * a.club.name.localeCompare(b.club.name, "ru");
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
      setSortDir(key === "title" || key === "club" ? "asc" : "desc");
    }
  }

  async function moderate(
    id: string,
    action: "approve" | "reject" | "unpublish",
    reason?: string,
  ) {
    if (action === "unpublish" && !confirm("Снять новость с публикации на сайте?")) {
      return;
    }
    setActingId(id);
    const res = await fetch(`/api/admin/club-news/${id}`, {
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
    return <p className="admin-muted text-sm">Загрузка…</p>;
  }

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400/90">
          На модерации: {pendingCount}. Новые новости также приходят в Telegram с кнопками
          «Одобрить» / «Отклонить».
        </p>
      )}

      <AdminTableToolbar count={{ shown: filtered.length, total: rows.length }}>
        <AdminTableSearchField
          value={search}
          onChange={setSearch}
          placeholder="Заголовок, клуб, текст…"
        />
        <AdminFilterSelect
          label="Статус"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          options={[
            { value: "all", label: "Все статусы" },
            { value: "PENDING", label: "На модерации" },
            { value: "APPROVED", label: "Опубликованы" },
            { value: "REJECTED", label: "Отклонены" },
            { value: "UNPUBLISHED", label: "Сняты с публикации" },
          ]}
        />
      </AdminTableToolbar>

      <div className="admin-table-wrap admin-table-wrap--scroll">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="admin-thead">
            <tr>
              <AdminSortHeader
                label="Новость"
                sortKey="title"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <AdminSortHeader
                label="Клуб"
                sortKey="club"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <th className="px-4 py-3 font-medium">Автор</th>
              <th className="px-4 py-3 font-medium">Рассылка</th>
              <AdminSortHeader
                label="Статус"
                sortKey="status"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <AdminSortHeader
                label="Отправлена"
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
              <tr key={row.id} className="admin-table-row align-top">
                <td className="max-w-sm px-4 py-3">
                  <p className="font-medium">{row.title}</p>
                  <p className="mt-1 line-clamp-4 text-xs admin-muted">{row.body}</p>
                  {row.rejectReason && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400/90">
                      {row.rejectReason}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/clubs/${row.club.id}`}
                    className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {row.club.name}
                  </Link>
                  <p className="text-xs admin-muted">{row.club.city.nameRu}</p>
                </td>
                <td className="px-4 py-3 admin-muted">
                  {row.author
                    ? `${row.author.lastName} ${row.author.firstName}`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {row.cityBroadcastRequested ? (
                    <span className="inline-flex rounded bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-300">
                      {clubNewsCityBroadcastAdminShort(true)}
                    </span>
                  ) : (
                    <span className="admin-muted text-xs">
                      {clubNewsCityBroadcastAdminShort(false)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={row.status}
                    label={CLUB_NEWS_STATUS_LABELS[row.status] ?? row.status}
                  />
                </td>
                <td className="px-4 py-3 admin-muted">{formatAdminDate(row.createdAt)}</td>
                <td className="px-4 py-3">
                  {row.status === "PENDING" && (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <AsyncTextButton
                          variant="emerald"
                          loadingLabel="…"
                          disabled={actingId !== null && actingId !== row.id}
                          onClick={() => moderate(row.id, "approve")}
                        >
                          Одобрить
                        </AsyncTextButton>
                        <AsyncTextButton
                          variant="red"
                          loadingLabel="…"
                          disabled={actingId !== null && actingId !== row.id}
                          onClick={() => setRejectId(row.id)}
                        >
                          Отклонить
                        </AsyncTextButton>
                      </div>
                      {rejectId === row.id && (
                        <div className="w-52 space-y-2">
                          <input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Причина (необяз.)"
                            className="admin-input w-full text-xs"
                          />
                          <AsyncTextButton
                            variant="red"
                            loadingLabel="…"
                            onClick={() => moderate(row.id, "reject", rejectReason)}
                          >
                            Подтвердить отклонение
                          </AsyncTextButton>
                        </div>
                      )}
                    </div>
                  )}
                  {row.status === "APPROVED" && (
                    <div className="flex justify-end">
                      <AsyncTextButton
                        variant="red"
                        loadingLabel="…"
                        disabled={actingId !== null && actingId !== row.id}
                        onClick={() => moderate(row.id, "unpublish")}
                      >
                        Снять с публикации
                      </AsyncTextButton>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center admin-muted">
                  Новостей нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
