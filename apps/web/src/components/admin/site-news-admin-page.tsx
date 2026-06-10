"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminTableToolbar } from "@/components/admin/admin-table-toolbar";
import { StatusBadge } from "@/components/admin/status-badge";
import { AsyncTextButton } from "@/components/ui/async-text-button";
import { formatAdminDate } from "@/components/admin/admin-sort-header";
import { APP_NAME } from "@/lib/brand";
import { CLUB_NEWS_STATUS_LABELS } from "@/lib/validators";

interface SiteNewsRow {
  id: string;
  title: string;
  body: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string } | null;
}

export function SiteNewsAdminPage() {
  const [rows, setRows] = useState<SiteNewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/site-news");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function publish(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/site-news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось опубликовать");
      return;
    }
    setRows((prev) => [data, ...prev]);
    setTitle("");
    setBody("");
    setMessage("Опубликовано на главной и на странице новости");
  }

  async function patchRow(id: string, action: "unpublish" | "republish") {
    if (action === "unpublish" && !confirm("Снять новость с сайта?")) return;
    setActingId(id);
    const res = await fetch(`/api/admin/site-news/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setActingId(null);
    if (!res.ok) {
      alert(data.error ?? "Ошибка");
      return;
    }
    await reload();
  }

  async function removeRow(id: string) {
    if (!confirm("Удалить новость безвозвратно?")) return;
    setActingId(id);
    const res = await fetch(`/api/admin/site-news/${id}`, { method: "DELETE" });
    const data = await res.json();
    setActingId(null);
    if (!res.ok) {
      alert(data.error ?? "Ошибка");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) {
    return <p className="admin-muted text-sm">Загрузка…</p>;
  }

  return (
    <div className="space-y-6">
      <section className="admin-card space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Новая новость сервиса</h2>
          <p className="admin-muted mt-1 text-sm">
            Публикация от имени {APP_NAME} — сразу на главной, без модерации и без привязки к
            клубу.
          </p>
        </div>
        <form onSubmit={publish} className="space-y-3">
          <label className="block text-sm">
            <span className="admin-label-xs mb-1 block">Заголовок</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="admin-input w-full"
              required
              maxLength={200}
            />
          </label>
          <label className="block text-sm">
            <span className="admin-label-xs mb-1 block">Текст</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="admin-input w-full"
              required
              maxLength={10000}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
          <button type="submit" disabled={saving} className="admin-btn admin-btn--primary">
            {saving ? "Публикация…" : "Опубликовать"}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <AdminTableToolbar count={{ shown: rows.length, total: rows.length }}>
          <span className="admin-muted text-sm">Все новости сервиса</span>
        </AdminTableToolbar>
        <div className="admin-table-wrap overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="admin-thead">
              <tr>
                <th className="px-4 py-3 font-medium">Новость</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Опубликована</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="admin-table-row align-top">
                  <td className="max-w-md px-4 py-3">
                    <p className="font-medium">{row.title}</p>
                    <p className="mt-1 line-clamp-3 text-xs admin-muted">{row.body}</p>
                    <Link href={`/news/${row.id}`} className="admin-link mt-2 inline-block text-xs">
                      На сайте →
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={row.status}
                      label={CLUB_NEWS_STATUS_LABELS[row.status] ?? row.status}
                    />
                  </td>
                  <td className="px-4 py-3 admin-muted">
                    {formatAdminDate(row.publishedAt ?? row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-end gap-2">
                      {row.status === "APPROVED" ? (
                        <AsyncTextButton
                          variant="red"
                          loadingLabel="…"
                          disabled={actingId !== null && actingId !== row.id}
                          onClick={() => patchRow(row.id, "unpublish")}
                        >
                          Снять с публикации
                        </AsyncTextButton>
                      ) : (
                        <AsyncTextButton
                          variant="emerald"
                          loadingLabel="…"
                          disabled={actingId !== null && actingId !== row.id}
                          onClick={() => patchRow(row.id, "republish")}
                        >
                          Опубликовать снова
                        </AsyncTextButton>
                      )}
                      <AsyncTextButton
                        variant="red"
                        loadingLabel="…"
                        disabled={actingId !== null && actingId !== row.id}
                        onClick={() => removeRow(row.id)}
                      >
                        Удалить
                      </AsyncTextButton>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center admin-muted">
                    Новостей сервиса пока нет
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
