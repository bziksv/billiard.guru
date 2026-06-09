"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { SectionLogsButton } from "@/components/audit/section-logs-button";
import { AsyncTextButton } from "@/components/ui/async-text-button";
import {
  CLUB_NEWS_CITY_BROADCAST_LABEL,
  CLUB_NEWS_CITY_BROADCAST_PAID_HINT,
} from "@/lib/club-news-display";
import { CLUB_NEWS_STATUS_LABELS } from "@/lib/validators";

interface ClubNewsItem {
  id: string;
  title: string;
  body: string;
  status: string;
  rejectReason: string | null;
  publishedAt: string | null;
  createdAt: string;
  cityBroadcastRequested: boolean;
}

function formatNewsDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusBadgeClass(status: string) {
  if (status === "APPROVED") return "bg-emerald-500/15 text-emerald-400";
  if (status === "UNPUBLISHED") return "bg-zinc-500/15 text-zinc-400";
  if (status === "REJECTED") return "bg-red-500/15 text-red-400";
  return "bg-amber-500/15 text-amber-400";
}

export function ClubNewsPanel({
  clubId,
  clubName,
  siteHref,
}: {
  clubId: string;
  clubName?: string;
  siteHref?: string;
}) {
  const [news, setNews] = useState<ClubNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clubs/${clubId}/news`);
    const data = await res.json();
    setNews(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addNews(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/clubs/${clubId}/news`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось отправить");
      return;
    }
    setNews((prev) => [data, ...prev]);
    setTitle("");
    setBody("");
    setMessage("Отправлено на модерацию — появится на сайте после одобления администратором");
  }

  async function deleteNews(newsId: string) {
    if (!confirm("Удалить новость?")) return;
    const res = await fetch(`/api/clubs/${clubId}/news/${newsId}`, { method: "DELETE" });
    if (!res.ok) return;
    setNews((prev) => prev.filter((n) => n.id !== newsId));
  }

  if (loading) return <p className="text-sm text-zinc-500">Загрузка…</p>;

  const pendingCount = news.filter((n) => n.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Новости клуба</h1>
          {clubName && <p className="mt-1 text-sm text-zinc-500">{clubName}</p>}
          {siteHref && (
            <a href={siteHref} className="mt-2 inline-block text-sm text-emerald-400 hover:underline">
              Как видят на сайте →
            </a>
          )}
        </div>
        <SectionLogsButton section="news" clubId={clubId} />
      </div>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div>
          <h2 className="font-semibold">Новая публикация</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Новости проходят модерацию перед публикацией на сайте. Обычно это занимает немного
            времени.
          </p>
        </div>
        <form onSubmit={addNews} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок"
            className="site-input w-full"
            required
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Текст новости"
            rows={6}
            className="site-input w-full"
            required
          />
          <label className="flex cursor-not-allowed items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3 opacity-60">
            <input
              type="checkbox"
              checked={false}
              disabled
              readOnly
              tabIndex={-1}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-not-allowed accent-emerald-600"
              aria-disabled="true"
            />
            <span className="text-sm leading-snug text-zinc-400">
              <span className="font-medium text-zinc-300">{CLUB_NEWS_CITY_BROADCAST_LABEL}</span>
              <span className="mt-1 block text-xs text-zinc-500">
                {CLUB_NEWS_CITY_BROADCAST_PAID_HINT}
              </span>
            </span>
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Отправка…" : "Отправить на модерацию"}
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Все публикации ({news.length})</h2>
          {pendingCount > 0 && (
            <span className="text-sm text-amber-400">На модерации: {pendingCount}</span>
          )}
        </div>
        {news.length === 0 ? (
          <p className="text-sm text-zinc-500">Новостей пока нет.</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {news.map((item) => (
              <li key={item.id} className="rounded-lg border border-zinc-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusBadgeClass(item.status)}`}
                      >
                        {CLUB_NEWS_STATUS_LABELS[item.status] ?? item.status}
                      </span>
                      <time className="text-xs text-zinc-500">
                        {formatNewsDate(item.publishedAt ?? item.createdAt)}
                      </time>
                    </div>
                    <p className="mt-2 font-medium">{item.title}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{item.body}</p>
                    {item.rejectReason && (
                      <p className="mt-2 text-sm text-red-400/90">
                        Причина отклонения: {item.rejectReason}
                      </p>
                    )}
                  </div>
                  <AsyncTextButton
                    variant="red"
                    loadingLabel="…"
                    onClick={() => deleteNews(item.id)}
                  >
                    Удалить
                  </AsyncTextButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
