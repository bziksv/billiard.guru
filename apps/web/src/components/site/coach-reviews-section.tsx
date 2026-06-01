"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CoachReviewStarInput, CoachReviewStars } from "@/components/site/coach-review-stars";
import { SiteCard } from "@/components/site/site-card";
import { coachReviewLabel, formatCoachReviewAvg } from "@/lib/coach-review-display";
import { cn } from "@/lib/cn";

type ReviewRow = {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  rater: { id: string; name: string };
};

type ReviewsPayload = {
  summary: { avg: number | null; count: number };
  myReview: { score: number; comment: string | null } | null;
  reviews: ReviewRow[];
};

export function CoachReviewsSection({
  coachId,
  loggedIn,
  isSelf,
}: {
  coachId: string;
  loggedIn: boolean;
  isSelf: boolean;
}) {
  const [data, setData] = useState<ReviewsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/coaches/${coachId}/reviews`);
      if (!res.ok) throw new Error("load");
      const json = (await res.json()) as ReviewsPayload;
      setData(json);
      if (json.myReview) {
        setScore(json.myReview.score);
        setComment(json.myReview.comment ?? "");
      }
    } catch {
      setError("Не удалось загрузить оценки");
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (score < 1) {
      setError("Выберите оценку от 1 до 5 звёзд");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/coaches/${coachId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment: comment.trim() || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Не удалось сохранить");
        return;
      }
      setSaved(true);
      await load();
    } catch {
      setError("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  const summary = data?.summary ?? { avg: null, count: 0 };

  return (
    <section>
      <h2 className="site-section-title mb-1">Оценки как тренер</h2>
      <p className="home-card-muted mb-4 text-sm">
        Игроки, которые занимались с тренером, могут поставить оценку от 1 до 5. Это не турнирный
        рейтинг.
      </p>

      <SiteCard className="space-y-6">
        {loading ? (
          <div className="site-skeleton h-16" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {summary.count > 0 && summary.avg != null ? (
                <>
                  <CoachReviewStars score={summary.avg} />
                  <span className="font-mono text-2xl font-semibold text-emerald-500">
                    {formatCoachReviewAvg(summary.avg, summary.count)}
                  </span>
                  <span className="text-sm text-zinc-500">{coachReviewLabel(summary.count)}</span>
                </>
              ) : (
                <p className="text-sm text-zinc-500">Пока никто не оценил этого тренера.</p>
              )}
            </div>

            {loggedIn && !isSelf && (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)]/40 p-4">
                <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">
                  {data?.myReview ? "Ваша оценка" : "Оценить тренера"}
                </p>
                <CoachReviewStarInput value={score} onChange={setScore} disabled={saving} />
                <label className="mt-4 block">
                  <span className="mb-1 block text-xs text-zinc-500">Комментарий (необязательно)</span>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={saving}
                    rows={3}
                    maxLength={2000}
                    className="site-input w-full resize-y text-sm"
                    placeholder="Чем помог тренер, что понравилось…"
                  />
                </label>
                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                {saved && <p className="mt-2 text-sm text-emerald-600">Спасибо, оценка сохранена.</p>}
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving || score < 1}
                  className={cn("site-btn-primary mt-4 text-sm", saving && "opacity-60")}
                >
                  {saving ? "Сохранение…" : data?.myReview ? "Обновить оценку" : "Отправить оценку"}
                </button>
              </div>
            )}

            {isSelf && (
              <p className="text-sm text-zinc-500">Свою страницу как тренер оценить нельзя.</p>
            )}

            {!loggedIn && (
              <p className="text-sm text-zinc-500">
                <Link href="/login" className="text-emerald-600 underline-offset-2 hover:underline">
                  Войдите
                </Link>
                , чтобы оставить оценку.
              </p>
            )}

            {data && data.reviews.length > 0 && (
              <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] pt-2">
                {data.reviews.map((r) => (
                  <li key={r.id} className="py-4 first:pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <CoachReviewStars score={r.score} size="sm" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">{r.rater.name}</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(r.updatedAt ?? r.createdAt).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                    {r.comment?.trim() && (
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {r.comment.trim()}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </SiteCard>
    </section>
  );
}
