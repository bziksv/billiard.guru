"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { SectionLogsButton } from "@/components/audit/section-logs-button";
import { AsyncTextButton } from "@/components/ui/async-text-button";

interface ClubNewsItem {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}

function formatNewsDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
      setError(data.error ?? "Не удалось опубликовать");
      return;
    }
    setNews((prev) => [data, ...prev]);
    setTitle("");
    setBody("");
    setMessage("Новость опубликована");
  }

  async function deleteNews(newsId: string) {
    if (!confirm("Удалить новость?")) return;
    const res = await fetch(`/api/clubs/${clubId}/news/${newsId}`, { method: "DELETE" });
    if (!res.ok) return;
    setNews((prev) => prev.filter((n) => n.id !== newsId));
  }

  if (loading) return <p className="text-sm text-zinc-500">Загрузка…</p>;

  return (
    <div className="max-w-2xl space-y-6">
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
        <h2 className="font-semibold">Новая публикация</h2>
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
            rows={5}
            className="site-input w-full"
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Публикация…" : "Опубликовать"}
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="font-semibold">Опубликованные ({news.length})</h2>
        {news.length === 0 ? (
          <p className="text-sm text-zinc-500">Новостей пока нет.</p>
        ) : (
          <ul className="space-y-3">
            {news.map((item) => (
              <li key={item.id} className="rounded-lg border border-zinc-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <time className="text-xs text-zinc-500">{formatNewsDate(item.publishedAt)}</time>
                    <p className="mt-1 font-medium">{item.title}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{item.body}</p>
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
