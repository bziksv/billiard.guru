"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { SectionLogsButton } from "@/components/audit/section-logs-button";
import { IDEA_STATUS_LABELS } from "@/lib/validators";

interface IdeaView {
  id: string;
  title: string;
  body: string;
  status: string;
  clubId: string | null;
  rejectReason: string | null;
  createdAt: string;
}

export function ClubOwnerIdeasPage({ clubId }: { clubId: string }) {
  const [ideas, setIdeas] = useState<IdeaView[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch("/api/ideas");
    const data = await res.json();
    const mine: IdeaView[] = Array.isArray(data.mine) ? data.mine : [];
    setIdeas(mine.filter((i) => i.clubId === clubId));
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const sortedIdeas = useMemo(
    () => [...ideas].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [ideas],
  );

  async function submitIdea(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, clubId }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Ошибка отправки");
      return;
    }
    setTitle("");
    setBody("");
    setMessage("Идея отправлена на модерацию.");
    await reload();
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Загрузка…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Идеи для клуба</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        Предложения по улучшению сервиса для вашего клуба. После модерации идеи могут быть
            опубликованы на сайте.
          </p>
        </div>
        <SectionLogsButton section="ideas" clubId={clubId} />
      </div>

      <section className="max-w-2xl space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="font-semibold">Новая идея</h2>
        <form onSubmit={submitIdea} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок"
            className="site-input w-full"
            required
            minLength={3}
            maxLength={120}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Опишите идею"
            rows={5}
            className="site-input w-full"
            required
            minLength={10}
            maxLength={2000}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? "Отправка…" : "Отправить"}
          </button>
        </form>
      </section>

      <section className="max-w-2xl space-y-3">
        <h2 className="font-semibold">Мои идеи</h2>
        {sortedIdeas.length === 0 ? (
          <p className="text-sm text-zinc-500">Пока нет идей для этого клуба.</p>
        ) : (
          <ul className="space-y-3">
            {sortedIdeas.map((idea) => (
              <li key={idea.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{idea.title}</p>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                    {IDEA_STATUS_LABELS[idea.status] ?? idea.status}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{idea.body}</p>
                {idea.status === "REJECTED" && idea.rejectReason && (
                  <p className="mt-2 text-sm text-red-400">Причина: {idea.rejectReason}</p>
                )}
                <p className="mt-2 text-xs text-zinc-500">
                  {new Date(idea.createdAt).toLocaleString("ru-RU")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
