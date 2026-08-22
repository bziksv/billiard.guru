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
import { AsyncTextButton } from "@/components/ui/async-text-button";
import { IDEA_STATUS_LABELS } from "@/lib/validators";

interface IdeaRow {
  id: string;
  title: string;
  body: string;
  status: string;
  likesCount: number;
  dislikesCount: number;
  rejectReason: string | null;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  moderatedAt: string | null;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    isVerified: boolean;
    telegramUsername: string | null;
    hasTelegram: boolean;
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
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
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

  async function sendReply(id: string) {
    const text = replyText.trim();
    if (!text) return;
    setActingId(id);
    const res = await fetch(`/api/admin/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reply", adminReply: text }),
    });
    const data = await res.json();
    setActingId(null);
    if (!res.ok) {
      alert(data.error ?? "Не удалось отправить ответ");
      return;
    }
    setReplyId(null);
    setReplyText("");
    if (data.message) alert(data.message);
    await reload();
  }

  function openReply(row: IdeaRow) {
    setReplyId(row.id);
    setReplyText(row.adminReply ?? "");
  }

  if (loading) {
    return <p className="admin-muted text-sm">Загрузка…</p>;
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
          label="Статус"
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

      <div className="admin-table-wrap admin-table-wrap--scroll">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="admin-thead">
            <tr>
              <AdminSortHeader
                label="Идея"
                sortKey="title"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
              />
              <th className="px-4 py-3 font-medium">Автор</th>
              <th className="px-4 py-3 font-medium">Telegram</th>
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
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="admin-table-row align-top">
                <td className="max-w-xs px-4 py-3">
                  <p className="font-medium">{row.title}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-zinc-500">{row.body}</p>
                  {row.rejectReason && (
                    <p className="mt-1 text-xs text-red-400/90">
                      Отклонение: {row.rejectReason}
                    </p>
                  )}
                  {row.adminReply && (
                    <p className="mt-1 text-xs text-emerald-400/90">
                      Ответ: {row.adminReply}
                      {row.repliedAt && (
                        <span className="text-zinc-500">
                          {" "}
                          · {formatAdminDate(row.repliedAt)}
                        </span>
                      )}
                    </p>
                  )}
                  <div className="mt-3 space-y-2 border-t border-zinc-800/80 pt-3">
                    {row.status === "PENDING" && (
                      <div className="flex flex-wrap gap-2">
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
                    )}
                    {rejectId === row.id && (
                      <div className="space-y-2">
                        <input
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Причина (необяз.)"
                          className="admin-input w-full px-2 py-1 text-xs"
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
                    {replyId === row.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Ответ автору…"
                          rows={3}
                          className="admin-input w-full resize-y px-2 py-1 text-xs"
                        />
                        <div className="flex flex-wrap gap-2">
                          <AsyncTextButton
                            variant="emerald"
                            loadingLabel="…"
                            disabled={!replyText.trim() || actingId === row.id}
                            onClick={() => sendReply(row.id)}
                          >
                            Отправить ответ
                          </AsyncTextButton>
                          <button
                            type="button"
                            className="text-xs text-zinc-500 hover:text-zinc-300"
                            onClick={() => {
                              setReplyId(null);
                              setReplyText("");
                            }}
                          >
                            Отмена
                          </button>
                        </div>
                        {!row.author.isVerified && (
                          <p className="text-xs text-amber-400/90">
                            Telegram не подтверждён — ответ только на сайте.
                          </p>
                        )}
                      </div>
                    ) : (
                      <AsyncTextButton
                        variant="emerald"
                        loadingLabel="…"
                        disabled={actingId !== null && actingId !== row.id}
                        onClick={() => openReply(row)}
                      >
                        {row.adminReply ? "Изменить ответ" : "Ответить"}
                      </AsyncTextButton>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {row.author.lastName} {row.author.firstName}
                  <br />
                  <span className="text-xs">{row.author.city.nameRu}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={row.author.isVerified ? "CONFIRMED" : "PENDING"}
                    label={row.author.isVerified ? "Подтверждён" : "Не подтверждён"}
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    {row.author.telegramUsername
                      ? `@${row.author.telegramUsername}`
                      : row.author.hasTelegram
                        ? "TG без username"
                        : "нет Telegram"}
                  </p>
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
